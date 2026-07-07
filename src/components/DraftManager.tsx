/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EducationPlan, EducationDraft } from '../types';
import { formatCurrency } from '../utils';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  RefreshCw,
  FileCheck,
  AlertCircle,
  HelpCircle,
  User,
  Calendar,
  Layers,
  Clock,
  Briefcase,
  PenTool,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DraftManagerProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  onAddDraft: (draft: EducationDraft) => Promise<void>;
  onUpdateDraft: (draft: EducationDraft, index: number) => Promise<void>;
  onDeleteDraft: (index: number) => Promise<void>;
  isLoading: boolean;
}

export default function DraftManager({
  plans,
  drafts,
  onAddDraft,
  onUpdateDraft,
  onDeleteDraft,
  isLoading,
}: DraftManagerProps) {
  // Currently editing draft state (form)
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [drafter, setDrafter] = useState('');
  const [draftDate, setDraftDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [contentSummary, setContentSummary] = useState('');
  const [budgetBreakdown, setBudgetBreakdown] = useState('');

  // Selected draft from history for editing
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate sequential draft ID based on selected date and year-based sequence
  const generateDraftIdForDate = (date: string) => {
    if (!date) return '';
    const year = date.substring(0, 4); // YYYY
    const dateStr = date.replace(/-/g, ''); // YYYYMMDD

    // Filter existing drafts that belong to the same year
    const sameYearDrafts = drafts.filter((d) => {
      const dateMatch = d.draft_date && d.draft_date.substring(0, 4) === year;
      const idMatch = d.id && (d.id.startsWith(`DSEDU-${year}`) || d.id.startsWith(`DSED-${year}`));
      return dateMatch || idMatch;
    });

    let maxSerial = 0;
    sameYearDrafts.forEach((d) => {
      const parts = d.id.split('-');
      if (parts.length === 3) {
        const serialStr = parts[2];
        const serial = parseInt(serialStr, 10);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    });

    const nextSerial = maxSerial + 1;
    const paddedSerial = String(nextSerial).padStart(3, '0');
    return `DSEDU-${dateStr}-${paddedSerial}`;
  };

  // Auto-generate draft ID when selected date or drafts change (only in NEW mode)
  useEffect(() => {
    if (editingDraftIndex === null && draftDate) {
      const nextId = generateDraftIdForDate(draftDate);
      setDraftId(nextId);
      
      // Clear draft ID validation error if any
      if (errors.draftId) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.draftId;
          return copy;
        });
      }
    }
  }, [draftDate, drafts, editingDraftIndex]);

  // Find the currently selected plan details
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Auto-map selected plan data to details if desired
  useEffect(() => {
    if (selectedPlan && !editingDraftIndex) {
      // Provide smart default for content summary and budget breakdown if they are empty
      if (!contentSummary) {
        setContentSummary(
          `본 교육은 [${selectedPlan.agency}]에서 주관하는 [${selectedPlan.title}] 교육과정으로서, ` +
            `참여 대상인 [${selectedPlan.target_group}]의 실무 전문 역량 및 지식 수준을 함양하기 위한 목적으로 기획되었습니다.`
        );
      }
      if (!budgetBreakdown) {
        setBudgetBreakdown(
          `교육 수강료: ₩${formatCurrency(selectedPlan.estimated_cost)} (1인 기준)\n` +
            `교재 및 실습비 포함 여부: 포함\n` +
            `※ 연간 교육 예산 계획 범위 내 집행 예정`
        );
      }
      if (!purpose) {
        setPurpose(`직무 능력 향상 및 현업 적용을 위한 전문 지식 습득`);
      }
    }
  }, [selectedPlanId]);

  // Load selected draft for editing from history
  const handleSelectDraftForEdit = (draft: EducationDraft, index: number) => {
    setEditingDraftIndex(index);
    setSelectedPlanId(draft.plan_id);
    setDraftId(draft.id);
    setDrafter(draft.drafter);
    setDraftDate(draft.draft_date);
    setPurpose(draft.purpose);
    setContentSummary(draft.content_summary);
    setBudgetBreakdown(draft.budget_breakdown);
    setErrors({});
  };

  // Reset form to start a new draft
  const handleResetForm = () => {
    setEditingDraftIndex(null);
    setSelectedPlanId('');
    setDraftId('');
    setDrafter('');
    setDraftDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setContentSummary('');
    setBudgetBreakdown('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedPlanId) newErrors.selectedPlanId = '연관 교육 계획을 선택해주세요.';
    if (!draftId.trim()) newErrors.draftId = '기안서 번호를 입력해주세요.';
    if (!drafter.trim()) newErrors.drafter = '기안자 이름을 입력해주세요.';
    if (!draftDate) newErrors.draftDate = '기안일자를 선택해주세요.';
    if (!purpose.trim()) newErrors.purpose = '교육목적을 입력해주세요.';
    if (!contentSummary.trim()) newErrors.contentSummary = '교육내용을 입력해주세요.';
    if (!budgetBreakdown.trim()) newErrors.budgetBreakdown = '소요예산 상세내역을 입력해주세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save draft
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const draftData: EducationDraft = {
      id: draftId.trim(),
      plan_id: selectedPlanId,
      drafter: drafter.trim(),
      draft_date: draftDate,
      purpose: purpose.trim(),
      content_summary: contentSummary.trim(),
      budget_breakdown: budgetBreakdown.trim(),
    };

    if (editingDraftIndex !== null) {
      await onUpdateDraft(draftData, editingDraftIndex);
    } else {
      // Check for duplicate draft ID
      if (drafts.some((d) => d.id === draftData.id)) {
        setErrors((prev) => ({
          ...prev,
          draftId: '이미 존재하는 기안서 번호입니다. 다른 번호를 사용해 주세요.',
        }));
        return;
      }
      await onAddDraft(draftData);
    }
  };

  // Trigger window print
  const handlePrint = () => {
    if (!validate()) {
      alert('기안서의 필수 항목들을 먼저 올바르게 작성해주세요.');
      return;
    }
    window.print();
  };

  // Pre-fill a sample draft for convenience if there are plans
  const handleLoadSample = () => {
    if (plans.length === 0) return;
    const firstPlan = plans[0];
    setSelectedPlanId(firstPlan.id);
    setDrafter('김철수 대리');
    setDraftDate(new Date().toISOString().split('T')[0]);
    setPurpose('신규 트렌드 기술 파악 및 실무 적용 방안 도출');
    setContentSummary(
      `본 교육은 사내 핵심 기술 역량 강화를 위해 [${firstPlan.agency}]에서 실시하는 ` +
        `[${firstPlan.title}] 교육에 참여하여, 최신 개발 패러다임과 핵심 요소 기술을 ` +
        `이해하고 실무 프로젝트에 성공적으로 적용하는 것을 목표로 합니다.`
    );
    setBudgetBreakdown(
      `1. 교육 수강료: ₩${formatCurrency(firstPlan.estimated_cost)} (부가가치세 면제)\n` +
        `2. 집행 과목: 인재개발원 - 직원 위탁교육 훈련비`
    );
    // Trigger Draft ID auto-generation
    const today = new Date().toISOString().split('T')[0];
    const generatedId = generateDraftIdForDate(today);
    setDraftId(generatedId);
  };

  // Display date formatting for corporate preview
  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
      {/* Dynamic Printing Style Block */}
      <style>{`
        @media print {
          /* Hide everything except the print-area container */
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, main > div:not(#print-area-wrapper), nav, button, form, .no-print {
            display: none !important;
          }
          #print-area-wrapper {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          #print-area {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            padding: 15mm 15mm 15mm 15mm !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
          /* Ensure backgrounds print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          /* Prevent trailing page overflow */
          html, body {
            height: 99% !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* LEFT COLUMN: Input Form & History (5 cols) */}
      <div className="lg:col-span-5 space-y-6 no-print">
        {/* Sample Load Alert if empty */}
        {plans.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-700 flex gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">계획된 연간교육 없음</p>
              <p className="mt-1 font-normal leading-relaxed">
                기안서를 작성하려면 먼저 첫 번째 탭에서 하나 이상의 '연간 교육 계획'을 수립하고 등록해야 합니다.
              </p>
            </div>
          </div>
        )}

        {/* Writing Form Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PenTool className="w-4.5 h-4.5 text-indigo-500" />
              {editingDraftIndex !== null ? '기안서 내용 수정' : '새 교육 기안서 작성'}
            </h3>
            {editingDraftIndex !== null ? (
              <button
                onClick={handleResetForm}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                신규 작성 전환
              </button>
            ) : (
              plans.length > 0 && (
                <button
                  onClick={handleLoadSample}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 샘플 데이터 로드
                </button>
              )
            )}
          </div>

          <form onSubmit={handleSaveDraft} className="space-y-4">
            {/* Plan Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                1. 연관 교육 계획 선택 <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  if (errors.selectedPlanId) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.selectedPlanId;
                      return copy;
                    });
                  }
                }}
                disabled={plans.length === 0}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
              >
                <option value="">-- 연간교육계획을 선택해 주세요 --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.title} ({p.edu_date})
                  </option>
                ))}
              </select>
              {errors.selectedPlanId && (
                <p className="text-xs text-rose-500 mt-1">{errors.selectedPlanId}</p>
              )}
            </div>

            {/* Selected Plan Info Card (Read only) */}
            {selectedPlan && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1.5 text-gray-600">
                <p>
                  <span className="font-bold text-gray-500">교육기관:</span> {selectedPlan.agency} |{' '}
                  <span className="font-bold text-gray-500">강사:</span> {selectedPlan.instructor}
                </p>
                <p>
                  <span className="font-bold text-gray-500">교육일정:</span> {selectedPlan.schedule} ({selectedPlan.time_range}H) |{' '}
                  <span className="font-bold text-gray-500">총시간:</span> {selectedPlan.total_hours}시간
                </p>
                <p>
                  <span className="font-bold text-gray-500">예상비용:</span> ₩{formatCurrency(selectedPlan.estimated_cost)}
                </p>
              </div>
            )}

            {/* Drafter Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                2. 기안자 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={drafter}
                onChange={(e) => {
                  setDrafter(e.target.value);
                  if (errors.drafter) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.drafter;
                      return copy;
                    });
                  }
                }}
                placeholder="예) IT사업본부 김철수 대리"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.drafter && <p className="text-xs text-rose-500 mt-1">{errors.drafter}</p>}
            </div>

            {/* Draft Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                3. 기안일자 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={draftDate}
                onChange={(e) => {
                  setDraftDate(e.target.value);
                  if (errors.draftDate) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.draftDate;
                      return copy;
                    });
                  }
                }}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.draftDate && <p className="text-xs text-rose-500 mt-1">{errors.draftDate}</p>}
            </div>

            {/* Draft ID & Generator */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                4. 기안서 번호 <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftId}
                  readOnly
                  placeholder="자동 채번 중..."
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm bg-gray-50 text-gray-600 font-mono outline-none cursor-not-allowed select-all"
                />
                <div className="rounded-xl px-3.5 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 select-none">
                  <FileCheck className="w-4 h-4 shrink-0 text-indigo-550" />
                  <span>자동 채번</span>
                </div>
              </div>
              {errors.draftId && <p className="text-xs text-rose-500 mt-1">{errors.draftId}</p>}
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                5. 교육목적 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  if (errors.purpose) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.purpose;
                      return copy;
                    });
                  }
                }}
                placeholder="예) 최신 클라우드 보안 아키텍처 역량 함양"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.purpose && <p className="text-xs text-rose-500 mt-1">{errors.purpose}</p>}
            </div>

            {/* Content Summary */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                6. 교육내용 요약 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={contentSummary}
                onChange={(e) => {
                  setContentSummary(e.target.value);
                  if (errors.contentSummary) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.contentSummary;
                      return copy;
                    });
                  }
                }}
                placeholder="상세 교육 커리큘럼, 내용 개요 등을 기재해 주세요..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
              />
              {errors.contentSummary && (
                <p className="text-xs text-rose-500 mt-1">{errors.contentSummary}</p>
              )}
            </div>

            {/* Budget Breakdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                7. 소요예산 상세내역 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={budgetBreakdown}
                onChange={(e) => {
                  setBudgetBreakdown(e.target.value);
                  if (errors.budgetBreakdown) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.budgetBreakdown;
                      return copy;
                    });
                  }
                }}
                placeholder="예) 1. 교육 수강료: ₩1,200,000 (1인)\n2. 교통비 및 식대: 지원 없음..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
              />
              {errors.budgetBreakdown && (
                <p className="text-xs text-rose-500 mt-1">{errors.budgetBreakdown}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-gray-100 pt-4 mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>{editingDraftIndex !== null ? '기안서 수정' : '기안서 저장'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-3 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>기안서 출력</span>
              </button>
            </div>
          </form>
        </div>

        {/* Saved Drafts History Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2.5 mb-3 flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-emerald-500" />
            작성된 기안서 목록 ({drafts.length})
          </h3>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {drafts.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">
                저장된 교육 기안서가 없습니다.
              </p>
            ) : (
              drafts.map((d, index) => {
                const associatedPlan = plans.find((p) => p.id === d.plan_id);
                return (
                  <div
                    key={d.id}
                    className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      editingDraftIndex === index
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectDraftForEdit(d, index)}
                  >
                    <div className="space-y-1 overflow-hidden">
                      <p className="font-bold text-gray-800 truncate">
                        {associatedPlan ? associatedPlan.title : '연관계획 정보 없음'}
                      </p>
                      <div className="flex gap-2 text-gray-400 text-[10px]">
                        <span>번호: {d.id}</span>
                        <span>•</span>
                        <span>기안자: {d.drafter}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">기안일: {d.draft_date}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('정말로 이 기안서를 삭제하시겠습니까? 구글 스프레드시트에서도 삭제됩니다.')) {
                          onDeleteDraft(index);
                          if (editingDraftIndex === index) {
                            handleResetForm();
                          }
                        }
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Real-Time Preview Area (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Banner with helpful tips */}
        <div className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-4 text-xs text-indigo-800 no-print">
          <div className="flex gap-2.5 items-start">
            <Printer className="w-4.5 h-4.5 shrink-0 text-indigo-500 mt-0.5" />
            <div>
              <p className="font-bold">🖨️ 최적화된 1페이지 인쇄 가이드</p>
              <p className="mt-1 leading-relaxed font-medium">
                '기안서 출력'을 클릭하면 배경, 사이드바 등 불필요한 영역은 모두 숨겨지고 아래 A4 기안서 양식만 출력창에 맞춰 정갈하게 인쇄됩니다.
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                Tip: 브라우저 인쇄 옵션에서 <span className="font-semibold text-indigo-700">'배경 그래픽 인쇄'</span>를 체크하시면 표 머리글 배경색과 테두리 레이아웃이 원본 그대로 완벽하게 인쇄됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable container for preview on screen */}
        <div
          id="print-area-wrapper"
          className="w-full bg-gray-100/70 py-6 px-4 md:px-8 rounded-3xl border border-gray-200 flex justify-center overflow-x-auto"
        >
          {/* THE HOVER A4 PRINT PAPER SHEETS */}
          <div
            id="print-area"
            className="w-[210mm] min-h-[297mm] p-[18mm] bg-white border border-gray-300 shadow-2xl relative text-black font-sans leading-relaxed flex flex-col justify-between shrink-0"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header Area */}
            <div>
              <div className="flex justify-between items-start mb-8">
                {/* Spacer or Left corner header */}
                <div className="text-[10px] text-gray-400 font-mono tracking-tight">
                  {draftId || 'DSED-YYYYMMDD-XXXX'}
                </div>

                {/* APPROVAL STAMP GRIDS (결재방) */}
                <table className="border-collapse border border-black text-center text-xs w-[180px]">
                  <tbody>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="border-r border-black font-bold p-1 bg-gray-50 text-[10px] w-[25px]">
                        결<br />재
                      </td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px] w-[50px]">작 성</td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px] w-[50px]">검 토</td>
                      <td className="p-1 bg-gray-50 font-bold text-[10px] w-[50px]">승 인</td>
                    </tr>
                    <tr className="h-[45px]">
                      <td className="border-r border-black text-[9px] text-gray-400 p-1 flex flex-col justify-end items-center h-full">
                        <span className="text-[8px] leading-tight text-gray-300 font-bold mb-1">STAMP</span>
                        <span className="font-semibold text-gray-700">{drafter.split(' ')[0] || ''}</span>
                      </td>
                      <td className="border-r border-black"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Central Title */}
              <div className="text-center mb-10">
                <h1 className="text-2xl font-black tracking-[0.8em] border-b-2 border-double border-black pb-3 inline-block pl-[0.8em]">
                  교 육 기 안 서
                </h1>
              </div>

              {/* Meta Grid Corporate Table */}
              <table className="w-full border-collapse border border-black text-xs mb-6">
                <tbody>
                  {/* Row 1: Draft Number & Drafter */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">기안번호</td>
                    <td className="border-r border-black p-2.5 w-[32%]">{draftId || '(기안 완료 시 부여)'}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">기안자</td>
                    <td className="p-2.5 w-[32%]">{drafter || '(기안서 입력)'}</td>
                  </tr>

                  {/* Row 2: Draft Date & Category */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">기안일자</td>
                    <td className="border-r border-black p-2.5">{getFormattedKoreanDate(draftDate)}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육구분</td>
                    <td className="p-2.5">
                      {selectedPlan ? (
                        <span className="font-bold">[{selectedPlan.category} 교육]</span>
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>

                  {/* Row 3: Course Title */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교 육 명</td>
                    <td colSpan={3} className="p-2.5 font-bold text-sm bg-gray-50/10">
                      {selectedPlan ? selectedPlan.title : '(연관교육계획 선택 필요)'}
                    </td>
                  </tr>

                  {/* Row 4: Institution & Instructor */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육기관</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? selectedPlan.agency : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">강 사</td>
                    <td className="p-2.5">{selectedPlan ? selectedPlan.instructor : ''}</td>
                  </tr>

                  {/* Row 5: Target Group & Dates */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">대 상 자</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? selectedPlan.target_group : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육일정</td>
                    <td className="p-2.5">{selectedPlan ? `${selectedPlan.edu_date} (${selectedPlan.schedule})` : ''}</td>
                  </tr>

                  {/* Row 6: Duration & Cost */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육시간</td>
                    <td className="border-r border-black p-2.5">
                      {selectedPlan ? `${selectedPlan.time_range}H (총 ${selectedPlan.total_hours}시간)` : ''}
                    </td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">예상소요비용</td>
                    <td className="p-2.5 font-bold">
                      {selectedPlan ? `₩${formatCurrency(selectedPlan.estimated_cost)}` : ''}
                    </td>
                  </tr>

                  {/* Row 7: Purpose */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육목적</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed">
                      {purpose || '(교육 목적 기재)'}
                    </td>
                  </tr>

                  {/* Row 8: Content Summary */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육요약 및<br />상세내용</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] min-h-[120px] align-top">
                      {contentSummary || '(교육 개요 및 커리큘럼 요약 기재)'}
                    </td>
                  </tr>

                  {/* Row 9: Budget Breakdown */}
                  <tr>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">예산상세내역</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] min-h-[80px] align-top">
                      {budgetBreakdown || '(지출 품목, 한도 및 산출 내역 기재)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Signature / Footer Area */}
            <div className="text-center pt-8 border-t border-gray-100 mt-auto">
              <p className="text-xs text-gray-500 leading-relaxed mb-12">
                위와 같이 연간 교육 계획에 의거하여 사내/사외 위탁 위와 동일한 교육 과정을 수행코자 하오니,<br />
                검토 후 재가하여 주시기 바랍니다.
              </p>

              <p className="text-sm font-bold text-gray-700 tracking-wider mb-8">
                {getFormattedKoreanDate(draftDate)}
              </p>

              <div className="flex flex-col items-center">
                <p className="text-md font-extrabold tracking-widest text-gray-900">
                  (주) 대 성 스 틸
                </p>
                <p className="text-xs text-gray-400 mt-1 font-semibold">대표이사 귀하</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
