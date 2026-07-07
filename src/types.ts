/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EducationPlan {
  id: string;
  edu_date: string; // YYYY-MM-DD
  category: '사내' | '사외';
  title: string;
  agency: string;
  instructor: string;
  target_group: string;
  schedule: string; // MM/DD~MM/DD
  time_range: string; // HH~HH
  total_hours: number;
  estimated_cost: number;
}

export interface EducationDraft {
  id: string; // draft_id (DSED-YYYYMMDD-XXXX)
  plan_id: string; // Associated EducationPlan ID
  drafter: string;
  draft_date: string; // YYYY-MM-DD
  purpose: string;
  content_summary: string;
  budget_breakdown: string;
}

export interface EducationReport {
  id: string; // DSEREP-YYYYMMDD-XXX
  draft_id: string; // Associated Draft ID
  plan_id: string; // Associated Plan ID
  department: string; // 부서
  position: string; // 직급
  drafter_name: string; // 성명
  report_date: string; // YYYY-MM-DD
  summary: string; // 교육 결과 요약 및 성과
  future_plan: string; // 향후 현업 적용 계획 및 기대효과
}

export interface MetricSummary {
  totalHours: number;
  totalCost: number;
  count: number;
}

export interface CategoryMetrics {
  inHouse: MetricSummary; // 사내
  external: MetricSummary; // 사외
  total: MetricSummary; // 전체
}
