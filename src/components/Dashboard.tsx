/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EducationPlan } from '../types';
import { formatCurrency } from '../utils';
import {
  BookOpen,
  Users,
  Clock,
  Wallet,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays,
  Building2,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardProps {
  plans?: EducationPlan[];
  metrics?: any;
  selectedYear?: string;
}

export default function Dashboard({ plans = [], metrics, selectedYear }: DashboardProps) {
  // plans 배열을 기반으로 정밀 통계 산출 (metrics prop만 넘어오는 경우도 완벽 호환)
  const stats = useMemo(() => {
    if (plans && plans.length > 0) {
      const inHouse = plans.filter((p) => p.category === '사내');
      const external = plans.filter((p) => p.category === '사외');

      const sumHours = (arr: EducationPlan[]) =>
        arr.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
      const sumCost = (arr: EducationPlan[]) =>
        arr.reduce((acc, cur) => acc + (Number(cur.cost) || 0), 0);
      const sumHeadcount = (arr: EducationPlan[]) =>
        arr.reduce((acc, cur) => acc + (Number(cur.headcount) || 1), 0);

      const totalCount = plans.length;
      const inHouseCount = inHouse.length;
      const externalCount = external.length;

      const totalHeadcount = sumHeadcount(plans);
      const inHouseHeadcount = sumHeadcount(inHouse);
      const externalHeadcount = sumHeadcount(external);

      const totalHours = sumHours(plans);
      const inHouseHours = sumHours(inHouse);
      const externalHours = sumHours(external);

      const totalCost = sumCost(plans);
      const inHouseCost = sumCost(inHouse);
      const externalCost = sumCost(external);

      return {
        totalCount,
        inHouseCount,
        externalCount,
        totalHeadcount,
        inHouseHeadcount,
        externalHeadcount,
        totalHours,
        inHouseHours,
        externalHours,
        totalCost,
        inHouseCost,
        externalCost,
        avgCostPerPlan: totalCount > 0 ? Math.round(totalCost / totalCount) : 0,
        avgCostInHouse: inHouseCount > 0 ? Math.round(inHouseCost / inHouseCount) : 0,
        avgCostExternal: externalCount > 0 ? Math.round(externalCost / externalCount) : 0,
        avgHoursPerPerson:
          totalHeadcount > 0 ? (totalHours / totalHeadcount).toFixed(1) : '0.0',
      };
    }

    // fallback: metrics 객체만 전달된 경우
    const totalCount = metrics?.total?.count || 0;
    const inHouseCount = metrics?.inHouse?.count || 0;
    const externalCount = metrics?.external?.count || 0;
    const totalHeadcount = metrics?.total?.totalHeadcount || 0;
    const inHouseHeadcount = metrics?.inHouse?.totalHeadcount || 0;
    const externalHeadcount = metrics?.external?.totalHeadcount || 0;
    const totalHours = metrics?.total?.totalHours || 0;
    const inHouseHours = metrics?.inHouse?.totalHours || 0;
    const externalHours = metrics?.external?.totalHours || 0;
    const totalCost = metrics?.total?.totalCost || 0;
    const inHouseCost = metrics?.inHouse?.totalCost || 0;
    const externalCost = metrics?.external?.totalCost || 0;

    return {
      totalCount,
      inHouseCount,
      externalCount,
      totalHeadcount,
      inHouseHeadcount,
      externalHeadcount,
      totalHours,
      inHouseHours,
      externalHours,
      totalCost,
      inHouseCost,
      externalCost,
      avgCostPerPlan: totalCount > 0 ? Math.round(totalCost / totalCount) : 0,
      avgCostInHouse: inHouseCount > 0 ? Math.round(inHouseCost / inHouseCount) : 0,
      avgCostExternal: externalCount > 0 ? Math.round(externalCost / externalCount) : 0,
      avgHoursPerPerson:
        totalHeadcount > 0 ? (totalHours / totalHeadcount).toFixed(1) : '0.0',
    };
  }, [plans, metrics]);

  // 월별(1~12월) 교육 계획 추이 데이터 생성
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: `${i + 1}월`,
      사내건수: 0,
      사외건수: 0,
      총건수: 0,
      계획인원: 0,
      계획시간: 0,
      예산만원: 0,
      원래예산: 0,
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
        if (plan.category === '사내') {
          months[monthIdx].사내건수 += 1;
        } else {
          months[monthIdx].사외건수 += 1;
        }
        months[monthIdx].총건수 += 1;
        months[monthIdx].계획인원 += Number(plan.headcount) || 1;
        months[monthIdx].계획시간 += Number(plan.hours) || 0;
        const cost = Number(plan.cost) || 0;
        months[monthIdx].원래예산 += cost;
        months[monthIdx].예산만원 = Math.round(months[monthIdx].원래예산 / 10000);
      }
    });

    return months;
  }, [plans]);

  // 사내 vs 사외 항목별 비중 계산 헬퍼
  const getRatio = (inVal: number, exVal: number) => {
    const total = inVal + exVal;
    if (total === 0) return { inPct: 0, exPct: 0 };
    const inPct = Math.round((inVal / total) * 100);
    return { inPct, exPct: 100 - inPct };
  };

  const countRatio = getRatio(stats.inHouseCount, stats.externalCount);
  const headcountRatio = getRatio(stats.inHouseHeadcount, stats.externalHeadcount);
  const hoursRatio = getRatio(stats.inHouseHours, stats.externalHours);
  const costRatio = getRatio(stats.inHouseCost, stats.externalCost);

  return (
    <div className="space-y-6 mb-8">
      {/* 1. 상단 5대 핵심 KPI 카드 (글자 잘림 방지 및 시각적 계층 고도화) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 카드 1: 총 교육 건수 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">총 계획 교육 건수</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{stats.totalCount}</span>
                <span className="text-xs font-bold text-slate-500">건</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              사내 <strong className="text-slate-700">{stats.inHouseCount}건</strong>
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              사외 <strong className="text-slate-700">{stats.externalCount}건</strong>
            </span>
          </div>
        </div>

        {/* 카드 2: 총 교육 인원 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">총 계획 교육 인원</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{stats.totalHeadcount}</span>
                <span className="text-xs font-bold text-slate-500">명</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              사내 <strong className="text-slate-700">{stats.inHouseHeadcount}명</strong>
            </span>
            <span className="text-slate-500">
              사외 <strong className="text-slate-700">{stats.externalHeadcount}명</strong>
            </span>
          </div>
        </div>

        {/* 카드 3: 총 교육 시간 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400">총 계획 교육 시간</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{stats.totalHours}</span>
                <span className="text-xs font-bold text-slate-500">시간</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              사내 <strong className="text-slate-700">{stats.inHouseHours}H</strong>
            </span>
            <span className="text-slate-500">
              사외 <strong className="text-slate-700">{stats.externalHours}H</strong>
            </span>
          </div>
        </div>

        {/* 카드 4: 총 예산 (줄바꿈 배지 처리로 잘림 완벽 방지) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">총 편성 예산 (예상비용)</p>
              <div className="mt-1.5 flex items-baseline gap-0.5">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  ₩{formatCurrency(stats.totalCost)}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5 text-[11px] font-semibold">
            <div className="flex justify-between text-slate-500">
              <span>사내 예산</span>
              <span className="text-slate-700 font-bold">₩{formatCurrency(stats.inHouseCost)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>사외 예산</span>
              <span className="text-rose-600 font-bold">₩{formatCurrency(stats.externalCost)}</span>
            </div>
          </div>
        </div>

        {/* 카드 5: 건당 평균 소요 비용 및 인당 교육시간 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">과정당 평균 예산</p>
              <div className="mt-1.5 flex items-baseline gap-0.5">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  ₩{formatCurrency(stats.avgCostPerPlan)}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5 text-[11px] font-semibold">
            <div className="flex justify-between text-slate-500">
              <span>사외 평균</span>
              <span className="text-slate-700 font-bold">
                ₩{formatCurrency(stats.avgCostExternal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>인당 평균시간</span>
              <span className="text-indigo-600 font-bold">{stats.avgHoursPerPerson}시간/인</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 하단 차트 영역 (월별 교육 스케줄 & 사내/사외 4대 지표 밸런스) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측 (7칸): 월별 연간 교육 계획 및 예산 집중도 추이 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-4.5 h-4.5 text-indigo-600" />
                월별 연간 교육 계획 및 예산 편성 추이
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                월별 계획된 사내/사외 교육 건수(막대)와 소요 예산 규모(선)를 함께 비교합니다.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block"></span> 사내(건)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> 사외(건)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span> 예산(만원)
              </span>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  unit="건"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#d97706' }}
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
                  formatter={(value: any, name: string) => {
                    if (name === '예산만원') return [`${formatCurrency(Number(value) * 10000)}원`, '계획 예산'];
                    return [`${value}건`, name === '사내건수' ? '사내 교육' : '사외 교육'];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="사내건수"
                  stackId="count"
                  fill="#6366f1"
                  radius={[0, 0, 4, 4]}
                  barSize={22}
                />
                <Bar
                  yAxisId="left"
                  dataKey="사외건수"
                  stackId="count"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="예산만원"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#fff' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 우측 (5칸): 사내 vs 사외 4대 지표 비중 분석 (기존 단조로운 도넛 대체) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4.5 h-4.5 text-emerald-600" />
                사내 vs 사외 교육 구조 비중 분석
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">사내교육</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">사외위탁</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-5">
              건수·인원·시간·예산 4개 영역별 사내외 편성 비율입니다.
            </p>

            <div className="space-y-4">
              {/* 1. 교육 과정 수 비중 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">1. 과정 건수 비중</span>
                  <span className="text-slate-500">
                    사내 <strong className="text-indigo-600">{stats.inHouseCount}건({countRatio.inPct}%)</strong>
                    {' · '}
                    사외 <strong className="text-emerald-600">{stats.externalCount}건({countRatio.exPct}%)</strong>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${countRatio.inPct}%` }}
                    className="bg-indigo-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${countRatio.exPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* 2. 참여 인원 비중 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">2. 참여 인원 비중</span>
                  <span className="text-slate-500">
                    사내 <strong className="text-indigo-600">{stats.inHouseHeadcount}명({headcountRatio.inPct}%)</strong>
                    {' · '}
                    사외 <strong className="text-emerald-600">{stats.externalHeadcount}명({headcountRatio.exPct}%)</strong>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${headcountRatio.inPct}%` }}
                    className="bg-indigo-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${headcountRatio.exPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* 3. 교육 시간 비중 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">3. 이수 시간 비중</span>
                  <span className="text-slate-500">
                    사내 <strong className="text-indigo-600">{stats.inHouseHours}H({hoursRatio.inPct}%)</strong>
                    {' · '}
                    사외 <strong className="text-emerald-600">{stats.externalHours}H({hoursRatio.exPct}%)</strong>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${hoursRatio.inPct}%` }}
                    className="bg-indigo-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${hoursRatio.exPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* 4. 소요 예산 비중 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">4. 편성 예산 비중</span>
                  <span className="text-slate-500">
                    사내 <strong className="text-indigo-600">{costRatio.inPct}%</strong>
                    {' · '}
                    사외 <strong className="text-emerald-600">{costRatio.exPct}% (₩{formatCurrency(stats.externalCost)})</strong>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${costRatio.inPct}%` }}
                    className="bg-indigo-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${costRatio.exPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 하단 요약 인사이트 박스 */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400">사내 집체교육 인원비중</p>
                <p className="text-xs font-black text-slate-800">
                  전체의 {headcountRatio.inPct}% ({stats.inHouseHeadcount}명)
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400">사외 전문교육 시간비중</p>
                <p className="text-xs font-black text-slate-800">
                  전체의 {hoursRatio.exPct}% ({stats.externalHours}시간)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
