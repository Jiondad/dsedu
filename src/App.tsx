/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './auth';
import { EducationPlan, EducationDraft } from './types';
import { computeMetrics } from './utils';
import {
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
  LogOut,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        initializeSheetsDB(accessToken);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sign-in handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        await initializeSheetsDB(result.accessToken);
      }
    } catch (err: any) {
      console.error('로그인 실패:', err);
      setErrorMsg('구글 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setPlans([]);
      setDrafts([]);
      setSpreadsheetId(null);
      triggerNotification('로그아웃 되었습니다.', 'info');
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  // Sheets DB Setup Flow
  const initializeSheetsDB = async (accessToken: string) => {
    setIsLoading(true);
    setLoadingStep('구글 드라이브에서 연간교육계획수립_DB를 찾는 중입니다...');
    setErrorMsg(null);
    try {
      const sheetId = await findOrCreateSpreadsheet(accessToken);
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
      setErrorMsg('구글 스프레드시트 데이터베이스를 불러오지 못했습니다. 권한 설정이나 네트워크 상태를 확인해주세요.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Manual Re-sync
  const handleResync = async () => {
    if (!token || !spreadsheetId) return;
    setIsLoading(true);
    setLoadingStep('데이터 동기화 중...');
    try {
      const fetched = await fetchPlans(spreadsheetId, token);
      setPlans(fetched);

      const fetchedDrafts = await fetchDrafts(spreadsheetId, token);
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
    if (!token || !spreadsheetId) {
      triggerNotification('인증 만료로 인해 교육 계획을 저장할 수 없습니다.', 'error');
      return;
    }

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
        await updatePlan(spreadsheetId, token, updatedPlan, index);
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
        await addPlan(spreadsheetId, token, newPlan);
      } catch (err) {
        console.error('추가 동기화 실패:', err);
        setPlans(originalPlans); // Revert
        triggerNotification('구글 시트 동기화에 실패하여 추가를 취소했습니다.', 'error');
      }
    }
  };

  // Delete Plan with Optimistic Update
  const handleDeletePlan = async (index: number) => {
    if (!token || !spreadsheetId) return;

    const originalPlans = [...plans];

    // Optimistically remove from local array
    const updatedList = plans.filter((_, i) => i !== index);
    setPlans(updatedList);
    triggerNotification('교육 계획이 삭제되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await deletePlan(spreadsheetId, token, index);
    } catch (err) {
      console.error('삭제 동기화 실패:', err);
      setPlans(originalPlans); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 삭제를 복구했습니다.', 'error');
    }
  };

  // ---------------- DRAFT OPERATION HANDLERS ----------------

  const handleAddDraft = async (newDraft: EducationDraft) => {
    if (!token || !spreadsheetId) {
      triggerNotification('인증 만료로 인해 기안서를 저장할 수 없습니다.', 'error');
      return;
    }

    const originalDrafts = [...drafts];
    setDrafts((prev) => [...prev, newDraft]);
    triggerNotification('기안서가 저장되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await addDraft(spreadsheetId, token, newDraft);
    } catch (err) {
      console.error('기안서 추가 동기화 실패:', err);
      setDrafts(originalDrafts); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 기안서 저장을 취소했습니다.', 'error');
    }
  };

  const handleUpdateDraft = async (updatedDraft: EducationDraft, index: number) => {
    if (!token || !spreadsheetId) {
      triggerNotification('인증 만료로 인해 기안서를 수정할 수 없습니다.', 'error');
      return;
    }

    const originalDrafts = [...drafts];
    const updatedList = [...drafts];
    updatedList[index] = updatedDraft;
    setDrafts(updatedList);
    triggerNotification('기안서가 수정되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await updateDraft(spreadsheetId, token, updatedDraft, index);
    } catch (err) {
      console.error('기안서 수정 동기화 실패:', err);
      setDrafts(originalDrafts); // Revert
      triggerNotification('구글 시트 동기화에 실패하여 변경 사항을 되돌렸습니다.', 'error');
    }
  };

  const handleDeleteDraft = async (index: number) => {
    if (!token || !spreadsheetId) return;

    const originalDrafts = [...drafts];
    const updatedList = drafts.filter((_, i) => i !== index);
    setDrafts(updatedList);
    triggerNotification('기안서가 삭제되었습니다. (스프레드시트 동기화 진행 중)', 'success');

    try {
      await deleteDraft(spreadsheetId, token, index);
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

  // ---------------- RENDERING SIGN IN SCREEN ----------------
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center"
        >
          {/* Visual branding */}
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <CalendarRange className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-gray-800 tracking-tight text-center">
            (주)대성스틸 연간교육계획
          </h2>
          <p className="text-sm text-gray-400 mt-2 text-center max-w-xs leading-relaxed">
            구글 스프레드시트를 클라우드 DB로 안전하게 활용하는 교육 수립 및 실시간 대시보드 솔루션입니다.
          </p>

          <div className="w-full h-px bg-gray-100 my-6" />

          {/* Value props */}
          <div className="space-y-3.5 w-full mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">안전한 데이터 보관</span>: 별도 서버 없이 사용자의 구글 드라이브 스프레드시트에 직접 기록됩니다.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">스마트 실시간 분석</span>: 등록한 연간계획을 토대로 사내/사외 비용 및 시간 가중치를 대시보드로 요약합니다.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">직관적이고 매끄러운 UX</span>: Optimistic Update 기반으로 저장 완료를 기다리지 않고 데이터가 실시간 추가됩니다.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 bg-rose-50 text-rose-600 border border-rose-100 text-xs px-3.5 py-2.5 rounded-xl w-full flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Authentic Google Sign-In button */}
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 rounded-xl shadow-xs hover:shadow-md text-gray-700 text-sm font-bold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>Google 계정으로 로그인</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 mt-6 text-center max-w-xs">
            로그인을 누르면 구글 드라이브 파일 생성 및 스프레드시트 데이터 조회를 위한 Google Workspace 동의 창이 팝업됩니다.
          </p>
        </motion.div>
      </div>
    );
  }

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
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs">
                    {user.displayName?.substring(0, 1) || 'U'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-gray-700">{user.displayName || '인증 사용자'}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{user.email}</p>
                </div>
              </div>
            )}

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
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-rose-100 hover:bg-rose-50/30 text-gray-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
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
                  onClick={() => initializeSheetsDB(token || '')}
                  className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>재시도하기</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>로그인 세션 초기화 (로그아웃)</span>
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
    </div>
  );
}
