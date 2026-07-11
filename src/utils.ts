/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EducationPlan, CategoryMetrics, EducationDraft, EducationReport } from './types';

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

/**
 * 구글 시트에서 가져온 영문 규격 필드(hours, cost)를 기반으로 
 * 대시보드 통계를 정확하게 산출하도록 교정했습니다.
 */
export function computeMetrics(plans: EducationPlan[]): CategoryMetrics {
  const inHouse: { totalHours: number; totalCost: number; count: number; totalHeadcount: number } = {
    totalHours: 0,
    totalCost: 0,
    count: 0,
    totalHeadcount: 0,
  };

  const external: { totalHours: number; totalCost: number; count: number; totalHeadcount: number } = {
    totalHours: 0,
    totalCost: 0,
    count: 0,
    totalHeadcount: 0,
  };

  plans.forEach((plan) => {
    console.log("통계 계산 중인 plan 객체:", plan);

    const hours = Number(plan.hours) || 0;
    const cost = Number(plan.cost) || Number(plan.estimated_cost) || 0;
    const headcount = plan.headcount !== undefined ? Number(plan.headcount) : parseTraineeCount(plan.target || '');

    if (plan.category === '사내') {
      inHouse.totalHours += hours;
      inHouse.totalCost += cost;
      inHouse.count += 1;
      inHouse.totalHeadcount += headcount;
    } else if (plan.category === '사외') {
      external.totalHours += hours;
      external.totalCost += cost;
      external.count += 1;
      external.totalHeadcount += headcount;
    }
  });

  const total = {
    totalHours: inHouse.totalHours + external.totalHours,
    totalCost: inHouse.totalCost + external.totalCost,
    count: inHouse.count + external.count,
    totalHeadcount: inHouse.totalHeadcount + external.totalHeadcount,
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
  const regex = /^\d{2}\/\d{2}$|^\d{2}~\d{2}$/;
  return regex.test(timeRange);
}

/**
 * Maps a sheet row back to an EducationPlan object.
 */
export function mapRowToPlan(row: any): EducationPlan {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const idVal = String(row.id ?? row.ID ?? '');

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
    const headcountVal = Number(row.headcount ?? 1) || 1;

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
      headcount: headcountVal,
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
  const headcountVal = Number(r[11]) || 1;

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
    headcount: headcountVal,
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
    plan.headcount !== undefined ? plan.headcount : 1,
  ];
}

/**
 * Maps a sheet row back to an EducationDraft object.
 * [정밀 교정] 구글 시트 영문 소문자 헤더와 React 필드명을 완벽 동기화하여 새로고침 증발 버그를 차단합니다.
 */
export function mapRowToDraft(row: any): EducationDraft {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return {
      id: String(row.id ?? row.ID ?? ''),
      plan_id: String(row.plan_id ?? row.planId ?? ''),
      drafter: String(row.drafter ?? ''),
      draft_date: String(row.draft_date ?? row.draftDate ?? ''),
      purpose: String(row.purpose ?? ''),
      content_summary: String(row.content_summary ?? row.contentSummary ?? ''),
      budget_breakdown: String(row.budget_breakdown ?? row.budgetBreakdown ?? ''),
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
    const id = String(row.id ?? row.ID ?? '');
    const draft_id = String(row.draft_id ?? row.draftId ?? '');
    const plan_id = String(row.plan_id ?? row.planId ?? '');
    const department = String(row.department ?? '');
    const position = String(row.position ?? '');
    const drafter_name = String(row.drafter_name ?? row.drafterName ?? '');
    const report_date = String(row.report_date ?? row.reportDate ?? '');
    const summary = String(row.summary ?? '');
    const future_plan = String(row.future_plan ?? row.futurePlan ?? '');
    const satisfaction_score = Number(row.satisfaction_score ?? row.satisfactionScore ?? 5.0);
    const certificate_file = row.certificate_file ?? row.certificateFile ?? '';
    const certificate_file_name = row.certificate_file_name ?? row.certificateFileName ?? '';
    const year = String(row.year ?? '');

    return {
      id,
      draft_id,
      plan_id,
      department,
      position,
      drafter_name,
      report_date,
      summary,
      future_plan,
      satisfaction_score,
      certificate_file,
      certificate_file_name,
      // camelCase aliases for perfect compatibility
      draftId: draft_id,
      planId: plan_id,
      drafterName: drafter_name,
      reportDate: report_date,
      futurePlan: future_plan,
      satisfactionScore: satisfaction_score,
      certificateFile: certificate_file,
      certificateFileName: certificate_file_name,
      year,
    };
  }

  const r = Array.isArray(row) ? row : [];
  const id = String(r[0] || '');
  const draft_id = String(r[1] || '');
  const plan_id = String(r[2] || '');
  const department = String(r[3] || '');
  const position = String(r[4] || '');
  const drafter_name = String(r[5] || '');
  const report_date = String(r[6] || '');
  const summary = String(r[7] || '');
  const future_plan = String(r[8] || '');
  const satisfaction_score = Number(r[9]) || 5.0;
  const year = String(r[10] || '');

  return {
    id,
    draft_id,
    plan_id,
    department,
    position,
    drafter_name,
    report_date,
    summary,
    future_plan,
    satisfaction_score,
    // camelCase aliases
    draftId: draft_id,
    planId: plan_id,
    drafterName: drafter_name,
    reportDate: report_date,
    futurePlan: future_plan,
    satisfactionScore: satisfaction_score,
    year,
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