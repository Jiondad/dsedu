/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency } from '../utils';
import {
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Printer,
  ArrowUpDown,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlanTableProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  reports: EducationReport[];
  selectedYear: string;
  onEdit: (plan: EducationPlan) => void;
  onDelete: (index: number) => void;
  onStartDraft: (plan: EducationPlan) => void;
  onStartReport: (plan: EducationPlan) => void;
}

/**
 * 교육일정(schedule, 예: "06/15~06/26" 또는 "12/01~12/01")에서
 * '교육 첫날(시작일)'을 추출하여 정렬용 표준 문자열("MM-DD")로 변환하는 헬퍼 함수
 */
function getScheduleSortKey(plan: EducationPlan): string {
  const rawSchedule = (plan.schedule || '').trim();

  if (rawSchedule) {
    const startPart = rawSchedule.split('~')[0].trim();
    const mdMatch = startPart.match(/(?:\d{4}[-./])?(\d{1,2})[-./](\d{1,2})/);
    if (mdMatch) {
      const month = mdMatch[1].padStart(2, '0');
      const day = mdMatch[2].padStart(2, '0');

      const endPart = rawSchedule.split('~')[1]?.trim() || startPart;
      const endMatch = endPart.match(/(?:\d{4}[-./])?(\d{1,2})[-./](\d{1,2})/);
      const endMonth = endMatch ? endMatch[1].padStart(2, '0') : month;
      const endDay = endMatch ? endMatch[2].padStart(2, '0') : day;

      return `${month}-${day}_${endMonth}-${endDay}`;
    }
  }

  const cleanDate = (plan.date || '').split('T')[0].trim();
  const dateMatch = cleanDate.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}_${dateMatch[1]}-${dateMatch[2]}`;
  }

  return '99-99_99-99';
}

export default function PlanTable({
  plans,
  drafts,
  reports,
  selectedYear,
  onEdit,
  onDelete,
  onStartDraft,
  onStartReport,
}: PlanTableProps) {
  // Category filter ('전체', '사내', '사외')
  const [categoryFilter, setCategoryFilter] = useState<'전체' | '사내' | '사외'>('전체');

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state for schedule start date (기본값: 교육 첫날 기준 오름차순 'asc')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Delete confirmation modal state
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);

  // Print sandbox warning modal state
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Filter plans by selected year, category filter, and search query
  const filteredPlans = plans.filter((plan) => {
    const cleanPlanDate = (plan.date || '').split('T')[0].trim();
    const planYear = cleanPlanDate.substring(0, 4);
    const matchesYear = !selectedYear || !planYear || planYear === selectedYear;

    const matchesCategory =
      categoryFilter === '전체' || plan.category === categoryFilter;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (plan.title && plan.title.toLowerCase().includes(query)) ||
      (plan.institution && plan.institution.toLowerCase().includes(query)) ||
      (plan.instructor && plan.instructor.toLowerCase().includes(query)) ||
      (plan.target && plan.target.toLowerCase().includes(query)) ||
      (plan.schedule && plan.schedule.toLowerCase().includes(query));

    return matchesYear && matchesCategory && matchesSearch;
  });

  // 계획 등록일자(plan.date)가 아닌 '교육일정(plan.schedule)의 첫날' 기준으로 정렬
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    const keyA = getScheduleSortKey(a);
    const keyB = getScheduleSortKey(b);

    const cmp = keyA.localeCompare(keyB);
    if (cmp !== 0) {
      return sortOrder === 'asc' ? cmp : -cmp;
    }

    return (a.title || '').localeCompare(b.title || '');
  });

  // 인쇄용 하단 합계 및 사내/사외 구분별 집계 산출
  const totalHeadcount = sortedPlans.reduce(
    (sum, p) => sum + (Number(p.headcount) || 1),
    0
  );
  const totalHours = sortedPlans.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
  const totalCost = sortedPlans.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);

  const printCategorySummary = (['사내', '사외'] as const).map((category) => {
    const items = sortedPlans.filter((p) => p.category === category);
    return {
      category,
      count: items.length,
      headcount: items.reduce((sum, p) => sum + (Number(p.headcount) || 1), 0),
      hours: items.reduce((sum, p) => sum + (Number(p.hours) || 0), 0),
      cost: items.reduce((sum, p) => sum + (Number(p.cost) || 0), 0),
    };
  });

  const handlePrintList = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeWarning(true);
    } else {
      const styleId = 'dynamic-landscape-print-style-plans';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
      }
      styleEl.innerHTML = `
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 10mm !important;
          }
          header, footer, nav, button, form, .no-print, .modal, [role="dialog"] {
            display: none !important;
          }
          body > *:not(#root) {
            display: none !important;
          }
          html, body, #root, main, .mt-4 {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            min-height: 0 !important;
          }
          #printable-plan-table-container {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            overflow: visible !important;
          }
          #printable-plan-table-container table:not(.approval-table) {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          #printable-plan-table-container table:not(.approval-table) th {
            background-color: #f1f5f9 !important;
            color: #1e293b !important;
            font-weight: 700 !important;
            border: 1px solid #94a3b8 !important;
            padding: 6px 4px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-plan-table-container table:not(.approval-table) td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 4px !important;
            font-size: 10px !important;
            word-break: break-all !important;
            line-height: 1.25 !important;
            color: #000000 !important;
          }
          /* 인쇄 시 표시되는 8개 칼럼 폭 100% 최적화 */
          #printable-plan-table-container table:not(.approval-table) th:nth-child(1) { width: 4% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(2) { width: 6% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(3) { width: 29% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(4) { width: 21% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(5) { width: 10% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(6) { width: 11% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(7) { width: 9% !important; }
          #printable-plan-table-container table:not(.approval-table) th:nth-child(8) { width: 10% !important; }

          /* 결재방 규격 고정 */
          #printable-plan-table-container table.approval-table {
            width: 48mm !important;
            height: 18mm !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-left: auto !important;
            margin-right: 0 !important;
          }
          #printable-plan-table-container table.approval-table td {
            text-align: center !important;
            vertical-align: middle !important;
            padding: 2px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            border: 1px solid #000000 !important;
          }

          /* 하단 구분별 집계 카드 스타일 */
          #printable-plan-table-container .plan-print-summary {
            display: block !important;
            margin-top: 6mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-plan-table-container .plan-summary-heading {
            font-size: 11px;
            font-weight: 800;
            margin: 0 0 3mm;
            letter-spacing: .04em;
          }
          #printable-plan-table-container .plan-summary-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 5mm;
          }
          #printable-plan-table-container .plan-summary-card {
            border: 1px solid #cbd5e1;
            border-top: 3px solid #2563eb;
            border-radius: 8px;
            padding: 3mm 4mm;
            background: #f8fafc;
            min-width: 0;
          }
          #printable-plan-table-container .plan-summary-card.external {
            border-top-color: #059669;
          }
          #printable-plan-table-container .plan-summary-title {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 3mm;
          }
          #printable-plan-table-container .plan-summary-title strong {
            font-size: 12px;
            color: #1d4ed8;
          }
          #printable-plan-table-container .external .plan-summary-title strong {
            color: #047857;
          }
          #printable-plan-table-container .plan-summary-title span {
            font-size: 10px;
            color: #475569;
          }
          #printable-plan-table-container .plan-summary-metrics {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1.4fr;
            gap: 3mm;
            margin: 0;
          }
          #printable-plan-table-container .plan-summary-metric dt {
            font-size: 9px;
            color: #64748b;
            margin-bottom: 1mm;
          }
          #printable-plan-table-container .plan-summary-metric dd {
            margin: 0;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -.03em;
            white-space: nowrap;
          }
          #printable-plan-table-container .plan-summary-metric dd small {
            font-size: 10px;
            font-weight: 500;
            margin-left: 1mm;
          }
        }
      `;
      if (!document.getElementById(styleId)) {
        document.head.appendChild(styleEl);
      }

      try {
        window.print();
      } catch (err) {
        setShowPrintIframeWarning(true);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="교육명, 기관, 강사명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            />
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 items-center">
            {(['전체', '사내', '사외'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
            총 {sortedPlans.length}건
          </div>
          <button
            type="button"
            onClick={handlePrintList}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>교육 계획 목록 출력</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div
        id="printable-plan-table-container"
        className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden print:rounded-none print:border-none"
      >
        {/* 💡 인쇄 전용 상단 헤더 (연도 표시 타이틀 + 결재란) */}
        <div className="hidden print:block mb-5 w-full">
          <div className="flex justify-between items-end pb-2.5">
            <h1 className="text-lg font-black text-slate-900 self-end mb-2">
              대성스틸 {selectedYear}년도 연간 교육 계획 현황
            </h1>
            <div className="ml-auto">
              <table
                className="approval-table border-collapse border border-black text-center"
                style={{
                  width: '48mm',
                  height: '18mm',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  marginLeft: 'auto',
                  marginRight: '0',
                  border: '1px solid black',
                }}
              >
                <colgroup>
                  <col style={{ width: '6mm' }} />
                  <col style={{ width: '14mm' }} />
                  <col style={{ width: '14mm' }} />
                  <col style={{ width: '14mm' }} />
                </colgroup>
                <tbody>
                  <tr className="border-b border-black">
                    <td
                      rowSpan={2}
                      className="border-r border-black font-bold p-0.5 bg-gray-100 text-[10px] text-center"
                      style={{
                        borderRight: '1px solid black',
                        width: '6mm',
                        padding: '2px',
                        backgroundColor: '#f3f4f6',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        lineHeight: '1.2',
                      }}
                    >
                      결<br />재
                    </td>
                    <td
                      className="border-r border-black font-bold p-0.5 bg-gray-50 text-[10px] text-center"
                      style={{
                        borderRight: '1px solid black',
                        width: '14mm',
                        padding: '2px',
                        backgroundColor: '#f9fafb',
                        fontSize: '10px',
                        lineHeight: '1.2',
                      }}
                    >
                      작성
                    </td>
                    <td
                      className="border-r border-black font-bold p-0.5 bg-gray-50 text-[10px] text-center"
                      style={{
                        borderRight: '1px solid black',
                        width: '14mm',
                        padding: '2px',
                        backgroundColor: '#f9fafb',
                        fontSize: '10px',
                        lineHeight: '1.2',
                      }}
                    >
                      검토
                    </td>
                    <td
                      className="font-bold p-0.5 bg-gray-50 text-[10px] text-center"
                      style={{
                        width: '14mm',
                        padding: '2px',
                        backgroundColor: '#f9fafb',
                        fontSize: '10px',
                        lineHeight: '1.2',
                      }}
                    >
                      승인
                    </td>
                  </tr>
                  <tr style={{ height: '12mm' }}>
                    <td
                      className="border-r border-black"
                      style={{ borderRight: '1px solid black', height: '12mm' }}
                    ></td>
                    <td
                      className="border-r border-black"
                      style={{ borderRight: '1px solid black', height: '12mm' }}
                    ></td>
                    <td style={{ height: '12mm' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto bg-white">
          <table className="w-full min-w-[950px] print:min-w-0 table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="border-y border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider bg-slate-50/80">
                <th style={{ width: '4%' }} className="py-3.5 px-2 text-center">
                  NO
                </th>
                <th style={{ width: '6%' }} className="py-3.5 px-2 text-center">
                  구분
                </th>
                <th style={{ width: '22%' }} className="py-3.5 px-3">
                  교육명
                </th>
                <th style={{ width: '17%' }} className="py-3.5 px-3">
                  교육기관 / 강사
                </th>
                <th style={{ width: '10%' }} className="py-3.5 px-2">
                  대상자
                </th>
                <th style={{ width: '13%' }} className="py-3.5 px-2">
                  {/* 화면에서는 정렬 버튼, 인쇄 시에는 button 숨김 규칙에 영향받지 않도록 span 텍스트 표시 */}
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                    }
                    className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer uppercase font-bold no-print"
                    title="클릭하여 교육 시작일 기준 오름차순/내림차순 정렬"
                  >
                    <span>교육일정</span>
                    <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                  </button>
                  <span className="hidden print:inline">교육일정</span>
                </th>
                <th style={{ width: '10%' }} className="py-3.5 px-2 text-center">
                  교육시간
                </th>
                <th style={{ width: '9%' }} className="py-3.5 px-3 text-right">
                  예상비용
                </th>
                <th style={{ width: '5%' }} className="py-3.5 px-1 text-center no-print">
                  기안
                </th>
                <th style={{ width: '5%' }} className="py-3.5 px-1 text-center no-print">
                  보고서
                </th>
                <th style={{ width: '7%' }} className="py-3.5 px-2 text-center no-print">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sortedPlans.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-gray-400 font-medium">
                    {plans.length === 0
                      ? `${selectedYear}년도에 등록된 연간 교육 계획이 없습니다. 상단 [신규 계획 추가] 버튼을 눌러 등록해 주세요.`
                      : '검색 조건에 부합하는 교육 계획이 없습니다.'}
                  </td>
                </tr>
              ) : (
                <>
                  {sortedPlans.map((plan, index) => {
                    const hasDraft = drafts.some(
                      (d) => String(d.plan_id || '').trim() === String(plan.id || '').trim()
                    );
                    const hasReport = reports.some(
                      (r) =>
                        String(r.plan_id || r.planId || '').trim() ===
                        String(plan.id || '').trim()
                    );

                    return (
                      <tr key={plan.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="py-4 px-2 text-center font-mono font-bold text-gray-500">
                          {index + 1}
                        </td>
                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              plan.category === '사내'
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {plan.category}
                          </span>
                        </td>
                        <td
                          className="py-4 px-3 font-bold text-gray-800 break-all whitespace-normal leading-snug"
                          title={plan.title}
                        >
                          {plan.title}
                        </td>
                        <td className="py-4 px-3 text-gray-600">
                          <div className="font-semibold text-gray-800 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0 no-print" />
                            <span className="truncate">{plan.institution}</span>
                          </div>
                          {plan.instructor && (
                            <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-300 shrink-0 no-print" />
                              <span className="truncate">{plan.instructor}</span>
                            </div>
                          )}
                        </td>
                        <td
                          className="py-4 px-2 font-medium truncate"
                          title={`${plan.target || '-'} (${plan.headcount || 1}명)`}
                        >
                          <span className="text-gray-700 font-semibold">
                            {plan.target || '-'}
                          </span>
                          <span className="text-gray-400 text-[11px] block sm:inline">
                            {' '}
                            ({plan.headcount || 1}명)
                          </span>
                        </td>
                        <td className="py-4 px-2 text-gray-600 font-medium whitespace-normal break-all">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0 no-print" />
                            <span>{plan.schedule || '-'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center font-medium text-gray-600">
                          <div className="inline-flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0 no-print" />
                            <span>{plan.hours}시간</span>
                          </div>
                          {plan.time_range && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              ({plan.time_range})
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-bold text-gray-700">
                          {formatCurrency(plan.cost)}
                        </td>
                        <td className="py-4 px-1 text-center no-print">
                          <button
                            type="button"
                            onClick={() => onStartDraft(plan)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              hasDraft
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                            }`}
                          >
                            {hasDraft ? '완료' : '작성'}
                          </button>
                        </td>
                        <td className="py-4 px-1 text-center no-print">
                          <button
                            type="button"
                            onClick={() => onStartReport(plan)}
                            disabled={!hasDraft}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                              !hasDraft
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
                                : hasDraft && hasReport
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs cursor-pointer'
                            }`}
                            title={!hasDraft ? '기안서 작성이 먼저 완료되어야 합니다.' : ''}
                          >
                            {hasReport ? '완료' : '작성'}
                          </button>
                        </td>
                        <td className="py-4 px-2 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEdit(plan)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const originalIdx = plans.findIndex((p) => p.id === plan.id);
                                setDeleteTargetIndex(originalIdx);
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* 최하단 종합 합계 행 */}
                  <tr className="bg-gray-50/80 font-bold border-t border-gray-200">
                    <td colSpan={3} className="py-3.5 px-2 text-gray-800 text-center font-extrabold">
                      합계
                    </td>
                    <td className="py-3.5 px-3"></td>
                    <td className="py-3.5 px-2 text-gray-800 font-extrabold">
                      {totalHeadcount}명
                    </td>
                    <td className="py-3.5 px-2"></td>
                    <td className="py-3.5 px-2 text-center font-mono text-gray-800 font-extrabold">
                      {totalHours}시간
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-gray-900 font-extrabold">
                      {formatCurrency(totalCost)}
                    </td>
                    <td colSpan={3} className="py-3.5 px-2 no-print"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* 인쇄 전용 구분별 계획 요약 집계 카드 */}
        <section className="hidden print:block plan-print-summary" aria-label="구분별 교육 계획 집계">
          <h2 className="plan-summary-heading">구분별 교육 계획 집계 ({selectedYear}년도)</h2>
          <div className="plan-summary-grid">
            {printCategorySummary.map((item) => (
              <article
                key={item.category}
                className={'plan-summary-card ' + (item.category === '사외' ? 'external' : '')}
              >
                <div className="plan-summary-title">
                  <strong>{item.category} 교육</strong>
                  <span>계획 수립 {item.count.toLocaleString('ko-KR')}건</span>
                </div>
                <dl className="plan-summary-metrics">
                  <div className="plan-summary-metric">
                    <dt>계획 인원</dt>
                    <dd>
                      {item.headcount.toLocaleString('ko-KR')}
                      <small>명</small>
                    </dd>
                  </div>
                  <div className="plan-summary-metric">
                    <dt>계획 시간</dt>
                    <dd>
                      {item.hours.toLocaleString('ko-KR')}
                      <small>시간</small>
                    </dd>
                  </div>
                  <div className="plan-summary-metric">
                    <dt>예상 비용</dt>
                    <dd>
                      {item.cost.toLocaleString('ko-KR')}
                      <small>원</small>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* 인쇄 전용 푸터 - 출력일자 */}
        <div className="hidden print:block text-right mt-4">
          <span className="text-xs text-slate-500 font-mono font-bold">
            출력일자:{' '}
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetIndex !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">교육 계획을 삭제하시겠습니까?</h4>
                <p className="text-xs text-gray-400 mt-1">구글 스프레드시트에서도 즉시 삭제됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetIndex(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  아니요
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deleteTargetIndex);
                    setDeleteTargetIndex(null);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 cursor-pointer shadow-xs"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Iframe Print Sandbox Warning Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-gray-800">보안 및 브라우저 환경 안내</h4>
                <p className="text-xs text-gray-500 leading-relaxed text-left bg-gray-50 p-3.5 rounded-xl border border-gray-150">
                  현재 AI Studio 미리보기(Iframe Sandbox) 내부에서는 보안 규정으로 인해 인쇄 창을 직접 열 수 없습니다.<br /><br />
                  출력을 정상 진행하려면 우측 상단의 <span className="font-semibold text-indigo-600">[새 창에서 열기 (Open in new tab)]</span>를 클릭하여 새 탭에서 접속해 주십시오.
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
