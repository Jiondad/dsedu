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
  Trash2,
  Printer,
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

  const setReports = (
    newReports: EducationReport[] | ((prev: EducationReport[]) => EducationReport[])
  ) => {
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
  const [certificateFile, setCertificateFile] = useState<string>(''); // Base64 (Compressed)
  const [certificateFileName, setCertificateFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Selected report from history for editing
  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);

  // Local notification state
  const [localNotification, setLocalNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const triggerLocalNotification = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setLocalNotification({ text, type });
    setTimeout(() => {
      setLocalNotification(null);
    }, 4500);
  };

  // 이미지를 구글 시트 셀 용량(50,000자 제한) 이내로 안전하게 자동 리사이징/압축하는 함수
  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      triggerLocalNotification('JPG, PNG 형식의 이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // 1차 압축 (품질 0.65)
          let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);

          // 만약 Base64 문자열이 45,000자를 넘으면 한 번 더 압축 (구글 시트 50,000자 제한 방어)
          if (compressedDataUrl.length > 45000) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.45);
          }

          setCertificateFile(compressedDataUrl);
          setCertificateFileName(file.name);
          triggerLocalNotification('증빙 이미지가 최적화되어 등록되었습니다.', 'success');
        }
      };
      img.src = event.target?.result as string;
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
    triggerLocalNotification('첨부 파일이 삭제되었습니다.', 'info');
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

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Target ID of report to delete (for custom confirmation dialog)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // State to show print dialog error warning modal (when window.print is blocked by iframe sandbox)
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

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

        const existingReport = reports.find(
          (r) =>
            (r.plan_id || r.planId || '').toString().trim() === preselectedPlanId.toString().trim()
        );
        if (existingReport) {
          const index = reports.findIndex(
            (r) =>
              (r.plan_id || r.planId || '').toString().trim() ===
              preselectedPlanId.toString().trim()
          );
          handleSelectReportForEdit(existingReport, index);
          setReportDate(
            (existingReport.report_date || existingReport.reportDate || '').split('T')[0].trim()
          );
          triggerLocalNotification(
            '이미 작성된 결과보고서가 존재하여 해당 보고서를 불러왔습니다.',
            'info'
          );
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
          setCertificateFile('');
          setCertificateFileName('');
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

    const existingReport = reports.find(
      (r) => (r.plan_id || r.planId || '').toString().trim() === planId.toString().trim()
    );
    if (existingReport) {
      if (
        editingReportIndex === null ||
        (reports[editingReportIndex].plan_id || reports[editingReportIndex].planId || '') !== planId
      ) {
        setErrors((prev) => ({
          ...prev,
          selectedPlanId: '이미 결과보고서가 작성된 교육계획입니다.',
        }));
        triggerLocalNotification(
          '이미 결과보고서가 작성된 교육계획입니다. 해당 보고서가 로드됩니다.',
          'info'
        );

        const index = reports.findIndex(
          (r) => (r.plan_id || r.planId || '').toString().trim() === planId.toString().trim()
        );
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
    setSatisfactionScore(
      report.satisfaction_score !== undefined
        ? Number(report.satisfaction_score)
        : Number(report.satisfactionScore) || 5.0
    );
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
    } else if (
      editingReportIndex !== null &&
      targetIndex !== -1 &&
      targetIndex < editingReportIndex
    ) {
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

    if (reportDate && selectedPlan && selectedPlan.schedule) {
      const reportDateClean = reportDate.split('T')[0].trim();
      const eduYear = selectedPlan.date
        ? selectedPlan.date.split('T')[0].trim().split('-')[0]
        : new Date().getFullYear();
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
      const response = await axios.get(
        `${API_URL}?action=read&sheetName=education_reports&year=${year}&t=${new Date().getTime()}`
      );

      if (response.data && Array.isArray(response.data)) {
        const mappedData: EducationReport[] = response.data.map((item: any) => ({
          id: item.id || '',
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
          year: (item.year || year).toString().trim(),
        }));

        const filtered = mappedData.filter(
          (r: EducationReport) => !r.year || r.year === year.toString().trim()
        );
        setReports(filtered);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('결과보고서 로드 실패:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
      certificate_file: certificateFile || '',
      certificate_file_name: certificateFileName || '',
      // camelCase 호환성 보장
      draftId: draftId,
      planId: selectedPlanId,
      drafterName: drafterName.trim(),
      reportDate: cleanReportDate,
      futurePlan: futurePlan.trim(),
      satisfactionScore: Number(satisfactionScore) || 5.0,
      certificateFile: certificateFile || '',
      certificateFileName: certificateFileName || '',
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

      // 최신 데이터 다시 리로드
      await fetchReports(selectedYear);
      if (onFetchReports) {
        await onFetchReports(selectedYear);
      }

      // 저장 완료 후에도 바로 인쇄하거나 증빙을 확인할 수 있도록 방금 저장한 데이터를 편집 상태로 유지
      // (원치 않으시면 목록에서 다시 클릭해 확인 가능)
    } catch (err) {
      console.error('Failed to save report:', err);
      triggerLocalNotification('결과보고서 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const getFormattedKoreanDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanDate = dateStr.split('T')[0].split(' ')[0];
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
                결과보고서를 작성하기 위해서는, 먼저{' '}
                <span className="font-semibold text-indigo-700">'교육 기안서 작성 및 인쇄'</span>{' '}
                탭에서 기안서 작성이 완료(채번 완료)된 교육 계획이 존재해야 합니다.
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
                    <span className="font-bold text-gray-500">교육기관:</span>{' '}
                    {selectedPlan.institution} |{' '}
                    <span className="font-bold text-gray-500">강사:</span> {selectedPlan.instructor}
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">교육대상:</span>{' '}
                    {selectedPlan.target || '미지정'}{' '}
                    {selectedPlan.headcount ? `(${selectedPlan.headcount}명)` : ''}
                  </p>
                  <p>
                    <span className="font-bold text-gray-500">교육일정:</span>{' '}
                    {selectedPlan.schedule} ({selectedPlan.time_range}H) |{' '}
                    <span className="font-bold text-gray-500">총시간:</span> {selectedPlan.hours}
                    시간
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
                {errors.reportDate && (
                  <p className="text-xs text-rose-500 mt-1">{errors.reportDate}</p>
                )}
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
                  {errors.department && (
                    <p className="text-[10px] text-rose-500 mt-1">{errors.department}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: 과장"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                  {errors.position && (
                    <p className="text-[10px] text-rose-500 mt-1">{errors.position}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={drafterName}
                    onChange={(e) => setDrafterName(e.target.value)}
                    placeholder="예: 염지원"
                    className="w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                  {errors.drafterName && (
                    <p className="text-[10px] text-rose-500 mt-1">{errors.drafterName}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                3-2. 종합 교육 만족도 평가 <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-indigo-50/20 p-3 rounded-xl border border-indigo-50">
                <select
                  value={satisfactionScore.toFixed(1)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSatisfactionScore(!isNaN(val) ? val : 5.0);
                  }}
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
                <span className="text-[11px] text-gray-400">
                  수강생 설문 조사 기준 평점을 선택해 주세요.
                </span>
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
              {errors.summary && (
                <p className="text-[10px] text-rose-500 font-bold mt-1.5">{errors.summary}</p>
              )}
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
              {errors.futurePlan && (
                <p className="text-[10px] text-rose-500 font-bold mt-1.5">{errors.futurePlan}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                7. 교육증빙 업로드 (수료증 / 교육사진)
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
                    <img
                      src={certificateFile}
                      alt="미리보기"
                      className="max-h-24 rounded-lg border border-gray-200 object-contain shadow-2xs"
                    />
                    <div className="text-xs font-bold text-gray-800 max-w-[280px] truncate">
                      {certificateFileName || '등록된 증빙 이미지'}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
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
                    <div className="text-xs font-bold text-gray-700">
                      클릭하여 이미지 선택 또는 드래그 앤 드롭
                    </div>
                    <p className="text-[10px] text-gray-400">
                      업로드 시 시트 저장 규격에 맞게 자동 최적화됩니다.
                    </p>
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
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-3 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>보고서 출력</span>
              </button>
            </div>
          </form>
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
          {(() => {
            const availableYears = Array.from(
              new Set([
                new Date().getFullYear().toString(),
                ...reports
                  .map((r) => {
                    const rDate = r.report_date || r.reportDate || '';
                    return rDate ? rDate.split('T')[0].substring(0, 4) : '';
                  })
                  .filter(Boolean),
              ])
            ).sort((a, b) => b.localeCompare(a));

            const filteredReportsWithIndex = reports
              .map((r, originalIndex) => ({ r, originalIndex }))
              .filter(({ r }) => {
                const rDate = r.report_date || r.reportDate || '';
                const year = rDate ? rDate.split('T')[0].substring(0, 4) : '';
                return !year || year === filterYear;
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
                      <option key={y} value={y}>
                        {y}년
                      </option>
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
                      const associatedPlan = plans.find(
                        (p) => p.id === (r.plan_id || r.planId)
                      );
                      const hasCert = Boolean(r.certificate_file || r.certificateFile);
                      return (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            editingReportIndex === originalIndex
                              ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectReportForEdit(r, originalIndex)}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-800 truncate">
                                {associatedPlan ? associatedPlan.title : '연관 계획 정보 없음'}
                              </p>
                              {hasCert && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ImageIcon className="w-2.5 h-2.5" /> 증빙첨부됨
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 text-gray-400 text-[10px]">
                              <span>번호: {r.id}</span>
                              <span>•</span>
                              <span>
                                보고자: {r.drafter_name || r.drafterName} {r.position} (
                                {r.department})
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(r.id);
                            }}
                            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                          >
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

      {/* RIGHT COLUMN (A4 WYSIWYG 미리보기 및 인쇄 영역) */}
      <div className="lg:col-span-7 flex flex-col items-center w-full">
        <div
          id="print-area-wrapper"
          className="w-full bg-slate-200/70 py-6 px-3 sm:px-6 rounded-3xl border border-gray-200 flex justify-center overflow-x-auto"
        >
          <div
            id="printable-area"
            className="a4-document-sheet border border-gray-300 shadow-xl"
          >
            {/* 상단 영역: 제목 + 결재란 + 본문 테이블 */}
            <div>
              {/* 문서 헤더 및 결재란 */}
              <div className="flex justify-between items-end mb-6 pb-2 border-b-2 border-black">
                <div>
                  <p className="text-[11px] font-bold text-gray-600 mb-1">
                    (주)대성스틸 교육훈련 관리규정
                  </p>
                  <h1 className="text-2xl font-black tracking-[0.25em] text-black">
                    교 육 결 과 보 고 서
                  </h1>
                </div>

                <table className="approval-table">
                  <tbody>
                    <tr>
                      <th
                        rowSpan={2}
                        className="bg-gray-100 font-bold"
                        style={{ width: '28px' }}
                      >
                        결<br />재
                      </th>
                      <th className="bg-gray-100 font-bold">담 당</th>
                      <th className="bg-gray-100 font-bold">검 토</th>
                      <th className="bg-gray-100 font-bold">승 인</th>
                    </tr>
                    <tr style={{ height: '50px' }}>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 본문 테이블 (중복 항목 제거 및 정돈) */}
              <table className="doc-table">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '34%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th>문서번호</th>
                    <td className="font-mono text-[11px]">{reportId || '(저장 시 자동채번)'}</td>
                    <th>보 고 자</th>
                    <td className="font-semibold">
                      {department || drafterName || position
                        ? `${department} ${position} ${drafterName}`.trim()
                        : '(작성자 정보 입력)'}
                    </td>
                  </tr>
                  <tr>
                    <th>기안번호</th>
                    <td className="font-mono text-[11px] text-gray-700">{draftId || '-'}</td>
                    <th>교육구분</th>
                    <td className="font-bold">
                      {selectedPlan ? `${selectedPlan.category}교육` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>교 육 명</th>
                    <td colSpan={3} className="font-bold text-[13px]">
                      {selectedPlan ? selectedPlan.title : '(연관 교육 계획을 선택해주세요)'}
                    </td>
                  </tr>
                  <tr>
                    <th>교육기관</th>
                    <td>{selectedPlan ? selectedPlan.institution : '-'}</td>
                    <th>강 사 명</th>
                    <td>{selectedPlan ? selectedPlan.instructor : '-'}</td>
                  </tr>
                  <tr>
                    <th>교육대상</th>
                    <td>
                      {selectedPlan
                        ? `${selectedPlan.target}${
                            selectedPlan.headcount ? ` (${selectedPlan.headcount}명)` : ''
                          }`
                        : '-'}
                    </td>
                    <th>교육일시</th>
                    <td>
                      {selectedPlan
                        ? `${
                            selectedPlan.schedule ||
                            (selectedPlan.date ? selectedPlan.date.split('T')[0] : '')
                          } (${selectedPlan.hours}시간)`
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>집행비용</th>
                    <td className="font-bold">
                      {selectedPlan ? `₩${formatCurrency(selectedPlan.cost)}` : '-'}
                    </td>
                    <th>교육만족도</th>
                    <td className="font-bold">
                      {selectedPlan
                        ? `${satisfactionScore.toFixed(1)}점 / 5.0점 (${getSatisfactionLabel(
                            satisfactionScore
                          )})`
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>교육목적</th>
                    <td colSpan={3} className="whitespace-pre-wrap">
                      {purpose || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>
                      교육 결과
                      <br />
                      요약 및 성과
                    </th>
                    <td colSpan={3} className="whitespace-pre-wrap align-top">
                      <div className="min-h-[115px]">
                        {summary || '(교육 수료 내용 및 주요 성과 기재)'}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th>
                      현업 적용 계획
                      <br />및 기대효과
                    </th>
                    <td colSpan={3} className="whitespace-pre-wrap align-top">
                      <div className="min-h-[85px]">
                        {futurePlan || '(향후 현업 적용 방안 및 기대효과 기재)'}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th>교육증빙 첨부</th>
                    <td colSpan={3} className="text-center align-middle">
                      {certificateFile ? (
                        <div className="py-1 flex flex-col items-center justify-center">
                          <img
                            src={certificateFile}
                            alt="교육증빙"
                            className="max-h-[185px] w-auto object-contain border border-gray-300"
                            referrerPolicy="no-referrer"
                          />
                          {certificateFileName && (
                            <p className="text-[10px] text-gray-500 mt-1 font-mono">
                              첨부파일: {certificateFileName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-gray-400 text-[11px]">
                          (첨부된 교육 수료증 또는 현장 사진 없음)
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 하단 서명 영역 */}
            <div className="text-center pt-4 mt-4">
              <p className="text-xs text-gray-800 mb-3 font-medium">
                위와 같이 교육훈련 이수 결과를 보고하오니 검토 후 재가하여 주시기 바랍니다.
              </p>
              <p className="text-xs font-bold text-black mb-3">
                {getFormattedKoreanDate(reportDate)}
              </p>
              <p className="text-base font-black tracking-widest text-black">
                주식회사 대성스틸
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">보고서를 삭제하시겠습니까?</h4>
                <p className="text-xs text-gray-400 mt-1">
                  구글 스프레드시트에서도 즉시 삭제됩니다.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold"
                >
                  아니요
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteReport(deleteTargetId);
                    setDeleteTargetId(null);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 text-white text-xs font-bold py-2"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
