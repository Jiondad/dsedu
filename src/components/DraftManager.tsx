/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EducationPlan, EducationDraft } from '../types';
import { formatCurrency } from '../utils';
import {
  FileText,
  Trash2,
  Printer,
  RefreshCw,
  FileCheck,
  AlertCircle,
  PenTool,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DraftManagerProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<EducationDraft[]>>;
  onAddDraft: (draft: EducationDraft) => Promise<string | void>;
  onUpdateDraft: (draft: EducationDraft, index: number) => Promise<void>;
  onDeleteDraft: (index: number) => Promise<void>;
  isLoading: boolean;
  preselectedPlanId?: string | null;
  onClearPreselectedPlan?: () => void;
}

export default function DraftManager({
  plans,
  drafts,
  setDrafts,
  onAddDraft,
  onUpdateDraft,
  onDeleteDraft,
  isLoading,
  preselectedPlanId,
  onClearPreselectedPlan,
}: DraftManagerProps) {
  // Currently editing draft state (form)
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [drafterName, setDrafterName] = useState('');
  const [draftDate, setDraftDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [contentSummary, setContentSummary] = useState('');
  const [budgetBreakdown, setBudgetBreakdown] = useState('');

  // Combined drafter value for standard compatibility
  const drafter = `${department}|${position}|${drafterName}`;

  // Helper parser for backward compatibility
  const parseDrafter = (drafterStr: string) => {
    if (!drafterStr) return { dept: '', pos: '', name: '' };
    if (drafterStr.includes('|')) {
      const parts = drafterStr.split('|');
      return {
        dept: parts[0] || '',
        pos: parts[1] || '',
        name: parts[2] || '',
      };
    }
    const parts = drafterStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      return {
        dept: parts[0],
        pos: parts[1],
        name: parts.slice(2).join(' '),
      };
    } else if (parts.length === 2) {
      return {
        dept: '',
        pos: parts[1],
        name: parts[0],
      };
    }
    return {
      dept: '',
      pos: '',
      name: drafterStr,
    };
  };

  // Selected draft from history for editing
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);

  // Local notification state
  const [localNotification, setLocalNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const triggerLocalNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setLocalNotification({ text, type });
    setTimeout(() => {
      setLocalNotification(null);
    }, 4500);
  };

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Target ID of draft to delete (for custom confirmation dialog)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // State to show print dialog error warning modal (when window.print is blocked by iframe sandbox)
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Filter for plan categories ('전체', '사내', '사외')
  const [planCategoryFilter, setPlanCategoryFilter] = useState<'전체' | '사내' | '사외'>('전체');

  // 연도 선택 필터 State (디폴트는 현재 연도)
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  // Auto-generate sequential draft ID based on selected date and year-based sequence
  const generateDraftIdForDate = (date: string) => {
    if (!date) return '';
    const cleanDate = date.split('T')[0].trim();
    const year = cleanDate.substring(0, 4); // YYYY
    const dateStr = cleanDate.replace(/-/g, ''); // YYYYMMDD

    // Filter existing drafts that belong to the same year
    const sameYearDrafts = drafts.filter((d) => {
      const cleanDDate = d.draft_date ? d.draft_date.split('T')[0].trim() : '';
      const dateMatch = cleanDDate && cleanDDate.substring(0, 4) === year;
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
    if (editingDraftIndex === null && draftDate && selectedPlanId) {
      const existing = drafts.find((d) => d.plan_id === selectedPlanId);
      if (existing) {
        return;
      }
      const nextId = generateDraftIdForDate(draftDate);
      setDraftId(nextId);
      
      if (errors.draftId) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.draftId;
          return copy;
        });
      }
    }
  }, [draftDate, drafts, editingDraftIndex, selectedPlanId]);

  // Synchronize editingDraftIndex when drafts array updates after a new draft is saved
  useEffect(() => {
    if (editingDraftIndex === null && draftId) {
      const index = drafts.findIndex((d) => d.id === draftId);
      if (index !== -1) {
        setEditingDraftIndex(index);
      }
    }
  }, [drafts, draftId, editingDraftIndex]);

  // Handle preselected plan when clicking "기안" from the plans tab
  useEffect(() => {
    if (preselectedPlanId) {
      const plan = plans.find((p) => p.id === preselectedPlanId);
      if (plan) {
        setSelectedPlanId(preselectedPlanId);

        const existingDraft = drafts.find((d) => d.plan_id === preselectedPlanId);
        if (existingDraft) {
          const index = drafts.findIndex((d) => d.plan_id === preselectedPlanId);
          setEditingDraftIndex(index);
          setDraftId(existingDraft.id);
          
          const parts = parseDrafter(existingDraft.drafter);
          setDepartment(parts.dept);
          setPosition(parts.pos);
          setDrafterName(parts.name);

          setDraftDate((existingDraft.draft_date || '').split('T')[0].trim());
          setPurpose(existingDraft.purpose);
          setContentSummary(existingDraft.content_summary);
          setBudgetBreakdown(existingDraft.budget_breakdown);
          setErrors({});
          triggerLocalNotification('이미 작성된 기안서가 존재하여 해당 기안서를 불러왔습니다.', 'info');
        } else {
          setEditingDraftIndex(null);
          const nextId = generateDraftIdForDate(draftDate);
          setDraftId(nextId);
          setDepartment('');
          setPosition('');
          setDrafterName('');
          setPurpose('');
          setContentSummary('');
          setBudgetBreakdown('');
          setErrors({});
          triggerLocalNotification('새 교육 기안서 작성을 시작합니다.', 'success');
        }
      }
      onClearPreselectedPlan?.();
    }
  }, [preselectedPlanId, plans, drafts, draftDate]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  useEffect(() => {
    if (selectedPlan && editingDraftIndex === null) {
      if (!contentSummary) {
        setContentSummary(
          `본 교육은 [${selectedPlan.institution}]에서 주관하는 [${selectedPlan.title}] 교육과정으로서, ` +
            `참여 대상인 [${selectedPlan.target}]의 실무 전문 역량 및 지식 수준을 함양하기 위한 목적으로 기획되었습니다.`
        );
      }
      if (!budgetBreakdown) {
        setBudgetBreakdown(
          `교육 수강료: ₩${formatCurrency(selectedPlan.cost)} (1인 기준)\n` +
            `교재 및 실습비 포함 여부: 포함\n` +
            `※ 연간 교육 예산 계획 범위 내 집행 예정`
        );
      }
      if (!purpose) {
        setPurpose(`직무 능력 향상 및 현업 적용을 위한 전문 지식 습득`);
      }
    }
  }, [selectedPlanId, editingDraftIndex]);

  const handlePlanSelection = (planId: string) => {
    setSelectedPlanId(planId);
    if (errors.selectedPlanId) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.selectedPlanId;
        return copy;
      });
    }

    if (!planId) {
      handleResetForm();
      return;
    }

    const existingDraft = drafts.find((d) => d.plan_id === planId);
    if (existingDraft) {
      if (editingDraftIndex === null || drafts[editingDraftIndex].plan_id !== planId) {
        setErrors((prev) => ({
          ...prev,
          selectedPlanId: '이미 기안서가 작성된 교육계획입니다.',
        }));
        triggerLocalNotification('이미 기안서가 작성된 교육계획입니다.', 'error');
        try {
          alert('이미 기안서가 작성된 교육계획입니다.');
        } catch (_) {}
        
        const nextId = generateDraftIdForDate(draftDate);
        setDraftId(nextId);
        setDepartment('');
        setPosition('');
        setDrafterName('');
        setPurpose('');
        setContentSummary('');
        setBudgetBreakdown('');
        return;
      }
    } else {
      if (editingDraftIndex === null) {
        const nextId = generateDraftIdForDate(draftDate);
        setDraftId(nextId);
        setDepartment('');
        setPosition('');
        setDrafterName('');
        setPurpose('');
        setContentSummary('');
        setBudgetBreakdown('');
      }
    }
  };

  const handleSelectDraftForEdit = (draft: EducationDraft, index: number) => {
    setEditingDraftIndex(index);
    setSelectedPlanId(draft.plan_id);
    setDraftId(draft.id);
    
    const parts = parseDrafter(draft.drafter);
    setDepartment(parts.dept);
    setPosition(parts.pos);
    setDrafterName(parts.name);

    setDraftDate((draft.draft_date || '').split('T')[0].trim());
    setPurpose(draft.purpose);
    setContentSummary(draft.content_summary);
    setBudgetBreakdown(draft.budget_breakdown);
    setErrors({});
  };

  const handleResetForm = () => {
    setEditingDraftIndex(null);
    setSelectedPlanId('');
    setDraftId('');
    setDepartment('');
    setPosition('');
    setDrafterName('');
    setDraftDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setContentSummary('');
    setBudgetBreakdown('');
    setErrors({});
  };

  const handleDeleteDraft = (draftId: string) => {
    const targetIndex = drafts.findIndex((d) => d.id === draftId || (d as any).draft_id === draftId);
    
    if (setDrafts) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId && (d as any).draft_id !== draftId));
    }
    
    if (editingDraftIndex === targetIndex && targetIndex !== -1) {
      handleResetForm();
    } else if (editingDraftIndex !== null && targetIndex !== -1 && targetIndex < editingDraftIndex) {
      setEditingDraftIndex((prev) => (prev !== null ? prev - 1 : null));
    }

    if (targetIndex !== -1) {
      onDeleteDraft(targetIndex).catch((err) => {
        console.error('Failed to sync deletion on spreadsheet:', err);
        triggerLocalNotification('구글 스프레드시트 삭제 반영 실패', 'error');
      });
    }
  };

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeWarning(true);
    } else {
      const originalTitle = document.title;
      try {
        const planTitle = selectedPlan ? selectedPlan.title : '교육기안서';
        const planTarget = selectedPlan ? selectedPlan.target : '대상자';
        const titleParts = [draftDate, planTitle, planTarget]
          .filter(Boolean)
          .map((p) => p.replace(/[\/\\?%*:|"<>\x00-\x1F\s]+/g, '_').trim());
        const dynamicTitle = titleParts.join('_');
        
        document.title = dynamicTitle;
        window.print();
      } catch (err) {
        setShowPrintIframeWarning(true);
      } finally {
        document.title = originalTitle;
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedPlanId) {
      newErrors.selectedPlanId = '연관 교육 계획을 선택해주세요.';
    } else {
      if (editingDraftIndex === null) {
        const existingDraft = drafts.find((d) => d.plan_id === selectedPlanId);
        if (existingDraft) {
          newErrors.selectedPlanId = '이미 기안서가 작성된 교육계획입니다.';
          alert('이미 기안서가 작성된 교육계획입니다.');
        }
      } else {
        const otherDraft = drafts.find((d, idx) => d.plan_id === selectedPlanId && idx !== editingDraftIndex);
        if (otherDraft) {
          newErrors.selectedPlanId = '이미 기안서가 작성된 교육계획입니다.';
          alert('이미 기안서가 작성된 교육계획입니다.');
        }
      }
    }

    // 💡 기안일자 <= 교육시작일 검증 (시차 개입을 완전히 차단하는 문자열 기반 정밀 비교)
    if (draftDate && selectedPlan) {
      const draftDateClean = draftDate.split('T')[0].trim();
      const eduDateClean = selectedPlan.date.split('T')[0].trim();
      if (draftDateClean > eduDateClean) {
        newErrors.draftDate = '기안일자는 교육 시작일보다 같거나 먼저여야 합니다.';
        alert('❌ 기안일자는 교육 시작일보다 같거나 먼저여야 합니다.');
      }
    }

    if (!draftId.trim()) newErrors.draftId = '기안서 번호를 입력해주세요.';
    if (!department.trim()) newErrors.department = '부서를 입력해주세요.';
    if (!position.trim()) newErrors.position = '직급을 입력해주세요.';
    if (!drafterName.trim()) newErrors.drafterName = '성명을 입력해주세요.';
    if (!draftDate) newErrors.draftDate = '기안일자를 선택해주세요.';
    if (!purpose.trim()) newErrors.purpose = '교육목적을 입력해주세요.';
    if (!contentSummary.trim()) newErrors.contentSummary = '교육내용을 입력해주세요.';
    if (!budgetBreakdown.trim()) newErrors.budgetBreakdown = '소요예산 상세내역을 입력해주세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 💡 [2중 기안 저장부 정밀 타격] 전송 페이로드에 UTC 타임스탬프가 붙지 않도록 완벽하게 날짜 가공 격리
    const cleanDraftDate = draftDate.split('T')[0].split(' ')[0];

    const draftData: EducationDraft = {
      id: draftId.trim(),
      plan_id: selectedPlanId,
      drafter: drafter.trim(),
      draft_date: cleanDraftDate,
      purpose: purpose.trim(),
      content_summary: contentSummary.trim(),
      budget_breakdown: budgetBreakdown.trim(),
    };

    if (editingDraftIndex !== null) {
      await onUpdateDraft(draftData, editingDraftIndex);
      triggerLocalNotification('기안서 수정이 완료되었습니다.', 'success');
    } else {
      if (drafts.some((d) => d.id === draftData.id)) {
        setErrors((prev) => ({
          ...prev,
          draftId: '이미 존재하는 기안서 번호입니다. 다른 번호를 사용해 주세요.',
        }));
        return;
      }
      try {
        const finalId = await onAddDraft(draftData);
        if (finalId) {
          setDraftId(finalId);
        }
        triggerLocalNotification('기안서가 신규 저장되었습니다.', 'success');
      } catch (err) {
        console.error('Failed to add draft:', err);
      }
    }
  };

  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr) return '';
    let cleanDate = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative w-full max-w-full box-border overflow-x-hidden">
      <AnimatePresence>
        {localNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 no-print"
          >
            <div
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 ${
                localNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : localNotification.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-100'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-100'
              }`}
            >
              <span>{localNotification.text}</span>
              <button
                type="button"
                onClick={() => setLocalNotification(null)}
                className="hover:opacity-80 font-bold ml-auto"
              >
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT COLUMN */}
      <div className="lg:col-span-5 space-y-6 no-print">
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PenTool className="w-4.5 h-4.5 text-indigo-500" />
              {editingDraftIndex !== null ? '기안서 내용 수정' : '새 교육 기안서 작성'}
            </h3>
            {editingDraftIndex !== null && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                신규 작성 전환
              </button>
            )}
          </div>

          <form onSubmit={handleSaveDraft} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-500">
                  1. 연관 교육 계획 선택 <span className="text-rose-500">*</span>
                </label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                  {(['전체', '사내', '사외'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPlanCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        planCategoryFilter === cat
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanSelection(e.target.value)}
                disabled={plans.length === 0}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
              >
                <option value="">-- 연간교육계획을 선택해 주세요 --</option>
                {plans
                  .filter((p) => {
                    // 1. 카테고리 필터 매칭 여부 검사
                    const categoryMatch = planCategoryFilter === '전체' || p.category === planCategoryFilter;

                    // 2. 이미 기안서 목록(drafts)에 존재하는지 대조 (수정 모드일 때는 자기 자신 기안서 제외)
                    const isDraftedInAnother = drafts.some((d, idx) => {
                      if (editingDraftIndex !== null) {
                        return d.plan_id === p.id && idx !== editingDraftIndex;
                      }
                      return d.plan_id === p.id;
                    });

                    // 3. 예외 조항: 현재 선택된 값(selectedPlanId)이라면 상태 깨짐 방지를 위해 무조건 노출 보장
                    if (p.id === selectedPlanId) return true;

                    return categoryMatch && !isDraftedInAnother;
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.category}] {p.title} ({p.date})
                    </option>
                  ))}
              </select>
              {errors.selectedPlanId && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-rose-500 font-semibold">{errors.selectedPlanId}</p>
                  {errors.selectedPlanId === '이미 기안서가 작성된 교육계획입니다.' && (
                    <button
                      type="button"
                      onClick={() => {
                        const existingIndex = drafts.findIndex((d) => d.plan_id === selectedPlanId);
                        if (existingIndex !== -1) {
                          handleSelectDraftForEdit(drafts[existingIndex], existingIndex);
                          triggerLocalNotification('기존 교육계획 기안서를 불러왔습니다.', 'success');
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      👉 기존 기안서 불러와서 수정하기
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedPlan && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-600 flex justify-between items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <p>
                    <span className="font-bold text-gray-500">교육기관:</span> {selectedPlan.institution} |{' '}
                    <span className="font-bold text-gray-500">강사:</span> {selectedPlan.instructor}
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">교육일정:</span> {selectedPlan.schedule} ({selectedPlan.time_range}H) |{' '}
                    <span className="font-bold text-gray-500">총시간:</span> {selectedPlan.hours}시간
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">예상비용:</span> ₩{formatCurrency(selectedPlan.cost)}
                  </p>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-gray-150 shrink-0 text-right shadow-2xs">
                  <p className="text-[9px] text-gray-400 font-bold tracking-wider mb-0.5">교육 대상자</p>
                  <p className="font-bold text-indigo-600 text-[11px]">{selectedPlan.target || '미지정'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  2-1. 기안서 번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={draftId || '(교육 계획 선택 시 자동 기입)'}
                  readOnly
                  placeholder="교육 계획 선택 시 자동 생성"
                  className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm bg-gray-50 font-mono text-[11px] outline-none text-gray-500 select-none"
                />
                {errors.draftId && <p className="text-xs text-rose-500 mt-1">{errors.draftId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  2-2. 기안일자 <span className="text-rose-500">*</span>
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
                  className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                />
                {errors.draftDate && <p className="text-xs text-rose-500 mt-1">{errors.draftDate}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                3. 작성자 정보 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 관리팀"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  {errors.department && <p className="text-[10px] text-rose-500 mt-1">{errors.department}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: 과장"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  {errors.position && <p className="text-[10px] text-rose-500 mt-1">{errors.position}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={drafterName}
                    onChange={(e) => setDrafterName(e.target.value)}
                    placeholder="예: 염지원"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  {errors.drafterName && <p className="text-[10px] text-rose-500 mt-1">{errors.drafterName}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                4. 교육 목적 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="예) 최신 클라우드 보안 아키텍처 역량 함양"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.purpose && <p className="text-xs text-rose-500 mt-1">{errors.purpose}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                5. 교육내용 요약 (6. 교육내용 요약) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={contentSummary}
                onChange={(e) => setContentSummary(e.target.value)}
                placeholder="상세 교육 커리큘럼, 내용 개요 등을 기재해 주세요..."
                rows={8}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
              />
              {errors.contentSummary && (
                <p className="text-xs text-rose-500 mt-1">{errors.contentSummary}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                6. 소요예산 상세내역 (7. 소요예산 상세내역) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={budgetBreakdown}
                onChange={(e) => setBudgetBreakdown(e.target.value)}
                placeholder="예) 1. 교육 수강료: ₩1,200,000 (1인)\n2. 교통비 및 식대: 지원 없음..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
              />
              {errors.budgetBreakdown && (
                <p className="text-xs text-rose-500 mt-1">{errors.budgetBreakdown}</p>
              )}
            </div>

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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
          {(() => {
            // 작성된 기안서 목록에서 고유 연도를 추출하고 현재 연도를 항상 포함
            const availableYears = Array.from(new Set([
              new Date().getFullYear().toString(),
              ...drafts.map((d) => d.draft_date ? d.draft_date.split('T')[0].substring(0, 4) : '').filter(Boolean)
            ])).sort((a, b) => b.localeCompare(a));

            const filteredDraftsWithIndex = drafts
              .map((d, originalIndex) => ({ d, originalIndex }))
              .filter(({ d }) => {
                const year = d.draft_date ? d.draft_date.split('T')[0].substring(0, 4) : '';
                return year === filterYear;
              });

            return (
              <>
                <div className="border-b border-gray-100 pb-2.5 mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-emerald-500" />
                    작성된 기안서 목록 ({filteredDraftsWithIndex.length})
                  </h3>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredDraftsWithIndex.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6">
                      {filterYear}년에 저장된 교육 기안서가 없습니다.
                    </p>
                  ) : (
                    filteredDraftsWithIndex.map(({ d, originalIndex }) => {
                      const associatedPlan = plans.find((p) => p.id === d.plan_id);
                      return (
                        <div
                          key={d.id}
                          className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            editingDraftIndex === originalIndex
                              ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectDraftForEdit(d, originalIndex)}
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
                            <p className="text-[10px] text-gray-400">기안일: {d.draft_date ? d.draft_date.split('T')[0] : ''}</p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(d.id);
                            }}
                            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div
          id="print-area-wrapper"
          className="w-full bg-gray-100/70 py-6 px-4 md:px-8 rounded-3xl border border-gray-200 flex justify-center overflow-x-hidden max-w-full box-border print-section"
        >
          <div
            id="print-area"
            className="w-full max-w-[210mm] h-auto p-4 sm:p-[10mm] bg-white border border-gray-300 shadow-2xl relative text-black font-sans leading-relaxed flex flex-col justify-start gap-y-4 shrink-0 box-border overflow-x-hidden"
            style={{ boxSizing: 'border-box' }}
          >
            <style>{`
              @media print {
                /* 불필요한 요소 숨김 처리 */
                header, nav, aside, form, input, textarea, select, button, .no-print, [class*="no-print"] {
                  display: none !important;
                }
                /* 좌측 칼럼 및 작성된 기안서 목록 영역 전체 숨김 */
                .lg\\:col-span-5, .lg\\:col-span-12 {
                  display: none !important;
                }
                /* 그리드 및 플렉스 전면 해제하여 100% 가득 차도록 함 */
                .grid, .flex, .print-container {
                  display: block !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                /* 인쇄 문서 외 상위 레이아웃의 마진/패딩 제거 및 배경화면 초기화 */
                body, html, #root, main, .print-container, .lg\\:col-span-7 {
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  box-shadow: none !important;
                  border: none !important;
                  position: static !important;
                }
                #print-area-wrapper, .print-section {
                  background: transparent !important;
                  border: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                  width: 100% !important;
                  max-width: none !important;
                  box-shadow: none !important;
                  position: static !important;
                }
                #print-area {
                  display: block !important;
                  position: relative !important;
                  width: 100% !important;
                  max-width: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  box-sizing: border-box !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                #print-area * {
                  box-shadow: none !important;
                  text-shadow: none !important;
                  box-sizing: border-box !important;
                }
                /* 표 및 내부 셀 여유 공간 */
                #print-area table td {
                  padding: 8px 6px !important;
                }
                
                /* 기안서 전용 인쇄 박스 높이 확보 */
                .draft-summary-box { min-height: 180px !important; }
                .draft-budget-box { min-height: 60px !important; }
              }
            `}</style>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] text-gray-400 font-mono tracking-tight">
                  {draftId || 'DSEDU-YYYYMMDD-XXX'}
                </div>

                <table className="approval-table border-collapse border border-black text-center text-xs w-[180px]" style={{ borderCollapse: 'collapse', border: '1px solid #000000' }}>
                  <tbody>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="border-r border-black font-bold p-1 bg-gray-50 text-[10px] w-[25px]" style={{ border: '1px solid #000000' }}>
                        결<br />재
                      </td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px] w-[50px]" style={{ border: '1px solid #000000' }}>작 성</td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px] w-[50px]" style={{ border: '1px solid #000000' }}>검 토</td>
                      <td className="p-1 bg-gray-50 font-bold text-[10px] w-[50px]" style={{ border: '1px solid #000000' }}>승 인</td>
                    </tr>
                    <tr style={{ height: '45px' }}>
                      <td className="border-r border-black p-1 text-center" style={{ border: '1px solid #000000', height: '45px', verticalAlign: 'middle' }}></td>
                      <td className="border-r border-black" style={{ border: '1px solid #000000', height: '45px' }}></td>
                      <td style={{ border: '1px solid #000000', height: '45px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center mb-10">
                <h1 className="text-2xl font-black tracking-[0.8em] border-b-2 border-double border-black pb-2 inline-block pl-[0.8em]">
                  교 육 기 안 서
                </h1>
              </div>

              <table className="w-full border-collapse border border-black text-xs mb-3">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">기안번호</td>
                    <td className="border-r border-black p-2.5 w-[32%]">{draftId || '(기안 완료 시 부여)'}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">기안자</td>
                    <td className="p-2.5 w-[32%]">
                      {drafterName ? `${department} ${position} ${drafterName}`.trim() : '(기안서 입력)'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">기안일자</td>
                    <td className="border-r border-black p-2.5">{getFormattedKoreanDate(draftDate)}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육구분</td>
                    <td className="p-2.5">{selectedPlan ? <span className="font-bold">[{selectedPlan.category} 교육]</span> : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교 육 명</td>
                    <td colSpan={3} className="p-2.5 font-bold text-sm bg-gray-50/10">{selectedPlan ? selectedPlan.title : '(연관교육계획 선택 필요)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육기관</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? selectedPlan.institution : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">강 사</td>
                    <td className="p-2.5">{selectedPlan ? selectedPlan.instructor : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">대 상 자</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? selectedPlan.target : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육일정</td>
                    <td className="p-2.5">{selectedPlan ? `${selectedPlan.date ? selectedPlan.date.split('T')[0] : ''} (${selectedPlan.schedule})` : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육시간</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? `${selectedPlan.time_range}H (총 ${selectedPlan.hours}시간)` : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">예상소요비용</td>
                    <td className="p-2.5 font-bold">{selectedPlan ? `₩${formatCurrency(selectedPlan.cost)}` : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육목적</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed">{purpose || '(교육 목적 기재)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육요약 및<br />상세내용</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                      <div className="draft-summary-box min-h-[240px] w-full">{contentSummary || '(교육 개요 및 커리큘럼 요약 기재)'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">예산상세내역</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                      <div className="draft-budget-box min-h-[80px] w-full">{budgetBreakdown || '(지출 품목, 한도 및 산출 내역 기재)'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center pt-2 border-t border-gray-100 mt-2 print:mt-1.5 pb-0">
              <p className="text-[11px] sm:text-xs text-gray-500 tracking-tight leading-relaxed mb-2 print:mb-1.5 font-medium max-w-[95%] mx-auto">
                위와 같이 연간 교육 계획에 의거하여 사내/사외 위탁 교육 과정을 수행코자 하오니,<br />
                검토 후 재가하여 주시기 바랍니다.
              </p>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 tracking-wider mb-2 print:mb-1.5">{getFormattedKoreanDate(draftDate)}</p>
              <div className="flex flex-col items-center">
                <p className="text-sm sm:text-md font-extrabold text-gray-900 leading-none">(주)대성스틸</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTargetId !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">삭제하시겠습니까?</h4>
                <p className="text-xs text-gray-400 mt-1">구글 스프레드시트에서도 즉시 삭제됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold">아니요</button>
                <button type="button" onClick={() => { handleDeleteDraft(deleteTargetId); setDeleteTargetId(null); }} className="flex-1 rounded-xl bg-rose-600 text-white text-xs font-bold py-2">확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}