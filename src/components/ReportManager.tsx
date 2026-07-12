/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../sheetsService';
import { EducationPlan, EducationDraft, EducationReport } from '../types';
import { formatCurrency, getSatisfactionLabel } from '../utils';
import {
  FileText,
  Trash2,
  Printer,
  Sparkles,
  RefreshCw,
  FileCheck,
  AlertCircle,
  PenTool,
  CheckCircle,
  UploadCloud,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportManagerProps {
  plans: EducationPlan[];
  drafts: EducationDraft[];
  reports: EducationReport[];
  setReports?: React.Dispatch<React.SetStateAction<EducationReport[]>>;
  onAddReport: (report: EducationReport) => Promise<string | void>;
  onUpdateReport: (report: EducationReport, index: number) => Promise<void>;
  onDeleteReport: (index: number) => Promise<void>;
  isLoading: boolean;
  preselectedPlanId?: string | null;
  onClearPreselectedPlan?: () => void;
  selectedYear: string;
  onFetchReports: (year: string) => Promise<void>;
}

export default function ReportManager({
  plans,
  drafts,
  reports: initialReports,
  setReports: parentSetReports,
  onAddReport,
  onUpdateReport,
  onDeleteReport,
  isLoading: parentIsLoading,
  preselectedPlanId,
  onClearPreselectedPlan,
  selectedYear,
  onFetchReports,
}: ReportManagerProps) {
  const [reports, setLocalReports] = useState<EducationReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(parentIsLoading);

  useEffect(() => {
    setLocalReports(initialReports);
  }, [initialReports]);

  useEffect(() => {
    setIsLoading(parentIsLoading);
  }, [parentIsLoading]);

  const setReports = (newReports: EducationReport[] | ((prev: EducationReport[]) => EducationReport[])) => {
    if (typeof newReports === 'function') {
      const resolved = newReports(reports);
      setLocalReports(resolved);
      if (parentSetReports) parentSetReports(resolved);
    } else {
      setLocalReports(newReports);
      if (parentSetReports) parentSetReports(newReports);
    }
  };

  // Currently editing report state (form)
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [reportId, setReportId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [drafterName, setDrafterName] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [futurePlan, setFuturePlan] = useState('');
  const [purpose, setPurpose] = useState('');
  const [budgetBreakdown, setBudgetBreakdown] = useState('');
  const [satisfactionScore, setSatisfactionScore] = useState<number>(5.0);
  const [certificateFile, setCertificateFile] = useState<string>(''); // Base64
  const [certificateFileName, setCertificateFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      triggerLocalNotification('JPG, PNG 형식의 이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCertificateFile(reader.result as string);
      setCertificateFileName(file.name);
      triggerLocalNotification('수료증 파일이 등록되었습니다.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCertificateFile('');
    setCertificateFileName('');
    triggerLocalNotification('수료증 파일이 삭제되었습니다.', 'info');
  };

  const parseDrafter = (drafterStr: string) => {
    if (!drafterStr) return { dept: '', pos: '', name: '' };
    if (drafterStr.includes('|')) {
      const parts = drafterStr.split('|');
      return {
        dept: parts[0] || '',
        pos: parts[1] || '',
        name: parts[2] || '',
      };
    }
    const parts = drafterStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      return {
        dept: parts[0],
        pos: parts[1],
        name: parts.slice(2).join(' '),
      };
    } else if (parts.length === 2) {
      return {
        dept: '',
        pos: parts[1],
        name: parts[0],
      };
    }
    return {
      dept: '',
      pos: '',
      name: drafterStr,
    };
  };

  // Selected report from history for editing
  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);

  // Local notification state
  const [localNotification, setLocalNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const triggerLocalNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setLocalNotification({ text, type });
    setTimeout(() => {
      setLocalNotification(null);
    }, 4500);
  };

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Target ID of report to delete (for custom confirmation dialog)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // State to show print dialog error warning modal (when window.print is blocked by iframe sandbox)
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Filter for plan categories ('전체', '사내', '사외')
  const [planCategoryFilter, setPlanCategoryFilter] = useState<'전체' | '사내' | '사외'>('전체');

  // 연도 선택 필터 State (디폴트는 현재 연도)
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  // Filter education plans that already have drafts (COMPLETED DRAFTS ONLY!)
  const plansWithDrafts = plans.filter((p) => drafts.some((d) => d.plan_id === p.id));

  // Auto-generate report ID based on selected draft's ID or fallback date
  const autoGenerateReportId = (matchedDraft: EducationDraft | undefined, date: string) => {
    if (matchedDraft && matchedDraft.id) {
      return matchedDraft.id.replace('DSEDU-', 'DSEREP-').replace('DSED-', 'DSEREP-');
    }
    const cleanDate = date.split('T')[0].trim();
    const dateStr = cleanDate.replace(/-/g, '');
    const sameDateReports = reports.filter((r) => r.id.startsWith(`DSEREP-${dateStr}`));
    const nextSerial = String(sameDateReports.length + 1).padStart(3, '0');
    return `DSEREP-${dateStr}-${nextSerial}`;
  };

  // Synchronize report form on plan selection
  useEffect(() => {
    if (selectedPlanId) {
      const matchedDraft = drafts.find((d) => d.plan_id === selectedPlanId);
      const selectedPlan = plans.find((p) => p.id === selectedPlanId);

      if (matchedDraft && selectedPlan) {
        setDraftId(matchedDraft.id);

        if (editingReportIndex === null) {
          const nextId = autoGenerateReportId(matchedDraft, reportDate);
          setReportId(nextId);

          const parts = parseDrafter(matchedDraft.drafter);
          setDepartment(parts.dept);
          setPosition(parts.pos);
          setDrafterName(parts.name);

          setPurpose(matchedDraft.purpose || '');
          setBudgetBreakdown(matchedDraft.budget_breakdown || '');

          if (!summary) {
            setSummary(
              `수립된 교육 계획 및 기안 내용에 따라 [${selectedPlan.title}] 교육을 무사히 이수하였습니다.\n` +
                `1. 교육 주요 요약: ${matchedDraft.purpose}\n` +
                `2. 교육 성과: 실무 공정 스마트화 및 실무 유관 지식 습득, 팀 내 핵심 노하우를 확보하고 실습을 통한 현장 문제 해결 역량을 극대화하였습니다.\n` +
                `3. 만족도 평가: 교육 참석자 설문 결과 직무 적합성 및 강사 만족도 전원 우수 평가를 획득하였습니다.`
            );
          }

          if (!futurePlan) {
            setFuturePlan(
              `1. 현업 적용 계획:\n` +
                `  - 교육 이수 내용을 바탕으로 관련 설비 운용 효율 향상 및 예방 정비 기법 도입 (차주 적용 시작)\n` +
                `  - 부서 내 자체 세미나 교육을 개설하여 습득한 기술 노하우를 팀 전체에 공유 전파 예정\n` +
                `2. 기대 효과:\n` +
                `  - 최신 가이드라인 정립을 통한 작업 시간 단축 및 품질 표준화 달성\n` +
                `  - 교육 환류를 통한 직무 만족도 고취 및 연쇄적인 현장 공정 불량률 감소 기대`
            );
          }
        } else {
          setPurpose(matchedDraft.purpose || '');
          setBudgetBreakdown(matchedDraft.budget_breakdown || '');
        }
      }
    }
  }, [selectedPlanId, editingReportIndex, drafts, plans, reportDate]);

  // Handle preselected plan when clicking "보고서" from the plans tab
  useEffect(() => {
    if (preselectedPlanId) {
      const plan = plans.find((p) => p.id === preselectedPlanId);
      if (plan) {
        setSelectedPlanId(preselectedPlanId);

        const existingReport = reports.find((r) => (r.plan_id || r.planId || '').toString().trim() === preselectedPlanId.toString().trim());
        if (existingReport) {
          const index = reports.findIndex((r) => (r.plan_id || r.planId || '').toString().trim() === preselectedPlanId.toString().trim());
          handleSelectReportForEdit(existingReport, index);
          setReportDate((existingReport.report_date || existingReport.reportDate || '').split('T')[0].trim());
          triggerLocalNotification('이미 작성된 결과보고서가 존재하여 해당 보고서를 불러왔습니다.', 'info');
        } else {
          const matchedDraft = drafts.find((d) => d.plan_id === preselectedPlanId);
          setEditingReportIndex(null);
          
          const nextId = autoGenerateReportId(matchedDraft, reportDate);
          setReportId(nextId);

          if (matchedDraft) {
            setDraftId(matchedDraft.id);
            
            const parts = parseDrafter(matchedDraft.drafter);
            setDepartment(parts.dept);
            setPosition(parts.pos);
            setDrafterName(parts.name);

            setPurpose(matchedDraft.purpose || '');
            setBudgetBreakdown(matchedDraft.budget_breakdown || '');

            setSummary(
              `수립된 교육 계획 및 기안 내용에 따라 [${plan.title}] 교육을 무사히 이수하였습니다.\n` +
                `1. 교육 주요 요약: ${matchedDraft.purpose}\n` +
                `2. 교육 성과: 실무 공정 스마트화 및 실무 유관 지식 습득, 팀 내 핵심 노하우를 확보하고 실습을 통한 현장 문제 해결 역량을 극대화하였습니다.\n` +
                `3. 만족도 평가: 교육 참석자 설문 결과 직무 적합성 및 강사 만족도 전원 우수 평가를 획득하였습니다.`
            );
            setFuturePlan(
              `1. 현업 적용 계획:\n` +
                `  - 교육 이수 내용을 바탕으로 관련 설비 운용 효율 향상 및 예방 정비 기법 도입 (차주 적용 시작)\n` +
                `  - 부서 내 자체 세미나 교육을 개설하여 습득한 기술 노하우를 팀 전체에 공유 전파 예정\n` +
                `2. 기대 효과:\n` +
                `  - 최신 가이드라인 정립을 통한 작업 시간 단축 및 품질 표준화 달성\n` +
                `  - 교육 환류를 통한 직무 만족도 고취 및 연쇄적인 현장 공정 불량률 감소 기대`
            );
          } else {
            setDraftId('');
            setDepartment('');
            setPosition('');
            setDrafterName('');
            setPurpose('');
            setBudgetBreakdown('');
            setSummary('');
            setFuturePlan('');
          }
          setErrors({});
          triggerLocalNotification('새 교육 결과보고서 작성을 시작합니다.', 'success');
        }
      }
      onClearPreselectedPlan?.();
    }
  }, [preselectedPlanId, plans, drafts, reports, reportDate]);

  const handlePlanSelection = (planId: string) => {
    setSelectedPlanId(planId);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.selectedPlanId;
      return copy;
    });

    if (!planId) {
      handleResetForm();
      return;
    }

    const existingReport = reports.find((r) => (r.plan_id || r.planId || '').toString().trim() === planId.toString().trim());
    if (existingReport) {
      if (editingReportIndex === null || (reports[editingReportIndex].plan_id || reports[editingReportIndex].planId || '') !== planId) {
        setErrors((prev) => ({
          ...prev,
          selectedPlanId: '이미 결과보고서가 작성된 교육계획입니다.',
        }));
        triggerLocalNotification('이미 결과보고서가 작성된 교육계획입니다. 해당 보고서가 로드됩니다.', 'info');
        
        const index = reports.findIndex((r) => (r.plan_id || r.planId || '').toString().trim() === planId.toString().trim());
        handleSelectReportForEdit(existingReport, index);
      }
    }
  };

  const handleSelectReportForEdit = (report: EducationReport, index: number) => {
    setEditingReportIndex(index);
    setSelectedPlanId(report.plan_id || report.planId || '');
    setReportId(report.id);
    setDraftId(report.draft_id || report.draftId || '');
    setDepartment(report.department);
    setPosition(report.position);
    setDrafterName(report.drafter_name || report.drafterName || '');

    setReportDate((report.report_date || report.reportDate || '').split('T')[0].trim());
    setSummary(report.summary);
    setFuturePlan(report.future_plan || report.futurePlan || '');
    setSatisfactionScore(report.satisfaction_score !== undefined ? report.satisfaction_score : (report.satisfactionScore || 5.0));
    setCertificateFile(report.certificate_file || report.certificateFile || '');
    setCertificateFileName(report.certificate_file_name || report.certificateFileName || '');
    
    const matchedDraft = drafts.find((d) => d.plan_id === (report.plan_id || report.planId));
    if (matchedDraft) {
      setPurpose(matchedDraft.purpose || '');
      setBudgetBreakdown(matchedDraft.budget_breakdown || '');
    } else {
      setPurpose('');
      setBudgetBreakdown('');
    }

    setErrors({});
  };

  const handleResetForm = () => {
    setEditingReportIndex(null);
    setSelectedPlanId('');
    setReportId('');
    setDraftId('');
    setDepartment('');
    setPosition('');
    setDrafterName('');
    setReportDate(new Date().toISOString().split('T')[0]);
    setSummary('');
    setFuturePlan('');
    setPurpose('');
    setBudgetBreakdown('');
    setSatisfactionScore(5.0);
    setCertificateFile('');
    setCertificateFileName('');
    setErrors({});
  };

  const handleDeleteReport = (targetReportId: string) => {
    const targetIndex = reports.findIndex((r) => r.id === targetReportId);
    
    onDeleteReport(targetIndex).catch((err) => {
      console.error('Failed to sync deletion on spreadsheet:', err);
      triggerLocalNotification('구글 스프레드시트 삭제 반영 실패', 'error');
    });

    if (editingReportIndex === targetIndex && targetIndex !== -1) {
      handleResetForm();
    } else if (editingReportIndex !== null && targetIndex !== -1 && targetIndex < editingReportIndex) {
      setEditingReportIndex((prev) => (prev !== null ? prev - 1 : null));
    }
    triggerLocalNotification('교육 결과보고서가 즉시 삭제되었습니다.', 'success');
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeWarning(true);
    } else {
      const originalTitle = document.title;
      try {
        const planTitle = selectedPlan ? selectedPlan.title : '교육결과보고서';
        const planTarget = selectedPlan ? selectedPlan.target : '대상자';
        const titleParts = [reportDate, planTitle, planTarget]
          .filter(Boolean)
          .map((p) => p.replace(/[\/\\?%*:|"<>\x00-\x1F\s]+/g, '_').trim());
        const dynamicTitle = titleParts.join('_');
        
        document.title = dynamicTitle;
        window.print();
      } catch (err) {
        setShowPrintIframeWarning(true);
      } finally {
        document.title = originalTitle;
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedPlanId) newErrors.selectedPlanId = '연관 교육 계획을 선택해주세요.';
    if (!reportId.trim()) newErrors.reportId = '보고서 번호를 입력해주세요.';
    if (!department.trim()) newErrors.department = '부서를 입력해주세요.';
    if (!position.trim()) newErrors.position = '직급을 입력해주세요.';
    if (!drafterName.trim()) newErrors.drafterName = '성명을 입력해주세요.';
    if (!reportDate) newErrors.reportDate = '보고일자를 선택해주세요.';

    // 💡 보고일자 >= 교육 마지막 일정 검증 (시차 및 UTC 타임스탬프 오류를 원천 차단하는 정밀 문자열 비교)
    if (reportDate && selectedPlan && selectedPlan.schedule) {
      const reportDateClean = reportDate.split('T')[0].trim();
      const eduYear = selectedPlan.date ? selectedPlan.date.split('T')[0].trim().split('-')[0] : new Date().getFullYear();
      const scheduleParts = selectedPlan.schedule.split('~');
      
      if (scheduleParts.length === 2) {
        const endDateStr = `${eduYear}-${scheduleParts[1].trim().replace('/', '-')}`;
        const eduEndTimeStr = endDateStr.split('T')[0].trim();

        if (reportDateClean < eduEndTimeStr) {
          newErrors.reportDate = '보고일자는 교육 마지막 일자보다 같거나 나중이어야 합니다.';
          alert('❌ 보고일자는 교육 마지막 일자보다 같거나 나중이어야 합니다.');
        }
      }
    }

    if (!summary.trim()) newErrors.summary = '교육 결과 요약 및 성과를 입력해주세요.';
    if (!futurePlan.trim()) newErrors.futurePlan = '향후 현업 적용 계획 및 기대효과를 입력해주세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchReports = async (year: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}?action=read&sheetName=education_reports&year=${year}&t=${new Date().getTime()}`);
      
      if (response.data && Array.isArray(response.data)) {
        const mappedData: EducationReport[] = response.data.map((item: any) => ({
          id: item.id || '',
          // 💡 카멜 케이스로 변환되어 넘어오든 원본이 오든 무조건 컴포넌트 표준인 스네이크 케이스로 강제 통합 수용
          plan_id: (item.plan_id || item.planId || '').toString().trim(),
          planId: (item.plan_id || item.planId || '').toString().trim(),
          draft_id: (item.draft_id || item.draftId || '').toString().trim(),
          draftId: (item.draft_id || item.draftId || '').toString().trim(),
          department: item.department || '',
          position: item.position || '',
          drafter_name: item.drafter_name || item.drafterName || '',
          drafterName: item.drafter_name || item.drafterName || '',
          report_date: item.report_date || item.reportDate || '',
          reportDate: item.report_date || item.reportDate || '',
          summary: item.summary || '',
          future_plan: item.future_plan || item.futurePlan || '',
          futurePlan: item.future_plan || item.futurePlan || '',
          satisfaction_score: Number(item.satisfaction_score || item.satisfactionScore || 5.0),
          satisfactionScore: Number(item.satisfaction_score || item.satisfactionScore || 5.0),
          certificate_file: item.certificate_file || item.certificateFile || '',
          certificateFile: item.certificate_file || item.certificateFile || '',
          certificate_file_name: item.certificate_file_name || item.certificateFileName || '',
          certificateFileName: item.certificate_file_name || item.certificateFileName || '',
          year: (item.year || year).toString().trim()
        }));
        
        const filtered = mappedData.filter((r: EducationReport) => r.year === year.toString().trim());
        setReports(filtered);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("결과보고서 로드 실패:", error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 💡 [2중 보고서 저장부 정밀 타격] 전송 페이로드에 UTC 타임스탬프가 절대 붙지 않도록 완벽하게 날짜 가공 격리
    const cleanReportDate = reportDate.split('T')[0].trim();

    const reportData: EducationReport = {
      id: reportId.trim(),
      draft_id: draftId,
      plan_id: selectedPlanId,
      department: department.trim(),
      position: position.trim(),
      drafter_name: drafterName.trim(),
      report_date: cleanReportDate,
      summary: summary.trim(),
      future_plan: futurePlan.trim(),
      satisfaction_score: Number(satisfactionScore) || 5.0,
      certificate_file: certificateFile || undefined,
      certificate_file_name: certificateFileName || undefined,
      // camelCase aliases for complete robustness and double compatibility
      draftId: draftId,
      planId: selectedPlanId,
      drafterName: drafterName.trim(),
      reportDate: cleanReportDate,
      futurePlan: futurePlan.trim(),
      satisfactionScore: Number(satisfactionScore) || 5.0,
      certificateFile: certificateFile || undefined,
      certificateFileName: certificateFileName || undefined,
    };

    try {
      if (editingReportIndex !== null) {
        await onUpdateReport(reportData, editingReportIndex);
        triggerLocalNotification('결과보고서가 수정되었습니다.', 'success');
      } else {
        if (reports.some((r) => r.id === reportData.id)) {
          setErrors((prev) => ({
            ...prev,
            reportId: '이미 존재하는 보고서 번호입니다. 다른 번호를 사용해 주세요.',
          }));
          return;
        }
        const finalId = await onAddReport(reportData);
        if (finalId) {
          setReportId(finalId);
        }
        triggerLocalNotification('새 교육 결과보고서가 작성되었습니다.', 'success');
      }

      // 구글 시트 등록이 성공한 즉시(또는 수정 완료 후) 강제로 최신 데이터 다시 리로드
      await fetchReports(selectedYear);
      if (onFetchReports) {
        await onFetchReports(selectedYear);
      }

      // 데이터 저장이 완전히 끝난 후에는 입력 폼 내부의 모든 작성란 State 값들을 깨끗하게 비워줌 (Clear)
      handleResetForm();
    } catch (err) {
      console.error('Failed to save report:', err);
      triggerLocalNotification('결과보고서 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr) return '';
    let cleanDate = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative w-full max-w-full box-border overflow-x-hidden">
      <AnimatePresence>
        {localNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 no-print"
          >
            <div
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 ${
                localNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : localNotification.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-100'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-100'
              }`}
            >
              <span>{localNotification.text}</span>
              <button
                type="button"
                onClick={() => setLocalNotification(null)}
                className="hover:opacity-80 font-bold ml-auto"
              >
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT COLUMN */}
      <div className="lg:col-span-5 space-y-6 no-print">
        {plansWithDrafts.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-700 flex gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">기안 완료된 교육 계획 없음</p>
              <p className="mt-1 font-normal leading-relaxed">
                결과보고서를 작성하기 위해서는, 먼저 <span className="font-semibold text-indigo-700">'교육 기안서 작성 및 인쇄'</span> 탭에서 기안서 작성이 완료(채번 완료)된 교육 계획이 존재해야 합니다.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PenTool className="w-4.5 h-4.5 text-indigo-500" />
              {editingReportIndex !== null ? '결과보고서 수정' : '새 교육 결과보고서 작성'}
            </h3>
            {editingReportIndex !== null && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                신규 작성 전환
              </button>
            )}
          </div>

          <form onSubmit={handleSaveReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                1. 연간 교육 선택 <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanSelection(e.target.value)}
                className={`w-full bg-gray-50 border rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer ${
                  errors.selectedPlanId ? 'border-rose-400 bg-rose-50/20' : 'border-gray-200'
                }`}
              >
                <option value="">-- 기안 완료된 교육 목록 선택 --</option>
                {plansWithDrafts.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    [{plan.category}] {plan.title} ({plan.date ? plan.date.split('T')[0] : ''})
                  </option>
                ))}
              </select>
              {errors.selectedPlanId && (
                <p className="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.selectedPlanId}
                </p>
              )}
            </div>

            {selectedPlan && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-600 flex justify-between items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <p>
                    <span className="font-bold text-gray-500">교육기관:</span> {selectedPlan.institution} |{' '}
                    <span className="font-bold text-gray-500">강사:</span> {selectedPlan.instructor}
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">교육대상:</span> {selectedPlan.target || '미지정'} {selectedPlan.headcount ? `(${selectedPlan.headcount}명)` : ''}
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">교육일정:</span> {selectedPlan.schedule} ({selectedPlan.time_range}H) |{' '}
                    <span className="font-bold text-gray-500">총시간:</span> {selectedPlan.hours}시간
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  2-1. 결과보고서 번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={reportId || '(교육 계획 선택 시 자동 기입)'}
                  readOnly
                  placeholder="교육 계획 선택 시 자동 생성"
                  className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm bg-gray-50 font-mono text-[11px] outline-none text-gray-500 select-none"
                />
                {errors.reportId && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1.5">{errors.reportId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  2-2. 보고일자 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => {
                    setReportDate(e.target.value);
                    if (editingReportIndex === null && selectedPlanId) {
                      const matched = drafts.find((d) => d.plan_id === selectedPlanId);
                      setReportId(autoGenerateReportId(matched, e.target.value));
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                />
                {errors.reportDate && <p className="text-xs text-rose-500 mt-1">{errors.reportDate}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                3. 작성자 정보 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 관리팀"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                  {errors.department && <p className="text-[10px] text-rose-500 mt-1">{errors.department}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: 과장"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                  {errors.position && <p className="text-[10px] text-rose-500 mt-1">{errors.position}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={drafterName}
                    onChange={(e) => setDrafterName(e.target.value)}
                    placeholder="예: 염지원"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                  {errors.drafterName && <p className="text-[10px] text-rose-500 mt-1">{errors.drafterName}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                3-2. 종합 교육 만족도 평가 <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-indigo-50/20 p-3 rounded-xl border border-indigo-50">
                <select
                  value={satisfactionScore}
                  onChange={(e) => setSatisfactionScore(Number(e.target.value))}
                  className="w-full sm:w-48 bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="5.0">5.0 (매우 만족)</option>
                  <option value="4.5">4.5 (만족)</option>
                  <option value="4.0">4.0 (약간 만족)</option>
                  <option value="3.5">3.5 (보통)</option>
                  <option value="3.0">3.0 (약간 불만족)</option>
                  <option value="2.0">2.0 (불만족)</option>
                  <option value="1.0">1.0 (매우 불만족)</option>
                </select>
                <span className="text-[11px] text-gray-400">결과보고서 제출 및 마감 처리를 위해 수강생 설문 조사 기준 평점을 입력해 주세요.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                4. 교육 목적 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="교육 기안서에서 목적이 자동으로 입력됩니다."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                5. 교육 결과 요약 및 성과 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="교육 수료 내용, 참석자 평가, 주요 교육 습득 항목 및 교육 결과 성과 요약을 자세히 작성해주세요."
                rows={4}
                className={`w-full bg-gray-50 border rounded-xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed ${
                  errors.summary ? 'border-rose-400 bg-rose-50/20' : 'border-gray-200'
                }`}
              />
              {errors.summary && <p className="text-[10px] text-rose-500 font-bold mt-1.5">{errors.summary}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                6. 향후 현업 적용 계획 및 기대효과 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={futurePlan}
                onChange={(e) => setFuturePlan(e.target.value)}
                placeholder="수행한 교육 내용을 업무 현장에 어떻게 환류하고 적용할 것인지 계획 및 예상 기대효과를 기재해주세요."
                rows={4}
                className={`w-full bg-gray-50 border rounded-xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed ${
                  errors.futurePlan ? 'border-rose-400 bg-rose-50/20' : 'border-gray-200'
                }`}
              />
              {errors.futurePlan && <p className="text-[10px] text-rose-500 font-bold mt-1.5">{errors.futurePlan}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                7. 수료증 업로드 (선택)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 transition-all flex flex-col items-center justify-center cursor-pointer text-center ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50/50' 
                    : certificateFile 
                      ? 'border-emerald-300 bg-emerald-50/10' 
                      : 'border-gray-200 bg-gray-50/30 hover:border-indigo-400 hover:bg-gray-50/50'
                }`}
                onClick={() => document.getElementById('certificate-upload-input')?.click()}
              >
                <input
                  id="certificate-upload-input"
                  type="file"
                  accept="image/jpeg, image/png, image/jpg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {certificateFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-gray-800 max-w-[280px] truncate">{certificateFileName}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <X className="w-3 h-3" /> 파일 삭제
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-gray-700">클릭하여 파일 선택 또는 드래그 앤 드롭</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>{editingReportIndex !== null ? '보고서 수정' : '보고서 저장'}</span>
                  </>
                )}
              </button>
              <button type="button" onClick={handlePrint} className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-3 cursor-pointer flex items-center justify-center gap-1.5">
                <Printer className="w-4 h-4 text-gray-500" />
                <span>보고서 출력</span>
              </button>
            </div>
          </form>
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
          {(() => {
            // 작성된 결과보고서 목록에서 고유 연도를 추출하고 현재 연도를 항상 포함
            const availableYears = Array.from(new Set([
              new Date().getFullYear().toString(),
              ...reports.map((r) => {
                const rDate = r.report_date || r.reportDate || '';
                return rDate ? rDate.split('T')[0].substring(0, 4) : '';
              }).filter(Boolean)
            ])).sort((a, b) => b.localeCompare(a));

            const filteredReportsWithIndex = reports
              .map((r, originalIndex) => ({ r, originalIndex }))
              .filter(({ r }) => {
                const rDate = r.report_date || r.reportDate || '';
                const year = rDate ? rDate.split('T')[0].substring(0, 4) : '';
                return year === filterYear;
              });

            return (
              <>
                <div className="border-b border-gray-100 pb-2.5 mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                    작성된 교육 결과보고서 목록 ({filteredReportsWithIndex.length})
                  </h3>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredReportsWithIndex.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6">
                      {filterYear}년에 저장된 교육 결과보고서가 없습니다.
                    </p>
                  ) : (
                    filteredReportsWithIndex.map(({ r, originalIndex }) => {
                      const associatedPlan = plans.find((p) => p.id === (r.plan_id || r.planId));
                      return (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            editingReportIndex === originalIndex ? 'border-indigo-500 bg-indigo-50/20 shadow-xs' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectReportForEdit(r, originalIndex)}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <p className="font-bold text-gray-800 truncate">{associatedPlan ? associatedPlan.title : '연관 계획 정보 없음'}</p>
                            <div className="flex gap-2 text-gray-400 text-[10px]">
                              <span>번호: {r.id}</span>
                              <span>•</span>
                              <span>보고자: {r.drafter_name || r.drafterName} {r.position} ({r.department})</span>
                            </div>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(r.id); }} className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div id="print-area-wrapper" className="w-full bg-gray-100/70 py-6 px-4 md:px-8 rounded-3xl border border-gray-200 flex justify-center overflow-x-hidden max-w-full box-border print-section">
          <div id="printable-area" className="w-full max-w-[210mm] h-auto p-4 sm:p-[10mm] bg-white border border-gray-300 shadow-2xl relative text-black font-sans leading-relaxed flex flex-col justify-start gap-y-4 shrink-0 box-border overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 0; }

                /* 1. 불필요 요소 제거 및 공간 소멸 (display: none 복원) */
                .no-print, header, nav, aside, footer, button { display: none !important; }
                ::-webkit-scrollbar { display: none !important; }
                
                /* 2. 상위 래퍼 제한 완벽 해제 */
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

                .grid { display: block !important; gap: 0 !important; }
                .lg\\:col-span-7 {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }

                /* 3. absolute 버리고 position: fixed로 페이지 기준 고정 (좌우 쏠림/잘림 근본 해결) */
                #print-area-wrapper {
                    display: block !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    background: transparent !important;
                    overflow: visible !important;
                }

                #printable-area {
                    position: fixed !important; /* 조상 relative 탈출, 뷰포트/페이지 기준 배치 */
                    left: 10mm !important;      /* 직접 여백 제어 */
                    top: 10mm !important;
                    width: 190mm !important;    /* A4 세로폭(210mm - 양쪽 여백 20mm) 정확히 안착 */
                    max-width: 190mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    box-sizing: border-box !important;
                    overflow: visible !important;
                }

                /* 4. 테이블 레이아웃 고정 및 결재방 규격 */
                #printable-area table {
                    width: 100% !important;
                    max-width: 100% !important;
                    table-layout: fixed !important;
                    word-break: break-all !important;
                    border-collapse: collapse !important;
                }
                
                #printable-area table.approval-table {
                    width: 48mm !important;
                    margin-left: auto !important;
                    margin-right: 0 !important;
                }
                
                /* 5. 폰트 크기 확대 및 가독성 확보 */
                #printable-area table td, 
                #printable-area table th {
                    padding: 8px 6px !important;
                    font-size: 13px !important; 
                    line-height: 1.5 !important;
                }
                
                /* 전용 높이 유지 */
                .report-summary-box { min-height: 140px !important; }
                .report-future-box { min-height: 75px !important; }
                .draft-summary-box { min-height: 240px !important; }
                .draft-budget-box { min-height: 80px !important; }
              }
            `}</style>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] text-gray-400 font-mono tracking-tight">{reportId || 'DSEREP-YYYYMMDD-XXX'}</div>
                <table className="approval-table border-collapse border border-black text-center text-xs w-[180px] ml-auto" style={{ borderCollapse: 'collapse', border: '1px solid #000000', marginLeft: 'auto' }}>
                  <tbody>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="border-r border-black font-bold p-1 bg-gray-50 text-[10px]" style={{ border: '1px solid #000000', width: '15%' }}>결<br />재</td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px]" style={{ border: '1px solid #000000', width: '28.3%' }}>작 성</td>
                      <td className="border-r border-black p-1 bg-gray-50 font-bold text-[10px]" style={{ border: '1px solid #000000', width: '28.3%' }}>검 토</td>
                      <td className="p-1 bg-gray-50 font-bold text-[10px]" style={{ border: '1px solid #000000', width: '28.3%' }}>승 인</td>
                    </tr>
                    <tr style={{ height: '45px' }}>
                      <td className="border-r border-black p-1 text-center" style={{ border: '1px solid #000000', height: '45px', verticalAlign: 'middle' }}></td>
                      <td className="border-r border-black" style={{ border: '1px solid #000000', height: '45px' }}></td>
                      <td style={{ border: '1px solid #000000', height: '45px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center mb-10">
                <h1 className="text-2xl font-black tracking-[0.4em] border-b-2 border-double border-black pb-2 inline-block pl-[0.4em]">교 육 결 과 보 고 서</h1>
              </div>

              <table className="w-full border-collapse border border-black text-xs mb-3">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">보고서번호</td>
                    <td className="border-r border-black p-2.5 w-[32%] font-mono text-[11px]">{reportId || '(보고서 저장 시 부여)'}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 w-[18%] text-center">보고자 정보</td>
                    <td className="p-2.5 w-[32%]">{department && drafterName ? <span className="font-bold">{department} {drafterName} {position}</span> : '(보고자 입력)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">보고일자</td>
                    <td className="border-r border-black p-2.5">{getFormattedKoreanDate(reportDate)}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">기안연동번호</td>
                    <td className="p-2.5 font-mono text-[10px] text-gray-600">{draftId || '(기안서 번호)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교 육 명</td>
                    <td colSpan={3} className="p-2.5 font-bold text-sm bg-gray-50/10">{selectedPlan ? selectedPlan.title : '(교육 계획 선택 필요)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육기관</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? selectedPlan.institution : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">강 사</td>
                    <td className="p-2.5">{selectedPlan ? selectedPlan.instructor : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">대 상 자</td>
                    <td className="border-r border-black p-2.5">{selectedPlan ? `${selectedPlan.target} ${selectedPlan.headcount ? `(${selectedPlan.headcount}명)` : ''}` : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육일정</td>
                    <td className="p-2.5">{selectedPlan ? `${selectedPlan.date ? selectedPlan.date.split('T')[0] : ''} (${selectedPlan.schedule}) (${selectedPlan.hours}시간)` : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">집행비용</td>
                    <td className="border-r border-black p-2.5 font-bold text-emerald-800">{selectedPlan ? `₩${formatCurrency(selectedPlan.cost)}` : ''}</td>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">만족도</td>
                    <td className="p-2.5 font-bold text-indigo-700">{selectedPlan ? `만족도 ${satisfactionScore.toFixed(1)} (${getSatisfactionLabel(satisfactionScore)}) / 5.0` : ''}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육목적</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px]">{purpose || '(교육 목적 기재)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">소요예산 상세</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] text-gray-700">{budgetBreakdown || '(기안서의 예산 내역 자동 연동)'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">교육 결과<br />요약 및 성과</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                      <div className="report-summary-box min-h-[168px] w-full">{summary || '(교육 수료 내용 및 이수 평가 기재)'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">향후 현업<br />적용 계획 및<br />기대효과</td>
                    <td colSpan={3} className="p-2.5 whitespace-pre-wrap leading-relaxed text-[11px] align-top">
                      <div className="report-future-box min-h-[60px] w-full">{futurePlan || '(과제 및 정량적/정성적 기대효과 기재)'}</div>
                    </td>
                  </tr>
                  {certificateFile && (
                    <tr className="border-t border-black">
                      <td className="border-r border-black font-bold p-2.5 bg-gray-50 text-center">첨부 수료증</td>
                      <td colSpan={3} className="p-2.5 text-center">
                        <div className="flex flex-col items-center justify-center p-2 bg-gray-50/50 rounded-xl border border-gray-100 max-w-md mx-auto">
                          <img src={certificateFile} alt="Certificate Attachment" className="max-h-[140px] max-w-full object-contain rounded-lg shadow-sm border border-gray-200" referrerPolicy="no-referrer" />
                          <p className="text-[10px] text-gray-500 mt-1.5 font-bold font-mono">{certificateFileName}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center pt-2 border-t border-gray-100 mt-2 print:mt-1.5 pb-0">
              <p className="text-[11px] sm:text-xs text-gray-500 tracking-tight leading-relaxed mb-2 print:mb-1.5 font-medium max-w-[95%] mx-auto">위와 같이 연간 교육 계획에 의거하여 사내/사외 위탁 교육 결과를 보고하오니,<br />검토 후 결재하여 주시기 바랍니다.</p>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 tracking-wider mb-2 print:mb-1.5">{getFormattedKoreanDate(reportDate)}</p>
              <div className="flex flex-col items-center">
                <p className="text-sm sm:text-md font-extrabold text-gray-900 leading-none">(주)대성스틸</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">보고서를 삭제하시겠습니까?</h4>
                <p className="text-xs text-gray-400 mt-1">구글 스프레드시트에서도 즉시 삭제됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold">아니요</button>
                <button type="button" onClick={() => { handleDeleteReport(deleteTargetId); setDeleteTargetId(null); }} className="flex-1 rounded-xl bg-rose-600 text-white text-xs font-bold py-2">확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}