/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EducationPlan, CategoryMetrics, EducationDraft, EducationReport } from './types';

/**
 * 구글 시트에서 가져온 영문 규격 필드(hours, cost)를 기반으로 
 * 대시보드 통계를 정확하게 산출하도록 교정했습니다.
 */
export function computeMetrics(plans: EducationPlan[]): CategoryMetrics {
  const inHouse: { totalHours: number; totalCost: number; count: number } = {
    totalHours: 0,
    totalCost: 0,
    count: 0,
  };

  const external: { totalHours: number; totalCost: number; count: number } = {
    totalHours: 0,
    totalCost: 0,
    count: 0,
  };

plans.forEach((plan) => {
  // 💡 아래 로그를 넣어 브라우저 콘솔(F12)에서 데이터 구조를 직접 확인해 봅니다.
  console.log("통계 계산 중인 plan 객체:", plan);
  
  const hours = Number(plan.hours) || 0;
  const cost = Number(plan.cost) || Number(plan.estimated_cost) || 0; // ➔ 이렇게 방어 코드를 짜두면 안전합니다!

    if (plan.category === '사내') {
      inHouse.totalHours += hours;
      inHouse.totalCost += cost;
      inHouse.count += 1;
    } else if (plan.category === '사외') {
      external.totalHours += hours;
      external.totalCost += cost;
      external.count += 1;
    }
  });

  const total = {
    totalHours: inHouse.totalHours + external.totalHours,
    totalCost: inHouse.totalCost + external.totalCost,
    count: inHouse.count + external.count,
  };

  return {
    inHouse,
    external,
    total,
  };
}

/**
 * Formats a number with thousands separators (Korean Won representation).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'decimal',
  }).format(amount);
}

/**
 * Validates 'MM/DD~MM/DD' format.
 */
export function validateSchedule(schedule: string): boolean {
  const regex = /^\d{2}\/\d{2}~\d{2}\/\d{2}$/;
  return regex.test(schedule);
}

/**
 * Validates 'HH~HH' or 'HH:MM~HH:MM' format.
 */
export function validateTimeRange(timeRange: string): boolean {
  const regex = /^\d{2}~\d{2}$/;
  return regex.test(timeRange);
}

/**
 * Maps a sheet row back to an EducationPlan object.
 * 프론트엔드 UI 컴포넌트와 백엔드 API가 완벽하게 교감하도록 매핑 규칙을 통일했습니다.
 */
export function mapRowToPlan(row: any): EducationPlan {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const idVal = String(row.id ?? row.ID ?? '');

// 💡 날짜 뒤에 붙은 T15:00... 지저분한 문자열을 'T' 기준으로 잘라 앞의 날짜만 가져옵니다.
let dateVal = String(row.date ?? row.edu_date ?? '');
if (dateVal.includes('T')) {
  dateVal = dateVal.split('T')[0];
}
    const categoryVal = String(row.category ?? '') === '사외' ? '사외' : '사내';
    const titleVal = String(row.title ?? '');
    const institutionVal = String(row.institution ?? '');
    const instructorVal = String(row.instructor ?? '');
    const targetVal = String(row.target ?? '');
    const scheduleVal = String(row.schedule ?? '');
    const timeRangeVal = String(row.time_range ?? row.timeRange ?? '');
    const hoursVal = Number(row.hours) || 0;
    const costVal = Number(row.cost) || 0;

    return {
      id: idVal,
      edu_date: dateVal,
      date: dateVal,
      category: categoryVal,
      title: titleVal,
      agency: institutionVal,
      institution: institutionVal,
      instructor: instructorVal,
      target_group: targetVal,
      target: targetVal,
      schedule: scheduleVal,
      time_range: timeRangeVal,
      total_hours: hoursVal, // 호환성 유지
      hours: hoursVal,       // 진짜 UI 매핑용
      estimated_cost: costVal, // 호환성 유지
      cost: costVal,         // 진짜 UI 매핑용
    };
  }

  const r = Array.isArray(row) ? row : [];
  const idVal = String(r[0] || '');
  const dateVal = String(r[1] || '');
  const categoryVal = String(r[2] || '') === '사외' ? '사외' : '사내';
  const titleVal = String(r[3] || '');
  const institutionVal = String(r[4] || '');
  const instructorVal = String(r[5] || '');
  const targetVal = String(r[6] || '');
  const scheduleVal = String(r[7] || '');
  const timeRangeVal = String(r[8] || '');
  const hoursVal = Number(r[9]) || 0;
  const costVal = Number(r[10]) || 0;

  return {
    id: idVal,
    edu_date: dateVal,
    date: dateVal,
    category: categoryVal,
    title: titleVal,
    agency: institutionVal,
    institution: institutionVal,
    instructor: instructorVal,
    target_group: targetVal,
    target: targetVal,
    schedule: scheduleVal,
    time_range: timeRangeVal,
    total_hours: hoursVal,
    hours: hoursVal,
    estimated_cost: costVal,
    cost: costVal,
  };
}

