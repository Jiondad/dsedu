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
  onEdit: (plan: EducationPlan, index: number) => void;
  onDelete: (index: number) => void;
  onStartDraft: (plan: EducationPlan) => void;
  onStartReport: (plan: EducationPlan) => void;
}

export default function PlanTable({
  plans,
  drafts,
  reports = [],
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
        setShowPrintIwarning(true);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden print-plan-table-container">
      {/* 인쇄 전용 헤더 */}
      <div className="hidden print:block mb-6 w-full">
        <div className="flex justify-between items-baseline border-b-2 border-slate-800 pb-2.5">
          <h1 className="text-lg font-black text-slate-900">대성스틸 연간 교육 계획 목록</h1>
          <span className="text-xs text-slate-500 font-mono font-bold">
            출력일자: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Search and Filters bar */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 no-print">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5
