/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency } from '../utils';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  Award,
  AlertTriangle,
  Printer,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlanTableProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  reports?: EducationReport[];
  selectedYear?: string;
  onEdit: (plan: EducationPlan, index: number) => void;
  onDelete: (index: number) => void;
  onStartDraft: (plan: EducationPlan) => void;
  onStartReport: (plan: EducationPlan) => void;
}

export default function PlanTable({
  plans,
  drafts,
  reports = [],
  selectedYear,
  onEdit,
  onDelete,
  onStartDraft,
  onStartReport
}: PlanTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'전체' | '사내' | '사외'>('전체');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<keyof EducationPlan>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof EducationPlan) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter plans
  const filteredPlans = plans
    .map((plan, index) => ({ plan, originalIndex: index }))
    .filter(({ plan }) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        plan.title.toLowerCase().includes(query) ||
        plan.institution.toLowerCase().includes(query) ||
        plan.instructor.toLowerCase().includes(query) ||
        plan.target.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === '전체' || plan.category === categoryFilter;

      // 💡 [핵심] plan.date나 기안서/보고서의 날짜를 비교 대조하기 전에 무조건 .split('T')[0].trim() 처리를 가함
      const cleanPlanDate = (plan.date || '').split('T')[0].trim();
      const matchesYear = !selectedYear || cleanPlanDate.substring(0, 4) === selectedYear;

      return matchesSearch && matchesCategory && matchesYear;
    });

  // Sort filtered plans
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    let aVal = a.plan[sortField];
    let bVal = b.plan[sortField];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const confirmDelete = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex !== null) {
      onDelete(deleteConfirmIndex);
      setDeleteConfirmIndex(null);
    }
  };

  // High-reliability landscape print handler with dynamic CSS styles
  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn('Iframe sandbox detected. Showing instructions for secure print.');
      setShowPrintIframeWarning(true);
    } else {
      const styleId = 'dynamic-landscape-print-style';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          @media print {
            @page {
              size: landscape !important;
              margin: 10mm !important;
            }
            header, footer, nav, button, form, .no-print, .modal, [role="dialog"] {
              display: none !important;
            }
            body > *:not(#root) {
              display: none !important;
            }
            body, #root, main, .mt-4, .space-y-6, .space-y-4 {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              min-height: 0 !important;
            }
            .print-plan-table-container {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              overflow: visible !important;
            }
            .print-plan-table-container table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              font-size: 10px !important;
            }
            .print-plan-table-container th {
              background-color: #f1f5f9 !important;
              color: #1e293b !important;
              font-weight: 700 !important;
              border: 1px solid #94a3b8 !important;
              padding: 6px 4px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-plan-table-container td {
              border: 1px solid #cbd5e1 !important;
              padding: 6px 4px !important;
              font-size: 10px !important;
              word-break: break-all !important;
              line-height: 1.3 !important;
              color: #000000 !important;
            }
          }
        `;
        document.head.appendChild(styleEl);
      }

      try {
        window.print();
      } catch (err) {
        console.error('Print blocked or failed:', err);
        setShowPrintIframeWarning(true);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden print-plan-table-container">
      {/* 인쇄 전용 헤더 */}
      <div className="hidden print:block mb-6 w-full">
        <div className="flex justify-between items-baseline border-b-2 border-slate-800 pb-2.5">
          <h1 className="text-lg font-black text-slate-900">{selectedYear ? `${selectedYear}년도 ` : ''}대성스틸 연간 교육 계획 목록</h1>
          <span className="text-xs text-slate-500 font-mono font-bold">
            출력일자: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Search and Filters bar */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 no-print">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="교육명, 기관, 강사명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['전체', '사내', '사외'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-auto flex justify-end">
          <button
            onClick={handlePrint}
            className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>교육 계획 목록 출력</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
              <th style={{ width: '4%' }} className="py-3 px-1 md:px-1.5 text-center whitespace-nowrap">No</th>
              <th style={{ width: '9%' }} className="py-3 px-1 md:px-1.5 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleSort('date')}>
                교육일자 {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '5.5%' }} className="py-3 px-1 md:px-1.5 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap text-center" onClick={() => handleSort('category')}>
                구분 {sortField === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '22%' }} className="py-3 px-1.5 md:px-2 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('title')}>
                교육명 {sortField === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '16%' }} className="py-3 px-1.5 md:px-2">교육기관 / 강사</th>
              <th style={{ width: '9%' }} className="py-3 px-1.5 md:px-2">대상자</th>
              <th style={{ width: '9%' }} className="py-3 px-1 md:px-1.5 whitespace-nowrap">교육일정</th>
              <th style={{ width: '10.5%' }} className="py-3 px-1 md:px-1.5 text-center whitespace-nowrap" onClick={() => handleSort('hours')}>
                교육시간 {sortField === 'hours' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '8.5%' }} className="py-3 px-1 md:px-1.5 text-right cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleSort('cost')}>
                예상비용 {sortField === 'cost' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '4%' }} className="py-3 px-1 md:px-1.5 text-center whitespace-nowrap">기안</th>
              <th style={{ width: '4%' }} className="py-3 px-1 md:px-1.5 text-center whitespace-nowrap">보고서</th>
              <th style={{ width: '4%' }} className="py-3 px-1 md:px-1.5 text-center whitespace-nowrap no-print">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPlans.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 font-medium">
                  수립된 교육 계획이 없습니다.
                </td>
              </tr>
            ) : (
              sortedPlans.map(({ plan, originalIndex }, idx) => {
                // 💡 [버그 종결] 기안서 데이터가 배열이든 객체든 'plan_id'를 정확하게 파싱하여 비교합니다.
                const hasDraft = drafts.some((d) => {
                  if (!d) return false;
                  const dPlanId = Array.isArray(d) ? String(d[1]) : String(d.plan_id || (d as any).planId || '');
                  return dPlanId.toString().trim() === plan.id.toString().trim();
                });

                // 💡 보고서 데이터도 동일하게 2중 구조 예외 방어 후 매칭
                const isReportCompleted = reports.some(r => r && (r.planId || r.plan_id || '').toString().trim() === plan.id.toString().trim());
                const hasReport = isReportCompleted;

                return (
                  <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Sequence No */}
                    <td className="py-3.5 px-1 md:px-1.5 text-center font-mono font-bold text-gray-500">
                      {idx + 1}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-1 md:px-1.5 font-medium text-gray-700 whitespace-nowrap">
                      {plan.date}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-1 md:px-1.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold leading-none whitespace-nowrap ${
                          plan.category === '사내'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {plan.category}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-1.5 md:px-2 font-semibold text-gray-800 leading-snug break-all">
                      {plan.title}
                    </td>

                    {/* Agency / Instructor */}
                    <td className="py-3.5 px-1.5 md:px-2 text-gray-500 break-all">
                      <div className="font-medium text-gray-700 leading-snug">{plan.institution}</div>
                      <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 flex items-center gap-1 whitespace-nowrap">
                        <User className="w-3 h-3 shrink-0" /> <span className="whitespace-nowrap">{plan.instructor}</span>
                      </div>
                    </td>

                    {/* Target Group */}
                    <td className="py-3.5 px-1.5 md:px-2 text-gray-600 leading-snug break-all">
                      {plan.target}
                    </td>

                    {/* Schedule */}
                    <td className="py-3.5 px-1 md:px-1.5 text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="whitespace-nowrap">{plan.schedule}</span>
                      </div>
                    </td>

                    {/* Integrated Education Time */}
                    <td className="py-3.5 px-1 md:px-1.5 text-center text-gray-600 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="whitespace-nowrap">{plan.time_range} ({plan.hours}시간)</span>
                      </div>
                    </td>

                    {/* Estimated Cost */}
                    <td className="py-3.5 px-1 md:px-1.5 text-right text-gray-800 whitespace-nowrap font-mono">
                      {formatCurrency(plan.cost)}
                    </td>

                    {/* Draft Column */}
                    <td className="py-3.5 px-1 md:px-1.5 whitespace-nowrap text-center">
                      {hasDraft ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-lg bg-rose-600 text-white shadow-xs whitespace-nowrap print:bg-transparent print:text-rose-600 print:p-0 print:border-none print:shadow-none">
                          완료
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onStartDraft(plan)}
                            className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-lg bg-lime-300 text-indigo-950 hover:bg-lime-400 border border-lime-400/30 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap no-print"
                          >
                            기안
                          </button>
                          <span className="hidden print:inline text-gray-400 font-bold">대기</span>
                        </>
                      )}
                    </td>

                    {/* Report Column */}
                    <td className="py-3.5 px-1 md:px-1.5 whitespace-nowrap text-center">
                      {hasReport ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-lg bg-rose-600 text-white shadow-xs whitespace-nowrap print:bg-transparent print:text-rose-600 print:p-0 print:border-none print:shadow-none">
                          완료
                        </span>
                      ) : hasDraft ? (
                        <>
                          <button
                            onClick={() => onStartReport(plan)}
                            className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-lg bg-[#1e293b] text-white hover:bg-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap no-print"
                          >
                            작성
                          </button>
                          <span className="hidden print:inline text-gray-400 font-bold">대기</span>
                        </>
                      ) : (
                        <>
                          <button
                            disabled
                            className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 whitespace-nowrap no-print"
                          >
                            작성
                          </button>
                          <span className="hidden print:inline text-gray-300 font-bold">-</span>
                        </>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-1 md:px-1.5 whitespace-nowrap text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(plan, originalIndex)}
                          className="p-1 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(originalIndex)}
                          className="p-1 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 text-center"
            >
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 text-rose-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">교육 계획 삭제</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                정말로 이 교육 계획을 삭제하시겠습니까?<br />
                구글 스프레드시트 데이터베이스에서도 즉시 삭제되며 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmIndex(null)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
                >
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Iframe Sandbox Print Warning Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-gray-800">보안 및 브라우저 환경 안내</h4>
                <p className="text-xs text-gray-500 leading-relaxed text-left bg-gray-50 p-3.5 rounded-xl border border-gray-150">
                  현재 AI Studio 미리보기(Iframe Sandbox) 내부에서는 보안 규정으로 인해 인쇄 창을 직접 열 수 없습니다.<br /><br />
                  출력을 정상 진행하려면 우측 상단의 <span className="font-semibold text-indigo-600">[새 창에서 열기 (Open in new tab)]</span>를 클릭하여 새 탭에서 접속해 주십시오. 아래 버튼으로 바로 이동하실 수도 있습니다.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrintIframeWarning(false)}
                  className="flex-1 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold py-2.5 transition-all cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(window.location.href, '_blank');
                    setShowPrintIframeWarning(false);
                  }}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 transition-all cursor-pointer"
                >
                  새 창으로 열기 (인쇄 실행)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}