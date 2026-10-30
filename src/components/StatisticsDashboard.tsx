/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency, getSatisfactionLabel } from '../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Award,
  Clock,
  Star,
  TrendingUp,
  Printer,
  Check,
  AlertCircle,
  Users,
  Search,
  CheckCircle2,
  ClipboardCheck,
  Wallet,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatisticsDashboardProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  reports: EducationReport[];
  selectedYear?: string;
}

// Utility to parse trainee count from target_group string
function parseTraineeCount(targetGroup: string): number {
  if (!targetGroup) return 1;
  const regex = /(\d+)\s*(명|인|명\s*참석|명\s*대상)/;
  const match = targetGroup.match(regex);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }
  const numMatch = targetGroup.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (!isNaN(num) && num > 0 && num < 1000) return num;
  }
  if (
    targetGroup.includes('전사') ||
    targetGroup.includes('전임직원') ||
    targetGroup.includes('전 임직원')
  ) {
    return 120;
  }
  return 3; // sensible default
}

export default function StatisticsDashboard({
  plans,
  drafts,
  reports,
  selectedYear = String(new Date().getFullYear()),
}: StatisticsDashboardProps) {
  // Filter for completed plans (draft submitted AND report finalized)
  const completedReportsWithDetails = useMemo(() => {
    return reports
      .filter((report) => {
        const reportPlanId = String(report.plan_id || report.planId || '').trim();
        const hasPlan = plans.some((p) => String(p.id || '').trim() === reportPlanId);
        const hasDraft = drafts.some((d) => String(d.plan_id || '').trim() === reportPlanId);
        return hasPlan && hasDraft;
      })
      .map((report) => {
        const reportPlanId = String(report.plan_id || report.planId || '').trim();
        const plan = plans.find((p) => String(p.id || '').trim() === reportPlanId)!;
        const draft = drafts.find((d) => String(d.plan_id || '').trim() === reportPlanId)!;
        return { report, plan, draft };
      });
  }, [plans, drafts, reports]);

  const inHouseItems = completedReportsWithDetails.filter(
    (item) => item.plan.category === '사내'
  );
  const externalItems = completedReportsWithDetails.filter(
    (item) => item.plan.category === '사외'
  );

  // Calculate KPIs
  const totalCount = completedReportsWithDetails.length;
  const inHouseCount = inHouseItems.length;
  const externalCount = externalItems.length;

  const getHeadcount = (plan: EducationPlan) =>
    plan.headcount !== undefined ? Number(plan.headcount) : parseTraineeCount(plan.target);

  const totalHeadcount = completedReportsWithDetails.reduce(
    (sum, item) => sum + getHeadcount(item.plan),
    0
  );
  const inHouseHeadcount = inHouseItems.reduce(
    (sum, item) => sum + getHeadcount(item.plan),
    0
  );
  const externalHeadcount = externalItems.reduce(
    (sum, item) => sum + getHeadcount(item.plan),
    0
  );

  const totalCost = completedReportsWithDetails.reduce(
    (sum, item) => sum + (Number(item.plan.cost) || 0),
    0
  );
  const inHouseCost = inHouseItems.reduce(
    (sum, item) => sum + (Number(item.plan.cost) || 0),
    0
  );
  const externalCost = externalItems.reduce(
    (sum, item) => sum + (Number(item.plan.cost) || 0),
    0
  );

  const totalHours = completedReportsWithDetails.reduce(
    (sum, item) => sum + (Number(item.plan.hours) || 0),
    0
  );
  const inHouseHours = inHouseItems.reduce(
    (sum, item) => sum + (Number(item.plan.hours) || 0),
    0
  );
  const externalHours = externalItems.reduce(
    (sum, item) => sum + (Number(item.plan.hours) || 0),
    0
  );

  const getScore = (r: EducationReport) =>
    Number(r.satisfaction_score ?? r.satisfactionScore ?? 5.0);

  const avgSatisfaction =
    totalCount > 0
      ? completedReportsWithDetails.reduce((sum, item) => sum + getScore(item.report), 0) /
        totalCount
      : 0.0;

  const inHouseAvgSatisfaction =
    inHouseCount > 0
      ? inHouseItems.reduce((sum, item) => sum + getScore(item.report), 0) / inHouseCount
      : 0.0;

  const externalAvgSatisfaction =
    externalCount > 0
      ? externalItems.reduce((sum, item) => sum + getScore(item.report), 0) / externalCount
      : 0.0;

  // 계획 전체 대비 달성 지표
  const plannedTotalHeadcount = plans.reduce((sum, p) => sum + getHeadcount(p), 0);
  const plannedTotalHours = plans.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
  const plannedTotalCost = plans.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const draftedCount = plans.filter((p) =>
    drafts.some((d) => String(d.plan_id || '').trim() === String(p.id || '').trim())
  ).length;
  const completionRate = plans.length > 0 ? Math.round((totalCount / plans.length) * 100) : 0;
  const draftRate = plans.length > 0 ? Math.round((draftedCount / plans.length) * 100) : 0;
  const budgetExecutionRate =
    plannedTotalCost > 0 ? Math.round((totalCost / plannedTotalCost) * 100) : 0;
  const hoursExecutionRate =
    plannedTotalHours > 0 ? Math.round((totalHours / plannedTotalHours) * 100) : 0;

  // Chart Data: Monthly plan and completed trainee count & budget
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthName = `${monthNum}월`;

      const monthlyPlans = plans.filter((p) => {
        const dateStr = (p.date || '').split('T')[0];
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        return parts.length >= 2 && parseInt(parts[1], 10) === monthNum;
      });
      const plannedTrainees = monthlyPlans.reduce((sum, p) => sum + getHeadcount(p), 0);
      const plannedBudgetMan = Math.round(
        monthlyPlans.reduce((sum, p) => sum + (Number(p.cost) || 0), 0) / 10000
      );

      const monthItems = completedReportsWithDetails.filter((item) => {
        const dateStr = (item.plan.date || item.report.report_date || '').split('T')[0];
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        return parts.length >= 2 && parseInt(parts[1], 10) === monthNum;
      });
      const completedTrainees = monthItems.reduce((sum, item) => sum + getHeadcount(item.plan), 0);
      const executedBudgetMan = Math.round(
        monthItems.reduce((sum, item) => sum + (Number(item.plan.cost) || 0), 0) / 10000
      );

      return {
        name: monthName,
        '교육 계획 (명)': plannedTrainees,
        '교육 완료 (명)': completedTrainees,
        계획예산만원: plannedBudgetMan,
        집행비용만원: executedBudgetMan,
      };
    });
  }, [plans, completedReportsWithDetails]);

  const [showPrintIframeWarning, setShowPrintIframeWarning] = React.useState(false);

  // States for search and category filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<'전체' | '사내' | '사외'>('전체');

  // 하단 교육 실적 테이블만 A4 가로(Landscape)로 출력하는 함수
  const handlePrintList = () => {
    const portraitStyleEl = document.getElementById('dynamic-portrait-print-style');
    if (portraitStyleEl) {
      portraitStyleEl.remove();
    }

    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeWarning(true);
    } else {
      const styleId = 'dynamic-landscape-print-style-reports';
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
          header, footer, nav, button, form, .no-print, .stats-chart-card, .stats-filter-section, .modal, [role="dialog"] {
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
          #printable-area.print-report-table-container {
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
          #printable-area.print-report-table-container table:not(.approval-table) {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          #printable-area.print-report-table-container table:not(.approval-table) th {
            background-color: #f1f5f9 !important;
            color: #1e293b !important;
            font-weight: 700 !important;
            border: 1px solid #94a3b8 !important;
            padding: 6px 4px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-area.print-report-table-container table:not(.approval-table) td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 4px !important;
            font-size: 10px !important;
            word-break: break-all !important;
            line-height: 1.3 !important;
            color: #000000 !important;
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

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08,
      },
    },
  };

  // Filter list by searchQuery and categoryFilter
  const filteredReports = completedReportsWithDetails.filter(({ report, plan }) => {
    const query = searchQuery.toLowerCase();
    const associatedPlan = plans.find(
      (p) => String(p.id || '').trim() === String(report.plan_id || report.planId || '').trim()
    );
    const planTitle = associatedPlan ? associatedPlan.title.toLowerCase() : plan.title.toLowerCase();
    const reportNo = report.id ? report.id.toLowerCase() : '';
    const drafterName = (report.drafter_name || report.drafterName || '').toLowerCase();
    const department = (report.department || '').toLowerCase();

    const matchesSearch =
      planTitle.includes(query) ||
      reportNo.includes(query) ||
      drafterName.includes(query) ||
      department.includes(query);

    const matchesCategory =
      categoryFilter === '전체' ||
      (associatedPlan ? associatedPlan.category : plan.category) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // 인쇄물 하단 집계 요약 데이터
  const printCategorySummary = (['사내', '사외'] as const).map((category) => {
    const items = filteredReports.filter(({ plan }) => plan.category === category);
    return {
      category,
      count: items.length,
      headcount: items.reduce((sum, { plan }) => sum + (getHeadcount(plan) || 0), 0),
      hours: items.reduce((sum, { plan }) => sum + (Number(plan.hours) || 0), 0),
      cost: items.reduce((sum, { plan }) => sum + (Number(plan.cost) || 0), 0),
    };
  });

  const filteredHeadcount = filteredReports.reduce(
    (sum, item) => sum + getHeadcount(item.plan),
    0
  );
  const filteredCost = filteredReports.reduce(
    (sum, item) => sum + (Number(item.plan.cost) || 0),
    0
  );
  const filteredHours = filteredReports.reduce(
    (sum, item) => sum + (Number(item.plan.hours) || 0),
    0
  );
  const filteredAvgSatisfaction =
    filteredReports.length > 0
      ? filteredReports.reduce((sum, item) => sum + getScore(item.report), 0) /
        filteredReports.length
      : 0.0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <style>{`
        .stats-print-summary { display: none; }
        @media print {
          .stats-chart-card, .stats-filter-section, .no-print, header, nav, aside, footer, button { 
            display: none !important; 
          }
          ::-webkit-scrollbar { display: none !important; }

          html, body, #root, main {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          #printable-area.print-stats-table-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }

          #printable-area.print-stats-table-container table:not(.approval-table) {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 10.5px !important;
          }

          #printable-area.print-stats-table-container table:not(.approval-table) td,
          #printable-area.print-stats-table-container table:not(.approval-table) th {
            word-break: break-all !important;
            overflow-wrap: break-word !important;
            padding: 6px 4px !important;
          }

          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(1) { width: 3.5% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(2) { width: 5% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(3) { width: 14% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(4) { width: 28% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(5) { width: 9% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(6) { width: 10% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(7) { width: 7.5% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(8) { width: 9% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(9) { width: 7% !important; }
          #printable-area.print-stats-table-container table:not(.approval-table) th:nth-child(10) { width: 7% !important; }

          #printable-area table.approval-table {
            width: 48mm !important;
            height: 18mm !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-left: auto !important;
            margin-right: 0 !important;
          }

          #printable-area table.approval-table td {
            text-align: center !important;
            vertical-align: middle !important;
            padding: 2px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            overflow: hidden !important;
          }

          #printable-area .stats-print-summary {
            display: block !important;
            margin-top: 6mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stats-summary-heading { font-size: 11px; font-weight: 800; margin: 0 0 3mm; letter-spacing: .04em; }
          #printable-area .stats-summary-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 5mm; }
          .stats-summary-card { border: 1px solid #cbd5e1; border-top: 3px solid #2563eb; border-radius: 8px; padding: 3mm 4mm; background: #f8fafc; min-width: 0; }
          .stats-summary-card.external { border-top-color: #059669; }
          #printable-area .stats-summary-title { display: flex !important; align-items: center; justify-content: space-between; margin-bottom: 3mm; }
          .stats-summary-title strong { font-size: 12px; color: #1d4ed8; }
          .external .stats-summary-title strong { color: #047857; }
          .stats-summary-title span { font-size: 10px; color: #475569; }
          .stats-summary-metrics { display: grid !important; grid-template-columns: 1fr 1fr 1.4fr; gap: 3mm; margin: 0; }
          .stats-summary-metric { min-width: 0; }
          .stats-summary-metric dt { font-size: 9px; color: #64748b; margin-bottom: 1mm; }
          .stats-summary-metric dd { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.03em; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .stats-summary-metric dd small { font-size: 10px; font-weight: 500; margin-left: 1mm; }
          .stats-summary-note { font-size: 8px; color: #64748b; margin: 2mm 0 0; }
        }
      `}</style>

      {/* =====================================================================
          상단 대시보드 영역 (인쇄 시 완벽 제외)
      ===================================================================== */}
      <div className="no-print stats-chart-card space-y-6">
        {/* 1. 상단 배너 */}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-bold">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{selectedYear}년도 실적 마감 대시보드</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                교육실적 통계 및 이수율 분석
              </h2>
              <p className="text-xs text-indigo-200/80">
                기안 및 보고 마감이 완료된 최종 수행 실적 데이터입니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 shrink-0">
              <div className="px-3 border-r border-white/10">
                <p className="text-[11px] text-indigo-200 font-semibold">① 연간 계획</p>
                <p className="text-xl font-black mt-0.5">{plans.length}건</p>
                <p className="text-[10px] text-indigo-300 mt-0.5">
                  총 {plannedTotalHeadcount}명 계획
                </p>
              </div>
              <div className="px-3 border-r border-white/10">
                <p className="text-[11px] text-indigo-200 font-semibold">② 기안 완료</p>
                <p className="text-xl font-black text-sky-300 mt-0.5">
                  {draftedCount}건
                  <span className="text-xs font-bold text-sky-200/80 ml-1">({draftRate}%)</span>
                </p>
                <p className="text-[10px] text-indigo-300 mt-0.5">
                  미기안 {Math.max(0, plans.length - draftedCount)}건
                </p>
              </div>
              <div className="px-3">
                <p className="text-[11px] text-indigo-200 font-semibold">③ 결과보고 마감</p>
                <p className="text-xl font-black text-emerald-300 mt-0.5">
                  {totalCount}건
                  <span className="text-xs font-bold text-emerald-200/80 ml-1">
                    ({completionRate}%)
                  </span>
                </p>
                <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                  미마감 잔여 {Math.max(0, plans.length - totalCount)}건
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-indigo-200">연간 계획 대비 최종 결과보고서 마감 진행률</span>
              <span className="text-emerald-300">{completionRate}% 달성</span>
            </div>
            <div className="w-full h-2.5 bg-indigo-950/80 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                style={{ width: `${completionRate}%` }}
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-700"
              />
            </div>
          </div>
        </div>

        {/* 2. 5대 실적 핵심 KPI 카드 (전 항목 사내/사외 2줄 대칭 표기로 100% 통일) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 카드 1: 완료 실적 건수 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400">완료 실적 건수</p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{totalCount}</span>
                  <span className="text-xs font-bold text-slate-400">/ {plans.length}건</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>사내
                </span>
                <span className="text-slate-700 font-bold">{inHouseCount}건</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>사외
                </span>
                <span className="text-slate-700 font-bold">{externalCount}건</span>
              </div>
            </div>
          </div>

          {/* 카드 2: 총 교육 인원 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400">총 교육 인원</p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{totalHeadcount}</span>
                  <span className="text-xs font-bold text-slate-400">
                    / {plannedTotalHeadcount}명
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>사내
                </span>
                <span className="text-slate-700 font-bold">{inHouseHeadcount}명</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>사외
                </span>
                <span className="text-slate-700 font-bold">{externalHeadcount}명</span>
              </div>
            </div>
          </div>

          {/* 카드 3: 누적 교육 시간 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400">누적 교육 시간</p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{totalHours}</span>
                  <span className="text-xs font-bold text-slate-400">
                    시간 ({hoursExecutionRate}%)
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>사내
                </span>
                <span className="text-slate-700 font-bold">{inHouseHours}시간</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>사외
                </span>
                <span className="text-slate-700 font-bold">{externalHours}시간</span>
              </div>
            </div>
          </div>

          {/* 카드 4: 실제 집행 비용 (사내/사외 모두 대칭 표기) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-400">
                  실제 집행 비용 ({budgetExecutionRate}%)
                </p>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    ₩{formatCurrency(totalCost)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>사내
                </span>
                <span className="text-slate-700 font-bold">₩{formatCurrency(inHouseCost)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>사외
                </span>
                <span className="text-slate-700 font-bold">₩{formatCurrency(externalCost)}</span>
              </div>
            </div>
          </div>

          {/* 카드 5: 평균 교육 만족도 (사내 평균 / 사외 평균 모두 대칭 표기) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400">평균 교육 만족도</p>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">
                    {avgSatisfaction > 0 ? avgSatisfaction.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    / 5.0 ({avgSatisfaction > 0 ? getSatisfactionLabel(avgSatisfaction) : '-'})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Star className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>사내 평균
                </span>
                <span className="text-slate-700 font-bold">
                  {inHouseCount > 0 ? `${inHouseAvgSatisfaction.toFixed(1)}점` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>사외 평균
                </span>
                <span className="text-slate-700 font-bold">
                  {externalCount > 0 ? `${externalAvgSatisfaction.toFixed(1)}점` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 중단 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
                  월별 교육 계획 및 완료 인원 추이
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  해당 월의 수립된 교육 계획 인원(명) 대비 실제 교육 완료 인원(명)
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block"></span> 계획 인원
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block"></span> 완료 인원
                </span>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    unit="명"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    formatter={(value: any, name: string) => [`${value}명`, name]}
                  />
                  <Bar dataKey="교육 계획 (명)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="교육 완료 (명)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-4.5 h-4.5 text-emerald-600" />
                  월별 계획 예산 대비 실집행 비용 추이
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  해당 월의 계획 예산(막대)과 결과보고가 완료된 실집행 비용(선)을 비교합니다.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 inline-block"></span> 계획 예산
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-600 inline-block"></span> 실집행액
                </span>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    unit="만"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    formatter={(value: any, name: string) => [
                      `₩${formatCurrency(Number(value) * 10000)}`,
                      name === '계획예산만원' ? '계획 예산' : '실집행 비용',
                    ]}
                  />
                  <Bar dataKey="계획예산만원" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line
                    type="monotone"
                    dataKey="집행비용만원"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#059669', strokeWidth: 1.5, stroke: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          하단 교육 실적 목록 섹션 (연간 교육 계획 목록 UI 스타일 100% 통일)
      ===================================================================== */}
      <div className="space-y-4">
        <div className="flex justify-between items-center no-print">
          <div>
            <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-indigo-500" />
              <span>교육 실적 목록 (이수 완료)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              기안 및 결과보고 제출이 100% 완료된 실적 상세 현황입니다.
            </p>
          </div>
        </div>

        <div
          id="printable-area"
          className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden print-report-table-container print-stats-table-container"
        >
          {/* 인쇄 전용 헤더 및 결재방 */}
          <div className="hidden print:block mb-6 w-full">
            <div className="flex justify-between items-end pb-2.5">
              <h1 className="text-lg font-black text-slate-900 self-end mb-2">
                대성스틸 연간 교육 실적 현황
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

          {/* 상단 검색 및 필터 바 */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center px-6 py-5 border-b border-gray-100 bg-white no-print stats-filter-section">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="교육명, 보고서번호, 부서, 보고자 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                />
              </div>

              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 items-center">
                {(['전체', '사내', '사외'] as const).map((cat) => (
                  <button
                    key={cat}
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
                총 {filteredReports.length}건 완료
              </div>
              <button
                onClick={handlePrintList}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>교육 실적 목록 출력</span>
              </button>
            </div>
          </div>

          {/* 10개 칼럼 실적 상세 테이블 */}
          <div className="w-full overflow-x-auto bg-white">
            <table className="w-full min-w-[900px] print:min-w-0 table-fixed text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/40">
                  <th style={{ width: '4%' }} className="py-3.5 px-2 text-center">
                    NO
                  </th>
                  <th style={{ width: '6%' }} className="py-3.5 px-2 text-center">
                    구분
                  </th>
                  <th style={{ width: '14%' }} className="py-3.5 px-3">
                    보고서번호
                  </th>
                  <th style={{ width: '26%' }} className="py-3.5 px-3 min-w-[200px]">
                    교육명
                  </th>
                  <th style={{ width: '10%' }} className="py-3.5 px-2">
                    교육대상자
                  </th>
                  <th style={{ width: '11%' }} className="py-3.5 px-2">
                    교육일정
                  </th>
                  <th style={{ width: '8%' }} className="py-3.5 px-2 text-center">
                    교육시간
                  </th>
                  <th style={{ width: '9%' }} className="py-3.5 px-3 text-right">
                    실집행비용
                  </th>
                  <th style={{ width: '5%' }} className="py-3.5 px-1 text-center">
                    만족도
                  </th>
                  <th style={{ width: '7%' }} className="py-3.5 px-2 text-center">
                    교육증빙
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center text-gray-400 font-medium">
                      {completedReportsWithDetails.length === 0
                        ? '완료된 교육 실적이 없습니다. (기안 및 결과보고서 완료 필요)'
                        : '검색 조건에 부합하는 교육 실적이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredReports.map(({ report, plan }, index) => {
                      const associatedPlan = plans.find(
                        (p) =>
                          String(p.id || '').trim() ===
                          String(report.plan_id || report.planId || '').trim()
                      );
                      const targetText = associatedPlan
                        ? associatedPlan.target
                        : report.target || '-';
                      const headcountValue = associatedPlan
                        ? getHeadcount(associatedPlan)
                        : report.target
                        ? parseTraineeCount(report.target)
                        : 0;
                      const hasCert = Boolean(report.certificate_file || report.certificateFile);
                      const score = getScore(report);

                      return (
                        <tr
                          key={report.id}
                          className="hover:bg-indigo-50/20 transition-colors group"
                        >
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
                              {plan.category || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-3 font-mono text-[11px] font-bold text-gray-600 truncate">
                            {report.id}
                          </td>
                          <td
                            className="py-4 px-3 font-bold text-gray-800 break-all whitespace-normal leading-snug"
                            title={plan.title}
                          >
                            {plan.title}
                          </td>
                          <td
                            className="py-4 px-2 font-medium truncate"
                            title={`${targetText} (${headcountValue}명)`}
                          >
                            <span className="text-gray-700 font-semibold">{targetText}</span>{' '}
                            {headcountValue > 0 && (
                              <span className="text-gray-400 text-[11px]">
                                ({headcountValue}명)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-2 text-gray-600 font-medium whitespace-normal break-all">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0 no-print" />
                              <span>{plan.schedule}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center font-medium text-gray-600">
                            <div className="inline-flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0 no-print" />
                              <span>{plan.hours}시간</span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-gray-700">
                            {formatCurrency(plan.cost)}
                          </td>
                          <td className="py-4 px-1 text-center font-bold text-indigo-600">
                            {score.toFixed(1)}
                          </td>
                          <td className="py-4 px-2 text-center">
                            {hasCert ? (
                              <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                첨부 완료
                              </span>
                            ) : (
                              <span className="text-gray-300 font-bold">-</span>
                            )}
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
                        {filteredHeadcount}명
                      </td>
                      <td className="py-3.5 px-2"></td>
                      <td className="py-3.5 px-2 text-center font-mono text-gray-800 font-extrabold">
                        {filteredHours}시간
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-gray-900 font-extrabold">
                        {formatCurrency(filteredCost)}
                      </td>
                      <td className="py-3.5 px-1 text-center font-extrabold text-indigo-600">
                        {filteredAvgSatisfaction.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-2 text-center text-gray-400">-</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* 인쇄 전용 구분별 요약 집계 카드 */}
          <section className="stats-print-summary" aria-label="구분별 교육 실적 집계">
            <h2 className="stats-summary-heading">구분별 교육 실적 집계</h2>
            <div className="stats-summary-grid">
              {printCategorySummary.map((item) => (
                <article
                  key={item.category}
                  className={'stats-summary-card ' + (item.category === '사외' ? 'external' : '')}
                >
                  <div className="stats-summary-title">
                    <strong>{item.category} 교육</strong>
                    <span>이수 완료 {item.count.toLocaleString('ko-KR')}건</span>
                  </div>
                  <dl className="stats-summary-metrics">
                    <div className="stats-summary-metric">
                      <dt>교육 인원</dt>
                      <dd>
                        {item.headcount.toLocaleString('ko-KR')}
                        <small>명</small>
                      </dd>
                    </div>
                    <div className="stats-summary-metric">
                      <dt>교육 시간</dt>
                      <dd>
                        {item.hours.toLocaleString('ko-KR')}
                        <small>시간</small>
                      </dd>
                    </div>
                    <div className="stats-summary-metric">
                      <dt>교육 비용</dt>
                      <dd>
                        {item.cost.toLocaleString('ko-KR')}
                        <small>원</small>
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <p className="stats-summary-note">
              현재 출력 목록 기준 · 인원은 교육별 참여 인원 누계 · 시간과 비용은 연결된 교육계획의 등록값 기준
            </p>
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
      </div>

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
                  현재 AI Studio 미리보기(Iframe Sandbox) 내부에서는 보안 규정으로 인해 인쇄 창을 직접 열 수 없습니다.
                  <br />
                  <br />
                  출력을 정상 진행하려면 우측 상단의{' '}
                  <span className="font-semibold text-indigo-600">
                    [새 창에서 열기 (Open in new tab)]
                  </span>
                  를 클릭하여 새 탭에서 접속해 주십시오. 아래 버튼으로 바로 이동하실 수도 있습니다.
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
    </motion.div>
  );
}
