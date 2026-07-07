/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EducationPlan, EducationDraft } from './types';
import { computeMetrics } from './utils';
import {
  getSpreadsheetConfig,
  findOrCreateSpreadsheet,
  fetchPlans,
  addPlan,
  updatePlan,
  deletePlan,
  fetchDrafts,
  addDraft,
  updateDraft,
  deleteDraft,
} from './sheetsService';
import Dashboard from './components/Dashboard';
import PlanTable from './components/PlanTable';
import PlanFormModal from './components/PlanFormModal';
import DraftManager from './components/DraftManager';
import {
  CalendarRange,
  Plus,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  FileText,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Sheets DB state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [plans, setPlans] = useState<EducationPlan[]>([]);
  const [drafts, setDrafts] = useState<EducationDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSpreadsheetId, setSettingsSpreadsheetId] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');

  // Active Screen Tab state
  const [activeTab, setActiveTab] = useState<'plans' | 'drafts'>('plans');
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(null);

  const handleStartDraft = (plan: EducationPlan) => {
    setPreselectedPlanId(plan.id);
    setActiveTab('drafts');
  };

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<EducationPlan | null>(null);

  // Calculate metrics
  const metrics = computeMetrics(plans);

  // Set transient notification helper
  const triggerNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load configuration and data on mount
  useEffect(() => {
    const config = getSpreadsheetConfig();
    setSpreadsheetId(config.spreadsheetId);
    setSettingsSpreadsheetId(config.spreadsheetId);
    setSettingsApiKey(config.apiKey);
    
    initializeSheetsDB(null);
  }, []);

  // Sync settings inputs when settings open
  useEffect(() => {
    if (isSettingsOpen) {
      const config = getSpreadsheetConfig();
      setSettingsSpreadsheetId(config.spreadsheetId);
      setSettingsApiKey(config.apiKey);
    }
  }, [isSettingsOpen]);

  // Sheets DB Setup Flow using public/cached access
  const initializeSheetsDB = async (accessToken: string | null = null) => {
    setIsLoading(true);
    setLoadingStep('구글 스프레드시트 데이터를 불러오는 중입니다...');
    setErrorMsg(null);
    try {
      const config = getSpreadsheetConfig();
      const sheetId = config.spreadsheetId;
      setSpreadsheetId(sheetId);

      setLoadingStep('교육 계획 데이터를 불러오는 중입니다...');
      const fetched = await fetchPlans(sheetId, accessToken);
      setPlans(fetched);

      setLoadingStep('교육 기안서 데이터를 불러오는 중입니다...');
      const fetchedDrafts = await fetchDrafts(sheetId, accessToken);
      setDrafts(fetchedDrafts);

      triggerNotification('구글 스프레드시트 DB 연동 완료!', 'success');
    } catch (err: any) {
      console.error('DB 연동 에러:', err);
      // Fallback
      try {
        const cachedPlans = localStorage.getItem('ds_steel_plans_cache');
        const cachedDrafts = localStorage.getItem('ds_steel_drafts_cache');
        if (cachedPlans) setPlans(JSON.parse(cachedPlans));
        if (cachedDrafts) setDrafts(JSON.parse(cachedDrafts));
        triggerNotification('구글 시트 연동 실패로 로컬 저장소 데이터를 불러왔습니다.', 'info');
      } catch (localErr) {
        console.error('로컬 데이터 복구 실패:', localErr);
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Settings Save Handler
  const handleSaveSettings = () => {
    localStorage.setItem('ds_steel_spreadsheet_id', settingsSpreadsheetId);
    localStorage.setItem('ds_steel_google_api_key', settingsApiKey);
    setIsSettingsOpen(false);
    triggerNotification('설정이 저장되었습니다. 데이터를 다시 불러옵니다...', 'success');
    initializeSheetsDB(null);
  };

  // Manual Re-sync
  const handleResync = async () => {
    setIsLoading(true);
    setLoadingStep('데이터 동기화 중...');
    try {
      const config = getSpreadsheetConfig();
      const sheetId = spreadsheetId || config.spreadsheetId;
      setSpreadsheetId(sheetId);

      const fetched = await fetchPlans(sheetId, null);
      setPlans(fetched);

      const fetchedDrafts = await fetchDrafts(sheetId, null);
      setDrafts(fetchedDrafts);

      triggerNotification('성공적으로 동기화되었습니다.', 'success');
    } catch (err) {
      console.error('동기화 실패:', err);
      triggerNotification('동기화에 실패했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Add / Edit Plan Submit Handler with Optimistic Update
  const handleFormSubmit = async (formData: Omit<EducationPlan, 'id'> & { id?: string }) => {
    const config = getSpreadsheetConfig();
    const activeSheetId = spreadsheetId || config.spreadsheetId;

    const originalPlans = [...plans];

    if (formData.id) {
      // 1. UPDATE MODE (Optimistic Update)
      const index = plans.findIndex((p) => p.id === formData.id);
      if (index === -1) return;

      const updatedPlan: EducationPlan = {
        ...plans[index],
        ...formData,
      } as EducationPlan;

      // Optimistically update local array
      const updatedList = [...plans];
      updatedList[index] = updatedPlan;
      setPlans(updatedList);
      triggerNotification('교육 계획이 수정되었습니다. (스프레드시트 동기화 진행 중)', 'success');

      try {
        await updatePlan(activeSheetId, null, updatedPlan, index);
      } catch (err) {
        console.error('업데이트 동기화 실패:', err);
        setPlans(originalPlans); // Revert
        triggerNotification('구글 시트 동기화에 실패하여 변경 사항을 되돌렸습니다.', 'error');
      }
    } else {
      // 2. CREATE MODE (Optimistic Update)
      const newPlanId = `edu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newPlan: EducationPlan = {
        ...formData,
        id: newPlanId,
      };

      // Optimistically insert into local array
      setPlans((prev) => [...prev, newPlan]);
      triggerNotification('새 교육 계획이 등록되었습니다. (스프레드시트 동기화 진행 중)', 'success');

      try {
        await addPlan(activeSheetId, null, newPlan);
      } catch (err) {
        console.error('추가 동기화 실패:', err);
        setPlans(originalPlans); // Revert
        triggerNotification('구글 시트 동기화에 실패하여 추가를 취소했습니다.', 'error');
      }
    }
  };

  // Delete Plan with Optimistic Update
  const handleDeletePlan = async (index: number) => {
    const config = getSpreadsheetConfig();
    const activeSheetId = spreadsheetId || config.spreadsheetId;

    const originalPlans = [...plans];

    // Optimistically remove from local array
    const updatedList = plans.filter((_, i) => i !== index);
    setPlans(updatedList);
    triggerNotification('교육 계획이 삭제되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await deletePlan(activeSheetId, null, index);
    } catch (err) {
      console.error('삭제 동기화 실패:', err);
      setPlans(originalPlans); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 삭제를 복구했습니다.', 'error');
    }
  };

  // ---------------- DRAFT OPERATION HANDLERS ----------------

  const handleAddDraft = async (newDraft: EducationDraft) => {
    const config = getSpreadsheetConfig();
    const activeSheetId = spreadsheetId || config.spreadsheetId;

    const originalDrafts = [...drafts];
    setDrafts((prev) => [...prev, newDraft]);
    triggerNotification('기안서가 저장되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await addDraft(activeSheetId, null, newDraft);
    } catch (err) {
      console.error('기안서 추가 동기화 실패:', err);
      setDrafts(originalDrafts); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 기안서 저장을 취소했습니다.', 'error');
    }
  };

  const handleUpdateDraft = async (updatedDraft: EducationDraft, index: number) => {
    const config = getSpreadsheetConfig();
    const activeSheetId = spreadsheetId || config.spreadsheetId;

    const originalDrafts = [...drafts];
    const updatedList = [...drafts];
    updatedList[index] = updatedDraft;
    setDrafts(updatedList);
    triggerNotification('기안서가 수정되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await updateDraft(activeSheetId, null, updatedDraft, index);
    } catch (err) {
      console.error('기안서 수정 동기화 실패:', err);
      setDrafts(originalDrafts); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 변경 사항을 되돌렸습니다.', 'error');
    }
  };

  const handleDeleteDraft = async (index: number) => {
    const config = getSpreadsheetConfig();
    const activeSheetId = spreadsheetId || config.spreadsheetId;

    const originalDrafts = [...drafts];
    const updatedList = drafts.filter((_, i) => i !== index);
    setDrafts(updatedList);
    triggerNotification('기안서가 삭제되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await deleteDraft(activeSheetId, null, index);
    } catch (err) {
      console.error('기안서 삭제 동기화 실패:', err);
      setDrafts(originalDrafts); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 기안서 삭제를 복구했습니다.', 'error');
    }
  };

  const handleOpenAddModal = () => {
    setEditPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: EducationPlan) => {
    setEditPlan(plan);
    setIsModalOpen(true);
  };

  // ---------------- RENDERING THE MAIN APP INTERFACE ----------------
  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-800">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 no-print"
          >
            <div
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : notification.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-100'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-100'
              }`}
            >
              <span>{notification.text}</span>
              <button
                onClick={() => setNotification(null)}
                className="hover:opacity-80 font-bold ml-auto"
              >
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Container */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarRange className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800 tracking-tight">(주)대성스틸 연간교육계획</h1>
              <p className="text-xs text-gray-400 mt-0.5">Google Sheets Cloud Database Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 border border-emerald-100 bg-emerald-50/50 px-3 py-1.5 rounded-xl">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs font-bold text-emerald-800">공개 시트 모드 활성화됨</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResync}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                title="데이터 즉시 동기화"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Database className="w-4 h-4 text-indigo-500" />
                <span>시트 설정</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center py-16 space-y-4 no-print">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-gray-700">{loadingStep || '로딩 중...'}</p>
          </div>
        )}

        {/* Errors Alert banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-600 flex items-start gap-3 no-print">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">오류 발생</p>
              <p className="mt-1 leading-relaxed">{errorMsg}</p>
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() => initializeSheetsDB(null)}
                  className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>재시도하기</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>시트 설정 열기</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !errorMsg && (
          <>
            {/* View Switch Tab Selector */}
            <div className="flex border-b border-gray-200 no-print">
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'plans'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <CalendarRange className="w-4.5 h-4.5" />
                <span>연간 교육 계획 수립</span>
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'drafts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>교육 기안서 작성 및 인쇄</span>
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="mt-4">
              {activeTab === 'plans' ? (
                <div className="space-y-6 sm:space-y-8">
                  {/* Dashboard / Analytics Panel */}
                  <Dashboard metrics={metrics} />

                  {/* Plan List Panel */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-md font-bold text-gray-800">연간 교육 계획 목록</h2>
                        <p className="text-xs text-gray-400 mt-0.5">총 {plans.length}개의 수립된 교육 프로그램</p>
                      </div>

                      <button
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-4 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>신규 계획 추가</span>
                      </button>
                    </div>

                    {/* Data Table */}
                    <PlanTable
                      plans={plans}
                      drafts={drafts}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeletePlan}
                      onStartDraft={handleStartDraft}
                    />
                  </div>
                </div>
              ) : (
                <DraftManager
                  plans={plans}
                  drafts={drafts}
                  setDrafts={setDrafts}
                  onAddDraft={handleAddDraft}
                  onUpdateDraft={handleUpdateDraft}
                  onDeleteDraft={handleDeleteDraft}
                  isLoading={isLoading}
                  preselectedPlanId={preselectedPlanId}
                  onClearPreselectedPlan={() => setPreselectedPlanId(null)}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Plan modal */}
      <PlanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        editPlan={editPlan}
      />

      {/* Settings modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-800">구글 스프레드시트 연동 설정</h3>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    구글 스프레드시트 ID
                  </label>
                  <input
                    type="text"
                    value={settingsSpreadsheetId}
                    onChange={(e) => setSettingsSpreadsheetId(e.target.value)}
                    placeholder="예: 1v0E0Zz6-mO1TWhRz-H8bX9K4rVMyF4ZpXW0p_2gO0Hk"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition-all font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                    구글 스프레드시트의 URL 주소창에서 <span className="font-semibold text-gray-600">/d/와 /edit 사이의 값</span>을 복사해 넣어주세요.<br />
                    * 시트 공유 설정을 반드시 <span className="font-semibold text-emerald-600">"링크가 있는 모든 사용자에게 편집자(혹은 뷰어)"</span>로 변경해 주세요.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    구글 API Key (기본값 제공됨)
                  </label>
                  <input
                    type="text"
                    value={settingsApiKey}
                    onChange={(e) => setSettingsApiKey(e.target.value)}
                    placeholder="구글 클라우드 콘솔에서 발급한 API 키"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition-all font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 font-sans">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  설정 저장 및 새로고침
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
