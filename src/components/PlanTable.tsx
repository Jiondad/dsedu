/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EducationPlan } from '../types';
import { formatCurrency } from '../utils';
import { Search, Filter, Edit3, Trash2, Calendar, Clock, User, Award, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlanTableProps {
  plans: EducationPlan[];
  onEdit: (plan: EducationPlan, index: number) => void;
  onDelete: (index: number) => void;
}

export default function PlanTable({ plans, onEdit, onDelete }: PlanTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'전체' | '사내' | '사외'>('전체');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof EducationPlan>('edu_date');
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
        plan.agency.toLowerCase().includes(query) ||
        plan.instructor.toLowerCase().includes(query) ||
        plan.target_group.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === '전체' || plan.category === categoryFilter;

      return matchesSearch && matchesCategory;
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      {/* Search and Filters bar */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
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

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
              <th className="py-3.5 px-5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('edu_date')}>
                교육일자 {sortField === 'edu_date' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                구분 {sortField === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('title')}>
                교육명 {sortField === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-4">교육기관 / 강사</th>
              <th className="py-3.5 px-4">대상자</th>
              <th className="py-3.5 px-4">교육일정</th>
              <th className="py-3.5 px-4">시간대</th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total_hours')}>
                시간 {sortField === 'total_hours' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-5 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('estimated_cost')}>
                예상비용 {sortField === 'estimated_cost' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3.5 px-5 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {sortedPlans.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400 font-medium">
                  수립된 교육 계획이 없습니다.
                </td>
              </tr>
            ) : (
              sortedPlans.map(({ plan, originalIndex }) => (
                <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Date */}
                  <td className="py-4 px-5 font-medium text-gray-700 whitespace-nowrap">
                    {plan.edu_date}
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                        plan.category === '사내'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      {plan.category}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-4 px-4 font-semibold text-gray-800 min-w-[180px]">
                    {plan.title}
                  </td>

                  {/* Agency / Instructor */}
                  <td className="py-4 px-4 text-gray-500">
                    <div className="font-medium text-gray-700">{plan.agency}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> {plan.instructor}
                    </div>
                  </td>

                  {/* Target Group */}
                  <td className="py-4 px-4 text-gray-600">
                    {plan.target_group}
                  </td>

                  {/* Schedule */}
                  <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {plan.schedule}
                    </div>
                  </td>

                  {/* Time Range */}
                  <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {plan.time_range}H
                    </div>
                  </td>

                  {/* Total Hours */}
                  <td className="py-4 px-4 text-right font-semibold text-gray-800">
                    {plan.total_hours} <span className="text-xs font-normal text-gray-400">시간</span>
                  </td>

                  {/* Estimated Cost */}
                  <td className="py-4 px-5 text-right font-bold text-gray-800 whitespace-nowrap">
                    ₩{formatCurrency(plan.estimated_cost)}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(plan, originalIndex)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="수정"
                      >
                        <Edit3 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(originalIndex)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
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
    </div>
  );
}
