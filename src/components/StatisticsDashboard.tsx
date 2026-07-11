/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency } from '../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Award,
  Clock,
  BookOpen,
  Layers,
  Star,
  TrendingUp,
  PieChart as PieIcon,
  Printer,
  Eye,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatisticsDashboardProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  reports: EducationReport[];
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
  if (targetGroup.includes('전사') || targetGroup.includes('전임직원') || targetGroup.includes('전 임직원')) {
    return 120;
  }
  return 3; // sensible default
}

export default function StatisticsDashboard({ plans, drafts, reports }: StatisticsDashboardProps) {
  // Filter for completed plans (draft submitted AND report finalized)
  const completedReportsWithDetails = reports
    .filter((report) => {
      const hasPlan = plans.some((p) => p.id === report.plan_id);
      const hasDraft = drafts.some((d) => d.plan_id === report.plan_id);
      return hasPlan && hasDraft;
    })
    .map((report) => {
      const plan = plans.find((p) => p.id === report.plan_id)!;
      const draft = drafts.find((d) => d.plan_id === report.plan_id)!;
      return { report, plan, draft };
    });

  // Calculate KPIs
  const totalCount = completedReportsWithDetails.length;
  const inHouseCount = completedReportsWithDetails.filter((item) => item.plan.category === '사내').length;
  const externalCount = completedReportsWithDetails.filter((item) => item.plan.category === '사외').length;

  const totalCost = completedReportsWithDetails.reduce((sum, item) => sum + (item.plan.cost || 0), 0);
  const inHouseCost = completedReportsWithDetails.filter((item) => item.plan.category === '사내').reduce((sum, item) => sum + (item.plan.cost || 0), 0);
  const externalCost = completedReportsWithDetails.filter((item) => item.plan.category === '사외').reduce((sum, item) => sum + (item.plan.cost || 0), 0);

  const totalHours = completedReportsWithDetails.reduce((sum, item) => sum + (item.plan.hours || 0), 0);
  const inHouseHours = completedReportsWithDetails.filter((item) => item.plan.category === '사내').reduce((sum, item) => sum + (item.plan.hours || 0), 0);
  const externalHours = completedReportsWithDetails.filter((item) => item.plan.category === '사외').reduce((sum, item) => sum + (item.plan.hours || 0), 0);

  const avgSatisfaction =
    completedReportsWithDetails.length > 0
      ? completedReportsWithDetails.reduce((sum, item) => sum + (item.report.satisfaction_score || 5.0), 0) /
        completedReportsWithDetails.length
      : 0.0;

  // Chart Data: Donut Ratio
  const costDistributionData = [
    { name: '사내 교육 비용', value: inHouseCost, color: '#3B82F6' }, // Blue
    { name: '사외 교육 비용', value: externalCost, color: '#10B981' }, // Emerald
  ].filter((d) => d.value > 0);

  const hoursDistributionData = [
    { name: '사내 교육 시간', value: inHouseHours, color: '#6366F1' }, // Indigo
    { name: '사외 교육 시간', value: externalHours, color: '#F59E0B' }, // Amber
  ].filter((d) => d.value > 0);

  // Chart Data: Monthly completion count and trainee count
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthName = `${monthNum}월`;
    const monthItems = completedReportsWithDetails.filter((item) => {
      const dateStr = item.plan.date || item.report.report_date;
      if (!dateStr) return false;
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === monthNum;
      }
      return false;
    });

    const count = monthItems.length;
    const trainees = monthItems.reduce((sum, item) => sum + parseTraineeCount(item.plan.target), 0);

    return {
      name: monthName,
      '교육 완료 (건)': count,
      '수료 인원 (명)': trainees,
    };
  });

  // States for preview modal & print sandbox warning
  const [selectedReportDetail, setSelectedReportDetail] = React.useState<{
    report: EducationReport;
    plan: EducationPlan;
    draft: EducationDraft;
  } | null>(null);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = React.useState(false);

  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  };

  const handlePrint = () => {
    // Remove list landscape print styles to prevent conflict
    const listStyleEl = document.getElementById('dynamic-landscape-print-style-reports');
    if (listStyleEl) {
      listStyleEl.remove();
    }
    
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn('Iframe sandbox detected. Showing instructions for secure print.');
      setShowPrintIframeWarning(true);
    } else {
      // Add portrait print rules
      const portraitStyleId = 'dynamic-portrait-print-style';
      let styleEl = document.getElementById(portraitStyleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = portraitStyleId;
        styleEl.innerHTML = `
          @media print {
            @page {
              size: portrait !important;
              margin: 10mm !important;
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

  const handlePrintList = () => {
    // Remove portrait single-report style to prevent conflict
    const portraitStyleEl = document.getElementById('dynamic-portrait-print-style');
    if (portraitStyleEl) {
      portraitStyleEl.remove();
    }
    
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn('Iframe sandbox detected. Showing instructions for secure print.');
      setShowPrintIframeWarning(true);
    } else {
      const styleId = 'dynamic-landscape-print-style-reports';
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
            /* Hide general web app layouts & headers */
            header, footer, nav, button, form, .no-print, .modal, [role="dialog"] {
              display: none !important;
            }
            body > *:not(#root) {
              display: none !important;
            }
            /* Ensure maximum printable area and keep parents visible */
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
            /* Style the container sheet to fill horizontal paper space */
            .print-report-table-container {
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
            /* Table optimization for Landscape A4 */
            .print-report-table-container table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              font-size: 10px !important;
            }
            .print-report-table-container th {
              background-color: #f1f5f9 !important; /* Elegant slate-100 header */
              color: #1e293b !important;
              font-weight: 700 !important;
              border: 1px solid #94a3b8 !important;
              padding: 6px 4px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-report-table-container td {
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

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* All top dashboards & analytics are excluded from print */}
      <div className="no-print space-y-6">
        {/* Header Info */}
        <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-800/50 via-indigo-950 to-indigo-950 opacity-90 z-0" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-200 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-500/30">
            실적 마감 대시보드
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">교육실적 통계 및 분석</h2>
          <p className="text-xs text-indigo-200">기안 및 보고 마감이 완료된 최종 수행 실적 데이터입니다.</p>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-xs font-bold text-indigo-100 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xs">
          <div>
            <span className="text-[10px] text-indigo-300 block">계획 대비 마감율</span>
            <span className="text-sm font-black text-white">
              {plans.length > 0 ? `${Math.round((totalCount / plans.length) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="w-px h-8 bg-white/15" />
          <div>
            <span className="text-[10px] text-indigo-300 block">미마감 건수</span>
            <span className="text-sm font-black text-amber-300">
              {plans.length - totalCount > 0 ? `${plans.length - totalCount}건` : '0건'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Completed Performance Count */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">완료 실적 건수</p>
            <p className="text-xl font-bold text-gray-800 tracking-tight mt-1">
              {totalCount}건
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: {inHouseCount}건</span>
              <span>•</span>
              <span>사외: {externalCount}건</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Cumulative Education Hours */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">누적 교육 시간</p>
            <p className="text-xl font-bold text-gray-800 tracking-tight mt-1">
              {totalHours}시간
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: {inHouseHours}H</span>
              <span>•</span>
              <span>사외: {externalHours}H</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Actual Execution Cost */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">실제 집행 비용</p>
            <p className="text-xl text-gray-700 tracking-tight mt-1 font-normal">
              {formatCurrency(totalCost)}원
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate font-normal">
              <span>사내: {formatCurrency(inHouseCost)}원</span>
              <span>•</span>
              <span>사외: {formatCurrency(externalCost)}원</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Average Education Satisfaction */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Star className="w-6 h-6 fill-indigo-100" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">평균 교육 만족도</p>
            <p className="text-xl font-bold text-gray-800 tracking-tight mt-1 flex items-baseline gap-1">
              {avgSatisfaction > 0 ? avgSatisfaction.toFixed(1) : '0.0'}
              <span className="text-xs font-normal text-gray-400">/ 5.0</span>
            </p>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }, (_, i) => {
                const filled = i + 1 <= Math.round(avgSatisfaction);
                return (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${filled ? 'text-indigo-500 fill-indigo-500' : 'text-gray-200'}`}
                  />
                );
              })}
              <span className="text-[10px] text-gray-400 ml-1">만족도 우수</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Donut charts comparing cost and hour ratios */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PieIcon className="w-4.5 h-4.5 text-indigo-500" />
              <span>사내 vs 사외 실적 비중</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">실제 집행된 비용과 이수 시간 비율 비교</p>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[260px]">
            {costDistributionData.length === 0 && hoursDistributionData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-400 text-xs py-10">
                수행 완료된 교육 실적이 없어 차트를 표시할 수 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 h-full items-center">
                {/* Cost Donut */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-gray-500 mb-2">실집행 비용 비율</span>
                  {costDistributionData.length > 0 ? (
                    <div className="w-full h-[140px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {costDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${formatCurrency(Number(value))}원`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[10px] text-gray-400 font-bold">비용</span>
                        <span className="text-xs font-black text-gray-700">₩{formatCurrency(totalCost).slice(0, 4)}..</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[140px] flex items-center justify-center text-[11px] text-gray-400">집행 비용 없음</div>
                  )}
                  <div className="flex flex-col gap-1 mt-3 text-[10px] text-gray-500 w-full px-4 border-t border-gray-50 pt-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>사내</span>
                      </div>
                      <span className="font-mono font-bold text-gray-700">
                        {totalCost > 0 ? Math.round((inHouseCost / totalCost) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span>사외</span>
                      </div>
                      <span className="font-mono font-bold text-gray-700">
                        {totalCost > 0 ? Math.round((externalCost / totalCost) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hours Donut */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-gray-500 mb-2">이수 시간 비율</span>
                  {hoursDistributionData.length > 0 ? (
                    <div className="w-full h-[140px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={hoursDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {hoursDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}시간`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[10px] text-gray-400 font-bold">시간</span>
                        <span className="text-xs font-black text-gray-700">{totalHours}H</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[140px] flex items-center justify-center text-[11px] text-gray-400">이수 시간 없음</div>
                  )}
                  <div className="flex flex-col gap-1 mt-3 text-[10px] text-gray-500 w-full px-4 border-t border-gray-50 pt-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <span>사내</span>
                      </div>
                      <span className="font-mono font-bold text-gray-700">
                        {totalHours > 0 ? Math.round((inHouseHours / totalHours) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        <span>사외</span>
                      </div>
                      <span className="font-mono font-bold text-gray-700">
                        {totalHours > 0 ? Math.round((externalHours / totalHours) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Monthly actual education completion and trainee trend */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-indigo-500" />
              <span>월별 마감 실적 및 수료자 추이</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">매월 실제 완료된 실적 건수 및 이수 인원 수</p>
          </div>

          <div className="flex-1 min-h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#6366F1" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#4B5563', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="교육 완료 (건)" fill="#6366F1" radius={[3, 3, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="수료 인원 (명)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>

      {/* Education Performance List Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4 print-report-table-container">
        {/* 인쇄 전용 헤더 (화면 숨김, 인쇄 시에만 가로 상단 표출) */}
        <div className="hidden print:block mb-6 w-full">
          <div className="flex justify-between items-baseline border-b-2 border-slate-800 pb-2.5">
            <h1 className="text-lg font-black text-slate-900">대성스틸 연간 교육 실적 현황</h1>
            <span className="text-xs text-slate-500 font-mono font-bold">
              출력일자: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-indigo-500" />
              <span>교육 실적 목록 (이수 완료)</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">기안 및 결과보고 제출이 100% 완료된 실적 상세 현황입니다.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              총 {completedReportsWithDetails.length}건 완료
            </div>
            <button
              onClick={handlePrintList}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>교육 실적 목록 출력</span>
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto border border-gray-150 rounded-2xl bg-white">
          <table className="w-full min-w-[850px] table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-150 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                <th style={{ width: '13%' }} className="py-2.5 px-2">보고서번호</th>
                <th style={{ width: '25%' }} className="py-2.5 px-1.5">교육명</th>
                <th style={{ width: '15%' }} className="py-2.5 px-1.5">교육대상자</th>
                <th style={{ width: '15%' }} className="py-2.5 px-1.5">교육일정</th>
                <th style={{ width: '12%' }} className="py-2.5 px-1.5 text-right">실집행비용</th>
                <th style={{ width: '6%' }} className="py-2.5 px-1 text-center">만족도</th>
                <th style={{ width: '7%' }} className="py-2.5 px-1 text-center">수료증</th>
                <th style={{ width: '7%' }} className="py-2.5 px-2 text-center no-print">기능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-[11px] md:text-xs">
              {completedReportsWithDetails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    완료된 교육 실적이 없습니다. (기안 및 결과보고서 완료 필요)
                  </td>
                </tr>
              ) : (
                completedReportsWithDetails.map(({ report, plan, draft }) => {
                  const associatedPlan = plans.find((p) => p.id === (report.plan_id || report.planId));
                  const targetText = associatedPlan ? associatedPlan.target : (report.target || '-');
                  return (
                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-bold text-gray-700 truncate">{report.id}</td>
                      <td className="py-2.5 px-1.5 font-semibold text-gray-800 break-all truncate" title={plan.title}>{plan.title}</td>
                      <td className="py-2.5 px-1.5 text-gray-600 font-medium truncate" title={targetText}>
                        {targetText}
                      </td>
                      <td className="py-2.5 px-1.5 text-gray-600 font-mono text-[10px]">
                        <div className="font-medium text-gray-700 truncate">{plan.date}</div>
                        <div className="text-gray-400 text-[9px] truncate">{plan.hours}시간 ({plan.schedule})</div>
                      </td>
                      <td className="py-2.5 px-1.5 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(plan.cost)}
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-indigo-700">
                        {report.satisfaction_score?.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        {report.certificate_file ? (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            첨부 완료
                          </span>
                        ) : (
                          <span className="text-gray-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center no-print">
                        <button
                          onClick={() => setSelectedReportDetail({ report, plan, draft })}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all border border-indigo-100 cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3" />
                          상세보기
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedReportDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print font-sans print:bg-transparent print:static print:p-0 print:overflow-visible print:z-0">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-3xl border border-gray-100 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-8 print:border-none print:shadow-none print:my-0 print:p-0"
            >
              {/* Modal Top Header (Screen Only) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 no-print">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">교육 결과보고서 상세보기</h4>
                    <p className="text-[11px] text-gray-400">최종 제출 및 이수 완료된 실적 합의 문서입니다.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    인쇄 및 출력
                  </button>
                  <button
                    onClick={() => setSelectedReportDetail(null)}
                    className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: A4 Paper Preview */}
              <div className="p-6 overflow-y-auto max-h-[75vh] bg-gray-100/50 flex justify-center print:bg-white print:p-0 print:overflow-visible print:max-h-none">
                <div id="print-area-wrapper" className="w-full bg-white flex justify-center print:p-0">
                  <div
                    id="print-area"
                    className="w-full max-w-[210mm] p-6 sm:p-[10mm] bg-white border border-gray-200 shadow-sm text-black relative flex flex-col justify-start gap-y-4 print:border-none print:shadow-none print:p-0"
                    style={{ boxSizing: 'border-box' }}
                  >
                    {/* Header Stamp Grids */}
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-[10px] text-gray-400 font-mono tracking-tight">
                          {selectedReportDetail.report.id}
                        </div>

                        {/* APPROVAL STAMP GRIDS */}
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
                              <td className="border-r border-black p-1 text-center font-bold text-gray-700 text-[10px]" style={{ border: '1px solid #000000', height: '45px', verticalAlign: 'middle' }}>
                                {selectedReportDetail.report.drafter_name}
                              </td>
                              <td className="border-r border-black" style={{ border: '1px solid #000000', height: '45px' }}></td>
                              <td style={{ border: '1px solid #000000', height: '45px' }}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Central Title */}
                      <div className="text-center mb-10">
                        <h1 className="text-2xl font-black tracking-[0.4em] border-b-2 border-double border-black pb-2 inline-block pl-[0.4em]">
                          교 육 결 과 보 고 서
                        </h1>
                      </div>

                      {/* Meta Grid Corporate Table */}
                      <table className="w-full border-collapse border border-black text-xs mb-3">
                        <tbody>
                          {/* Row 1: Report Number & Drafter Info */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">보고서번호</td>
                            <td className="border-r border-black p-2.5 w-[32%] font-mono text-[11px]">{selectedReportDetail.report.id}</td>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">보고자 정보</td>
                            <td className="p-2.5 w-[32%] font-bold">
                              {selectedReportDetail.report.department} {selectedReportDetail.report.drafter_name} {selectedReportDetail.report.position}
                            </td>
                          </tr>

                          {/* Row 2: Draft Date & Category */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">보고일자</td>
                            <td className="border-r border-black p-2.5">{getFormattedKoreanDate(selectedReportDetail.report.report_date)}</td>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">기안연동번호</td>
                            <td className="p-2.5 font-mono text-[10px] text-gray-600">
                              {selectedReportDetail.report.draft_id}
                            </td>
                          </tr>

                          {/* Row 3: Course Title */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교 육 명</td>
                            <td colSpan={3} className="p-2.5 font-bold text-sm bg-gray-50/10">
                              {selectedReportDetail.plan.title}
                            </td>
                          </tr>

                          {/* Row 4: Institution & Instructor */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육기관</td>
                            <td className="border-r border-black p-2.5">{selectedReportDetail.plan.institution}</td>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">강 사</td>
                            <td className="p-2.5">{selectedReportDetail.plan.instructor}</td>
                          </tr>

                          {/* Row 5: Target Group & Dates */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">대 상 자</td>
                            <td className="border-r border-black p-2.5">{selectedReportDetail.plan.target}</td>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육일정</td>
                            <td className="p-2.5">{selectedReportDetail.plan.date} ({selectedReportDetail.plan.schedule}) ({selectedReportDetail.plan.hours}시간)</td>
                          </tr>

                          {/* Row 6: Budget & Satisfaction */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">집행비용</td>
                            <td className="border-r border-black p-2.5 font-bold text-emerald-800">
                              ₩{formatCurrency(selectedReportDetail.plan.cost)}
                            </td>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">만족도</td>
                            <td className="p-2.5 font-bold text-indigo-700">
                              만족도 {selectedReportDetail.report.satisfaction_score.toFixed(1)} / 5.0
                            </td>
                          </tr>

                          {/* Row 7: Purpose */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육목적</td>
                            <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px]">
                              {selectedReportDetail.draft.purpose}
                            </td>
                          </tr>

                          {/* Row 8: Budget Breakdown */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">소요예산 상세</td>
                            <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] text-gray-700">
                              {selectedReportDetail.draft.budget_breakdown}
                            </td>
                          </tr>

                          {/* Row 9: Content Summary */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육 결과<br />요약 및 성과</td>
                            <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                              <div className="min-h-[168px] w-full">
                                {selectedReportDetail.report.summary}
                              </div>
                            </td>
                          </tr>

                          {/* Row 10: Future Plan */}
                          <tr>
                            <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">향후 현업<br />적용 계획 및<br />기대효과</td>
                            <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                              <div className="min-h-[60px] w-full">
                                {selectedReportDetail.report.future_plan}
                              </div>
                            </td>
                          </tr>

                          {/* Row 11: Certificate attachment (if exists) */}
                          {selectedReportDetail.report.certificate_file && (
                            <tr className="border-t border-black">
                              <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">첨부 수료증</td>
                              <td colSpan={3} className="p-2.5 text-center">
                                <div className="flex flex-col items-center justify-center p-2 bg-gray-50/50 rounded-xl border border-gray-100 max-w-md mx-auto">
                                  <img
                                    src={selectedReportDetail.report.certificate_file}
                                    alt="Certificate Attachment"
                                    className="max-h-[140px] max-w-full object-contain rounded-lg shadow-sm border border-gray-200"
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="text-[10px] text-gray-500 mt-1.5 font-bold font-mono">{selectedReportDetail.report.certificate_file_name}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom Signature / Footer Area */}
                    <div className="text-center pt-2 border-t border-gray-100 mt-2 print:mt-1.5 pb-0">
                      <p className="text-[11px] sm:text-xs text-gray-500 tracking-tight leading-relaxed mb-2 print:mb-1.5 font-medium max-w-[95%] mx-auto">
                        위와 같이 연간 교육 계획에 의거하여 사내/사외 위탁 교육 결과를 보고하오니,<br />
                        검토 후 결재하여 주시기 바랍니다.
                      </p>

                      <p className="text-[11px] sm:text-xs font-bold text-gray-700 tracking-wider mb-2 print:mb-1.5">
                        {getFormattedKoreanDate(selectedReportDetail.report.report_date)}
                      </p>

                      <div className="flex flex-col items-center">
                        <p className="text-sm sm:text-md font-extrabold text-gray-900 leading-none">
                          (주)대성스틸
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
              transition={{ duration: 0.2, ease: "easeOut" }}
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
    </motion.div>
  );
}
