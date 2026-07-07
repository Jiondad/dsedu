/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EducationPlan, CategoryMetrics, EducationDraft, EducationReport } from './types';

/**
 * Computes metrics from education plans, calculating totals and counts
 * categorized by '사내' (In-house) and '사외' (External).
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
    const hours = Number(plan.total_hours) || 0;
    const cost = Number(plan.estimated_cost) || 0;

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
 * Maps a sheet row (array of strings) back to an EducationPlan object.
 */
export function mapRowToPlan(row: any[]): EducationPlan {
  return {
    id: String(row[0] || ''),
    edu_date: String(row[1] || ''),
    category: row[2] === '사외' ? '사외' : '사내',
    title: String(row[3] || ''),
    agency: String(row[4] || ''),
    instructor: String(row[5] || ''),
    target_group: String(row[6] || ''),
    schedule: String(row[7] || ''),
    time_range: String(row[8] || ''),
    total_hours: Number(row[9]) || 0,
    estimated_cost: Number(row[10]) || 0,
  };
}

/**
 * Maps an EducationPlan object to a sheet row (array of values).
 */
export function mapPlanToRow(plan: EducationPlan): any[] {
  return [
    plan.id,
    plan.edu_date,
    plan.category,
    plan.title,
    plan.agency,
    plan.instructor,
    plan.target_group,
    plan.schedule,
    plan.time_range,
    plan.total_hours,
    plan.estimated_cost,
  ];
}

/**
 * Maps a sheet row (array of strings) back to an EducationDraft object.
 */
export function mapRowToDraft(row: any[]): EducationDraft {
  return {
    id: String(row[0] || ''),
    plan_id: String(row[1] || ''),
    drafter: String(row[2] || ''),
    draft_date: String(row[3] || ''),
    purpose: String(row[4] || ''),
    content_summary: String(row[5] || ''),
    budget_breakdown: String(row[6] || ''),
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
 * Maps a sheet row (array of strings) back to an EducationReport object.
 */
export function mapRowToReport(row: any[]): EducationReport {
  return {
    id: String(row[0] || ''),
    draft_id: String(row[1] || ''),
    plan_id: String(row[2] || ''),
    department: String(row[3] || ''),
    position: String(row[4] || ''),
    drafter_name: String(row[5] || ''),
    report_date: String(row[6] || ''),
    summary: String(row[7] || ''),
    future_plan: String(row[8] || ''),
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
  ];
}

