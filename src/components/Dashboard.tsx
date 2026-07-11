/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CategoryMetrics } from '../types';
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
} from 'recharts';
import { Award, DollarSign, Clock, Layers, BookOpen, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  metrics: CategoryMetrics;
}

export default function Dashboard({ metrics }: DashboardProps) {
  const { inHouse, external, total } = metrics;

  // Data for charts
  const categoryData = [
    {
      name: '사내 교육',
      '총 시간 (시간)': inHouse.totalHours,
      '총 비용 (원)': inHouse.totalCost,
      '교육 건수 (건)': inHouse.count,
    },
    {
      name: '사외 교육',
      '총 시간 (시간)': external.totalHours,
      '총 비용 (원)': external.totalCost,
      '교육 건수 (건)': external.count,
    },
  ];

  const costDistributionData = [
    { name: '사내 교육 비용', value: inHouse.totalCost, color: '#3B82F6' }, // Blue
    { name: '사외 교육 비용', value: external.totalCost, color: '#10B981' }, // Emerald
  ].filter((d) => d.value > 0);

  const hoursDistributionData = [
    { name: '사내 교육 시간', value: inHouse.totalHours, color: '#6366F1' }, // Indigo
    { name: '사외 교육 시간', value: external.totalHours, color: '#F59E0B' }, // Amber
  ].filter((d) => d.value > 0);

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Upper Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Total Plans */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">총 교육 건수</p>
            <p className="text-lg xl:text-xl font-bold text-gray-800 tracking-tight mt-1">
              {total.count} <span className="text-xs font-normal text-gray-500">건</span>
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: {inHouse.count}건</span>
              <span>•</span>
              <span>사외: {external.count}건</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Total Headcount */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
        >
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl flex-shrink-0">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">총 교육 인원</p>
            <p className="text-lg xl:text-xl font-bold text-gray-800 tracking-tight mt-1">
              {total.totalHeadcount} <span className="text-xs font-normal text-gray-500">명</span>
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: {inHouse.totalHeadcount}명</span>
              <span>•</span>
              <span>사외: {external.totalHeadcount}명</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Total Hours */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">총 교육 시간</p>
            <p className="text-lg xl:text-xl font-bold text-gray-800 tracking-tight mt-1">
              {total.totalHours} <span className="text-xs font-normal text-gray-500">시간</span>
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: {inHouse.totalHours}H</span>
              <span>•</span>
              <span>사외: {external.totalHours}H</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Total Cost */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">총 예산 (예상비용)</p>
            <p className="text-lg xl:text-xl font-bold text-gray-800 font-sans tracking-tight mt-1">
              ₩{formatCurrency(total.totalCost)}
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: ₩{formatCurrency(inHouse.totalCost)}</span>
              <span>•</span>
              <span>사외: ₩{formatCurrency(external.totalCost)}</span>
            </div>
          </div>
        </motion.div>

        {/* Card 5: Average Cost per Course */}
        <motion.div
          variants={cardVariants}
          className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
            <Award className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">건당 평균 소요 비용</p>
            <p className="text-lg xl:text-xl font-bold text-gray-800 tracking-tight mt-1">
              ₩{formatCurrency(total.count > 0 ? Math.round(total.totalCost / total.count) : 0)}
            </p>
            <div className="flex gap-2 mt-1 text-[11px] text-gray-400 truncate">
              <span>사내: ₩{formatCurrency(inHouse.count > 0 ? Math.round(inHouse.totalCost / inHouse.count) : 0)}</span>
              <span>•</span>
              <span>사외: ₩{formatCurrency(external.count > 0 ? Math.round(external.totalCost / external.count) : 0)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hour vs Cost Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            구분별 교육 통계 비교
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#6366F1" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#4B5563' }} />
                <Bar yAxisId="left" dataKey="총 시간 (시간)" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar yAxisId="right" dataKey="총 비용 (원)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            교육 예산 및 시간 비중
          </h3>
          <div className="h-64 flex flex-col justify-between">
            {costDistributionData.length === 0 && hoursDistributionData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                데이터가 부족하여 차트를 표시할 수 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 h-full">
                {/* Cost Pie */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500 mb-2">예산 분포</span>
                  {costDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={costDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
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
                  ) : (
                    <div className="h-[120px] flex items-center justify-center text-[10px] text-gray-400">비용 없음</div>
                  )}
                  <div className="flex flex-col gap-1 mt-2 text-[10px] text-gray-500 w-full px-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-xs" />
                      <span className="truncate">사내: {total.totalCost > 0 ? Math.round((inHouse.totalCost / total.totalCost) * 100) : 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                      <span className="truncate">사외: {total.totalCost > 0 ? Math.round((external.totalCost / total.totalCost) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Hours Pie */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500 mb-2">시간 분포</span>
                  {hoursDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={hoursDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
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
                  ) : (
                    <div className="h-[120px] flex items-center justify-center text-[10px] text-gray-400">시간 없음</div>
                  )}
                  <div className="flex flex-col gap-1 mt-2 text-[10px] text-gray-500 w-full px-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-xs" />
                      <span className="truncate">사내: {total.totalHours > 0 ? Math.round((inHouse.totalHours / total.totalHours) * 100) : 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-xs" />
                      <span className="truncate">사외: {total.totalHours > 0 ? Math.round((external.totalHours / total.totalHours) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
