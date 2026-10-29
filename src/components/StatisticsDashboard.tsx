/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency, getSatisfactionLabel } from '../utils';
import {
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  Star,
  AlertCircle,
  BarChart3,
  Layers,
  FileCheck2,
  ClipboardCheck,
  Wallet,
  FileText,
  Image as ImageIcon,
  Printer,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';

interface StatisticsDashboardProps {
  plans?: EducationPlan[];
  drafts?: EducationDraft[];
  reports?: EducationReport[];
  selectedYear?: string;
}

export default function StatisticsDashboard({
  plans = [],
  drafts = [],
  reports = [],
  selectedYear = String(new Date().getFullYear()),
}: StatisticsDashboardProps) {
  // 1. 계획 vs 기안 vs 결과보고 마감 정밀 매칭 분석
  const analysis = useMemo(() => {
    const reportedPlanIds = new Set(
      reports.map((r) => String(r.plan_id || r.planId || '').trim()).filter(Boolean)
    );
    const draftedPlanIds = new Set(
      drafts.map((d) => String(d.plan_id || '').trim()).filter(Boolean)
    );

    const completedPlans = plans.filter((p) =>
      reportedPlanIds.has(String(p.id || '').trim())
    );
    const pendingPlans = plans.filter(
      (p) => !reportedPlanIds.has(String(p.id || '').trim())
    );

    const inHouseCompleted = completedPlans.filter((p) => p.category === '사내');
    const externalCompleted = completedPlans.filter((p) => p.category === '사외');

    const sumHours = (arr: EducationPlan[]) =>
      arr.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
    const sumCost = (arr: EducationPlan[]) =>
      arr.reduce((acc, cur) => acc + (Number(cur.cost) || 0), 0);
    const sumHeadcount = (arr: EducationPlan[]) =>
      arr.reduce((acc, cur) => acc + (Number(cur.headcount) || 1), 0);

    const totalPlanCount = plans.length;
    const draftedCount = plans.filter((p) =>
      draftedPlanIds.has(String(p.id || '').trim())
    ).length;
    const completedCount = completedPlans.length;
    const pendingCount = Math.max(0, totalPlanCount - completedCount);

    const completionRate =
      totalPlanCount > 0 ? Math.round((completedCount / totalPlanCount) * 100) : 0;
    const draftRate =
      totalPlanCount > 0 ? Math.round((draftedCount / totalPlanCount) * 100) : 0;

    // 인원/시간/비용 (계획 vs 실적)
    const plannedHeadcount = sumHeadcount(plans);
    const completedHeadcount = sumHeadcount(completedPlans);
    const inHouseHeadcount = sumHeadcount(inHouseCompleted);
    const externalHeadcount = sumHeadcount(externalCompleted);

    const plannedHours = sumHours(plans);
    const completedHours = sumHours(completedPlans);
    const inHouseHours = sumHours(inHouseCompleted);
    const externalHours = sumHours(externalCompleted);

    const plannedCost = sumCost(plans);
    const completedCost = sumCost(completedPlans);
    const inHouseCost = sumCost(inHouseCompleted);
    const externalCost = sumCost(externalCompleted);

    const budgetExecutionRate =
      plannedCost > 0 ? Math.round((completedCost / plannedCost) * 100) : 0;
    const hoursExecutionRate =
      plannedHours > 0 ? Math.round((completedHours / plannedHours) * 100) : 0;

    // 평균 만족도 계산
    const validScores = reports
      .map((r) => Number(r.satisfaction_score ?? r.satisfactionScore ?? 0))
      .filter((s) => s > 0);
    const avgSatisfaction =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 5.0;

    return {
      totalPlanCount,
      draftedCount,
      completedCount,
      pendingCount,
      completionRate,
      draftRate,
      inHouseCount: inHouseCompleted.length,
      externalCount: externalCompleted.length,
      plannedHeadcount,
      completedHeadcount,
      inHouseHeadcount,
      externalHeadcount,
      plannedHours,
      completedHours,
      inHouseHours,
      externalHours,
      plannedCost,
      completedCost,
      inHouseCost,
      externalCost,
      budgetExecutionRate,
      hoursExecutionRate,
      avgSatisfaction,
      completedPlans,
      pendingPlans,
      draftedPlanIds,
    };
  }, [plans, drafts, reports]);

  // 2. 월별 계획 대 실적 비교 데이터 (단일 축 사용으로 착시 현상 완벽 제거)
  const monthlyStats = useMemo(() => {
    const reportedPlanIds = new Set(
      reports.map((r) => String(r.plan_id || r.planId || '').trim()).filter(Boolean)
    );

    const months = Array.from({ length: 12 }, (_, i) => ({
      name: `${i + 1}월`,
      계획인원: 0,
      수료인원: 0,
      계획건수: 0,
      완료건수: 0,
      계획예산만원: 0,
      집행비용만원: 0,
      _rawPlannedCost: 0,
      _rawCompletedCost: 0,
    }));

    plans.forEach((plan) => {
      const dateStr = (plan.date || plan.edu_date || '').split('T')[0].trim();
      let monthIdx = -1;
      if (dateStr && dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          monthIdx = parseInt(parts[1], 10) - 1;
        }
      } else if (plan.schedule && plan.schedule.includes('/')) {
        const m = parseInt(plan.schedule.split('/')[0], 10);
        if (!isNaN(m)) monthIdx = m - 1;
      }

      if (monthIdx >= 0 && monthIdx < 12) {
        const hc = Number(plan.headcount) || 1;
        const cost = Number(plan.cost) || 0;
        const isCompleted = reportedPlanIds.has(String(plan.id || '').trim());

        months[monthIdx].계획인원 += hc;
        months[monthIdx].계획건수 += 1;
        months[monthIdx]._rawPlannedCost += cost;
        months[monthIdx].계획예산만원 = Math.round(months[monthIdx]._rawPlannedCost / 10000);

        if (isCompleted) {
          months[monthIdx].수료인원 += hc;
          months[monthIdx].완료건수 += 1;
          months[monthIdx]._rawCompletedCost += cost;
          months[monthIdx].집행비용만원 = Math.round(months[monthIdx]._rawCompletedCost / 10000);
        }
      }
    });

    return months;
  }, [plans, reports]);

  const handlePrintTable = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 배너: 교육훈련 진행 파이프라인 & 종합 마감률 */}
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
              연간 교육 계획 수립부터 기안 승인, 결과보고서 마감까지 전 과정의 이행 실적을 실시간 집계합니다.
            </p>
          </div>

          {/* 3단계 파이프라인 요약 블록 */}
          <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 shrink-0">
            <div className="px-3 border-r border-white/10">
              <p className="text-[11px] text-indigo-200 font-semibold">① 연간 계획</p>
              <p className="text-xl font-black mt-0.5">{analysis.totalPlanCount}건</p>
              <p className="text-[10px] text-indigo-300 mt-0.5">
                총 {analysis.plannedHeadcount}명 계획
              </p>
            </div>
            <div className="px-3 border-r border-white/10">
              <p className="text-[11px] text-indigo-200 font-semibold">② 기안 완료</p>
              <p className="text-xl font-black text-sky-300 mt-0.5">
                {analysis.draftedCount}건
                <span className="text-xs font-bold text-sky-200/80 ml-1">
                  ({analysis.draftRate}%)
                </span>
              </p>
              <p className="text-[10px] text-indigo-300 mt-0.5">
                미기안 {Math.max(0, analysis.totalPlanCount - analysis.draftedCount)}건
              </p>
            </div>
            <div className="px-3">
              <p className="text-[11px] text-indigo-200 font-semibold">③ 결과보고 마감</p>
              <p className="text-xl font-black text-emerald-300 mt-0.5">
                {analysis.completedCount}건
                <span className="text-xs font-bold text-emerald-200/80 ml-1">
                  ({analysis.completionRate}%)
                </span>
              </p>
              <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                미마감 잔여 {analysis.pendingCount}건
              </p>
            </div>
          </div>
        </div>

        {/* 전체 마감 진행률 게이지 바 */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-indigo-200">연간 계획 대비 최종 결과보고서 마감 진행률</span>
            <span className="text-emerald-300">{analysis.completionRate}% 달성</span>
          </div>
          <div className="w-full h-2.5 bg-indigo-950/80 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              style={{ width: `${analysis.completionRate}%` }}
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-700"
            />
          </div>
        </div>
      </div>

      {/* 2. 5대 실적 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">완료 실적 건수</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {analysis.completedCount}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {analysis.totalPlanCount}건
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              사내 <strong className="text-slate-700">{analysis.inHouseCount}건</strong>
            </span>
            <span className="text-slate-500">
              사외 <strong className="text-slate-700">{analysis.externalCount}건</strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">총 수료 인원</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {analysis.completedHeadcount}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {analysis.plannedHeadcount}명
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              사내 <strong className="text-slate-700">{analysis.inHouseHeadcount}명</strong>
            </span>
            <span className="text-slate-500">
              사외 <strong className="text-slate-700">{analysis.externalHeadcount}명</strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">누적 교육 이수시간</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {analysis.completedHours}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  시간 ({analysis.hoursExecutionRate}%)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              사내 <strong className="text-slate-700">{analysis.inHouseHours}H</strong>
            </span>
            <span className="text-slate-500">
              사외 <strong className="text-slate-700">{analysis.externalHours}H</strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">실제 집행 비용</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  ₩{formatCurrency(analysis.completedCost)}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5 text-[11px] font-semibold">
            <div className="flex justify-between text-slate-500">
              <span>예산 집행률</span>
              <span className="text-indigo-600 font-bold">{analysis.budgetExecutionRate}%</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>사외 집행액</span>
              <span className="text-slate-700 font-bold">
                ₩{formatCurrency(analysis.externalCost)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">평균 교육 만족도</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">
                  {analysis.avgSatisfaction.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-400">/ 5.0점</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-amber-500 tracking-tighter text-xs">★★★★★</span>
            <span className="text-purple-700 font-bold">
              {getSatisfactionLabel(analysis.avgSatisfaction)}
            </span>
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
                월별 계획 인원 대비 실제 수료 인원
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                동일 축(명) 기준으로 월별 계획 인원과 보고서 마감이 완료된 수료 인원을 정밀 비교합니다.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block"></span> 계획 인원
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block"></span> 수료 완료
              </span>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                <Bar dataKey="계획인원" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="수료인원" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={14} />
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
              <ComposedChart data={monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  formatter={(value: any
