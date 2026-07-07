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
import { Award, Clock, BookOpen, Layers, Star, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { motion } from 'motion/react';

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

  const totalCost = completedReportsWithDetails.reduce((sum, item) => sum + (item.plan.estimated_cost || 0), 0);
  const inHouseCost = completedReportsWithDetails.filter((item) => item.plan.category === '사내').reduce((sum, item) => sum + (item.plan.estimated_cost || 0), 0);
  const externalCost = completedReportsWithDetails.filter((item) => item.plan.category === '사외').reduce((sum, item) => sum + (item.plan.estimated_cost || 0), 0);

  const totalHours = completedReportsWithDetails.reduce((sum, item) => sum + (item.plan.total_hours || 0), 0);
  const inHouseHours = completedReportsWithDetails.filter((item) => item.plan.category === '사내').reduce((sum, item) => sum + (item.plan.total_hours || 0), 0);
  const externalHours = completedReportsWithDetails.filter((item) => item.plan.category === '사외').reduce((sum, item) => sum + (item.plan.total_hours || 0), 0);

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
      const dateStr = item.plan.edu_date || item.report.report_date;
      if (!dateStr) return false;
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === monthNum;
      }
      return false;
    });

    const count = monthItems.length;
    const trainees = monthItems.reduce((sum, item) => sum + parseTraineeCount(item.plan.target_group), 0);

    return {
      name: monthName,
      '교육 완료 (건)': count,
      '수료 인원 (명)': trainees,
    };
  });

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

        {/* Card 2: Actual Execution Cost - Standard weight and clean text as requested */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">실제 집행 비용</p>
            {/* Standard normal weight, no currency symbol, comma separated */}
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

        {/* Card 3: Cumulative Education Hours */}
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
    </motion.div>
  );
}
