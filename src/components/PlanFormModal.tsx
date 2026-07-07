/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EducationPlan } from '../types';
import { X, Calendar, BookOpen, User, Building, Clock, DollarSign, HelpCircle } from 'lucide-react';
import { validateSchedule, validateTimeRange } from '../utils';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (plan: Omit<EducationPlan, 'id'> & { id?: string }) => void;
  editPlan?: EducationPlan | null;
}

export default function PlanFormModal({ isOpen, onClose, onSubmit, editPlan }: PlanFormModalProps) {
  const [formData, setFormData] = useState({
    edu_date: '',
    category: '사내' as '사내' | '사외',
    title: '',
    agency: '',
    instructor: '',
    target_group: '',
    schedule: '',
    time_range: '',
    total_hours: '',
    estimated_cost: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editPlan) {
      setFormData({
        edu_date: editPlan.edu_date || '',
        category: editPlan.category || '사내',
        title: editPlan.title || '',
        agency: editPlan.agency || '',
        instructor: editPlan.instructor || '',
        target_group: editPlan.target_group || '',
        schedule: editPlan.schedule || '',
        time_range: editPlan.time_range || '',
        total_hours: String(editPlan.total_hours || ''),
        estimated_cost: String(editPlan.estimated_cost || ''),
      });
      setErrors({});
    } else {
      setFormData({
        edu_date: new Date().toISOString().split('T')[0],
        category: '사내',
        title: '',
        agency: '',
        instructor: '',
        target_group: '',
        schedule: '',
        time_range: '',
        total_hours: '',
        estimated_cost: '',
      });
      setErrors({});
    }
  }, [editPlan, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation clearance
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.edu_date) newErrors.edu_date = '교육일자를 선택해주세요.';
    if (!formData.title.trim()) newErrors.title = '교육명을 입력해주세요.';
    if (!formData.agency.trim()) newErrors.agency = '교육기관을 입력해주세요.';
    if (!formData.instructor.trim()) newErrors.instructor = '강사를 입력해주세요.';
    if (!formData.target_group.trim()) newErrors.target_group = '대상자를 입력해주세요.';

    // Schedule validation ('MM/DD~MM/DD')
    if (!formData.schedule.trim()) {
      newErrors.schedule = '교육일정을 입력해주세요.';
    } else if (!validateSchedule(formData.schedule)) {
      newErrors.schedule = "'MM/DD~MM/DD' 형식으로 입력해주세요. (예: 05/10~05/12)";
    }

    // Time range validation ('HH~HH')
    if (!formData.time_range.trim()) {
      newErrors.time_range = '교육시간을 입력해주세요.';
    } else if (!validateTimeRange(formData.time_range)) {
      newErrors.time_range = "'HH~HH' 형식으로 입력해주세요. (예: 09~18)";
    }

    // Total hours validation
    const hoursNum = Number(formData.total_hours);
    if (!formData.total_hours) {
      newErrors.total_hours = '시간을 입력해주세요.';
    } else if (isNaN(hoursNum) || hoursNum <= 0) {
      newErrors.total_hours = '올바른 숫자를 입력해주세요.';
    }

    // Cost validation
    const costNum = Number(formData.estimated_cost);
    if (!formData.estimated_cost) {
      newErrors.estimated_cost = '예상비용을 입력해주세요.';
    } else if (isNaN(costNum) || costNum < 0) {
      newErrors.estimated_cost = '올바른 금액을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: editPlan?.id,
      edu_date: formData.edu_date,
      category: formData.category,
      title: formData.title.trim(),
      agency: formData.agency.trim(),
      instructor: formData.instructor.trim(),
      target_group: formData.target_group.trim(),
      schedule: formData.schedule.trim(),
      time_range: formData.time_range.trim(),
      total_hours: Number(formData.total_hours),
      estimated_cost: Number(formData.estimated_cost),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity duration-300">
      <div className="relative w-full max-w-2xl transform rounded-2xl bg-white p-6 shadow-2xl transition-all border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            {editPlan ? '교육 계획 수정' : '신규 교육 계획 추가'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">구분</label>
              <div className="flex gap-4 p-1 bg-gray-50 rounded-xl border border-gray-200">
                <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all has-checked:bg-white has-checked:shadow-xs has-checked:text-indigo-600">
                  <input
                    type="radio"
                    name="category"
                    value="사내"
                    checked={formData.category === '사내'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>사내 교육</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all has-checked:bg-white has-checked:shadow-xs has-checked:text-emerald-600">
                  <input
                    type="radio"
                    name="category"
                    value="사외"
                    checked={formData.category === '사외'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>사외 교육</span>
                </label>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 교육일자
              </label>
              <input
                type="date"
                name="edu_date"
                value={formData.edu_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.edu_date && <p className="text-xs text-rose-500 mt-1">{errors.edu_date}</p>}
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">교육명</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="예) AI 기술을 활용한 업무 생산성 향상 교육"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>

            {/* Agency */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> 교육기관
              </label>
              <input
                type="text"
                name="agency"
                value={formData.agency}
                onChange={handleChange}
                placeholder="예) 한국멀티미디어 교육원"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.agency && <p className="text-xs text-rose-500 mt-1">{errors.agency}</p>}
            </div>

            {/* Instructor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> 강사
              </label>
              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                placeholder="예) 홍길동 수석연구원"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.instructor && <p className="text-xs text-rose-500 mt-1">{errors.instructor}</p>}
            </div>

            {/* Target Group */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> 대상자
              </label>
              <input
                type="text"
                name="target_group"
                value={formData.target_group}
                onChange={handleChange}
                placeholder="예) 전사 임직원 또는 IT개발본부"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.target_group && <p className="text-xs text-rose-500 mt-1">{errors.target_group}</p>}
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 교육일정 <span className="text-[10px] text-gray-400 font-normal">(MM/DD~MM/DD)</span>
              </label>
              <input
                type="text"
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="예) 05/10~05/12"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.schedule && <p className="text-xs text-rose-500 mt-1">{errors.schedule}</p>}
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 교육시간대 <span className="text-[10px] text-gray-400 font-normal">(HH~HH)</span>
              </label>
              <input
                type="text"
                name="time_range"
                value={formData.time_range}
                onChange={handleChange}
                placeholder="예) 09~18"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.time_range && <p className="text-xs text-rose-500 mt-1">{errors.time_range}</p>}
            </div>

            {/* Total Hours */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 총 시간 (시간)
              </label>
              <input
                type="number"
                name="total_hours"
                value={formData.total_hours}
                onChange={handleChange}
                placeholder="예) 24"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.total_hours && <p className="text-xs text-rose-500 mt-1">{errors.total_hours}</p>}
            </div>

            {/* Estimated Cost */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> 예상비용 (원)
              </label>
              <input
                type="number"
                name="estimated_cost"
                value={formData.estimated_cost}
                onChange={handleChange}
                placeholder="예) 1200000"
                className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {errors.estimated_cost && <p className="text-xs text-rose-500 mt-1">{errors.estimated_cost}</p>}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
            >
              {editPlan ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
