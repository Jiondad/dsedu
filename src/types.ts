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