/**
 * Maps an EducationPlan object to a sheet row (array of values).
 */
export function mapPlanToRow(plan: EducationPlan): any[] {
  return [
    plan.id,
    plan.date || plan.edu_date,
    plan.category,
    plan.title,
    plan.institution || plan.agency,
    plan.instructor,
    plan.target || plan.target_group,
    plan.schedule,
    plan.time_range,
    plan.hours !== undefined ? plan.hours : plan.total_hours,
    plan.cost !== undefined ? plan.cost : plan.estimated_cost,
  ];
}

/**
 * Maps a sheet row back to an EducationDraft object.
 */
export function mapRowToDraft(row: any): EducationDraft {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return {
      id: String(row.id ?? row.ID ?? row['기안번호'] ?? ''),
      plan_id: String(row.plan_id ?? row.planId ?? row['교육계획ID'] ?? ''),
      drafter: String(row.drafter ?? row['기안자'] ?? ''),
      draft_date: String(row.draft_date ?? row.draftDate ?? row['기안일자'] ?? ''),
      purpose: String(row.purpose ?? row['교육목적'] ?? ''),
      content_summary: String(row.content_summary ?? row.contentSummary ?? row['교육내용'] ?? ''),
      budget_breakdown: String(row.budget_breakdown ?? row.budgetBreakdown ?? row['소요예산 상세내역'] ?? ''),
    };
  }

  const r = Array.isArray(row) ? row : [];
  return {
    id: String(r[0] || ''),
    plan_id: String(r[1] || ''),
    drafter: String(r[2] || ''),
    draft_date: String(r[3] || ''),
    purpose: String(r[4] || ''),
    content_summary: String(r[5] || ''),
    budget_breakdown: String(r[6] || ''),
  };
}

/**
 * Maps an EducationDraft object to a sheet row (array of values).
 */
export function mapDraftToRow(draft: EducationDraft): any[] {
  return [
    draft.id,
    draft.plan_id,
    draft.drafter,
    draft.draft_date,
    draft.purpose,
    draft.content_summary,
    draft.budget_breakdown,
  ];
}

/**
 * Maps a sheet row back to an EducationReport object.
 */
export function mapRowToReport(row: any): EducationReport {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return {
      id: String(row.id ?? row.ID ?? row['보고서번호'] ?? ''),
      draft_id: String(row.draft_id ?? row.draftId ?? row['기안번호'] ?? ''),
      plan_id: String(row.plan_id ?? row.planId ?? row['교육계획ID'] ?? ''),
      department: String(row.department ?? row['부서'] ?? ''),
      position: String(row.position ?? row['직급'] ?? ''),
      drafter_name: String(row.drafter_name ?? row.drafterName ?? row['성명'] ?? ''),
      report_date: String(row.report_date ?? row.reportDate ?? row['보고일자'] ?? ''),
      summary: String(row.summary ?? row['교육결과 및 성과'] ?? ''),
      future_plan: String(row.future_plan ?? row.futurePlan ?? row['향후 적용계획 및 기대효과'] ?? ''),
      satisfaction_score: Number(row.satisfaction_score ?? row.satisfactionScore ?? row['만족도점수'] ?? 5.0),
    };
  }

  const r = Array.isArray(row) ? row : [];
  return {
    id: String(r[0] || ''),
    draft_id: String(r[1] || ''),
    plan_id: String(r[2] || ''),
    department: String(r[3] || ''),
    position: String(r[4] || ''),
    drafter_name: String(r[5] || ''),
    report_date: String(r[6] || ''),
    summary: String(r[7] || ''),
    future_plan: String(r[8] || ''),
    satisfaction_score: Number(r[9]) || 5.0,
  };
}

/**
 * Maps an EducationReport object to a sheet row (array of values).
 */
export function mapReportToRow(report: EducationReport): any[] {
  return [
    report.id,
    report.draft_id,
    report.plan_id,
    report.department,
    report.position,
    report.drafter_name,
    report.report_date,
    report.summary,
    report.future_plan,
    report.satisfaction_score || 5.0,
  ];
}
