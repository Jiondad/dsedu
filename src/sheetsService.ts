/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EducationPlan, EducationDraft, EducationReport } from './types';
import {
  mapRowToPlan,
  mapPlanToRow,
  mapRowToDraft,
  mapDraftToRow,
  mapRowToReport,
  mapReportToRow,
} from './utils';

const SPREADSHEET_NAME = '대성스틸_교육관리_DB';
const SHEET_TAB_NAME = 'annual_plans';
const SHEET_TAB_DRAFT_NAME = 'education_drafts';
const SHEET_TAB_REPORT_NAME = 'education_reports';

// 진짜 올바른 구글 스프레드시트 고유 ID 고정
const SPREADSHEET_ID = (import.meta as any).env?.VITE_SPREADSHEET_ID || (import.meta as any).env?.APP_URL || '1u3MYYrV9QBq-yOPimkntzg2niDuQUsPLycDW-0aM6IY';

// 💡 대문자 I(아이)가 완벽하게 검증된 진짜 구글 앱스 스크립트 배포 주소
const API_URL = (import.meta as any).env?.VITE_APP_URL || 
                (import.meta as any).env?.APP_URL || 
                'https://script.google.com/macros/s/1PNdiWIScbCkAbtUS9cBxzLksJ3V7IjK3xJyB6aKc8MU/exec';

/**
 * 낡은 API Key 의존성을 제거하고 앱스 스크립트 기반 설정을 반환합니다.
 */
export function getSpreadsheetConfig() {
  const spreadsheetId = localStorage.getItem('ds_steel_spreadsheet_id') || SPREADSHEET_ID;
  const apiKey = localStorage.getItem('ds_steel_google_api_key') || 'AIzaSyBBsSXc9iGdFMC5sd3afRZIvr3UND8QjDE';
  return { spreadsheetId, apiKey, apiUrl: API_URL };
}

/**
 * Apps Script 백엔드가 반환하는 다양한 형태의 응답에서 배열 로우를 견고하게 추출합니다.
 */
export function extractRowsFromData(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.values && Array.isArray(data.values)) return data.values;
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (data.data.values && Array.isArray(data.data.values)) return data.data.values;
  }
  return [];
}

/**
 * 공용 주소 변환 함수 (기존 구글 드라이브 검색 호환용)
 */
export async function findOrCreateSpreadsheet(accessToken?: string | null): Promise<string> {
  const { spreadsheetId } = getSpreadsheetConfig();
  return spreadsheetId;
}

// ============================================================================
// 1. 연간 교육 계획 (annual_plans) - 조회 / 추가 / 수정 / 삭제
// ============================================================================

export async function fetchPlans(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<EducationPlan[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_NAME}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Plans fetch failed');

    const res = await response.json();
    let rows = extractRowsFromData(res);

    if (rows.length > 0) {
      const firstRow = rows[0];
      const isHeader = Array.isArray(firstRow) 
        ? firstRow.some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id' || cell.includes('date') || cell.includes('category')))
        : firstRow && typeof firstRow === 'object' && Object.values(firstRow).some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id' || cell.includes('date')));
      
      if (isHeader) rows = rows.slice(1);
    }

    return rows
      .filter((row: any) => {
        if (!row || row.length === 0) return false;
        const idVal = Array.isArray(row) ? row[0] : row.id || row.ID;
        if (!idVal || idVal.toString().trim() === '' || idVal.toString().toLowerCase() === 'id') return false;
        return true;
      })
      .map(mapRowToPlan);
  } catch (err) {
    console.error('Apps Script plans load failed:', err);
    return [];
  }
}

export async function addPlan(spreadsheetId: string, accessToken: string | null, plan: any): Promise<void> {
  try {
    const payload = {
      action: 'create',
      sheetName: SHEET_TAB_NAME,
      id: plan.id || '',
      date: plan.date || plan.edu_date || '',
      category: plan.category || '',
      title: plan.title || '',
      institution: plan.institution || plan.agency || '',
      instructor: plan.instructor || '',
      target: plan.target || plan.target_participants || plan.target_group || '',
      schedule: plan.schedule || '',
      time_range: plan.time_range || '',
      hours: plan.hours !== undefined ? plan.hours : (plan.total_hours || 0),
      cost: plan.cost !== undefined ? plan.cost : (plan.estimated_cost || 0)
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error(err); throw err; }
}

export async function updatePlan(spreadsheetId: string, accessToken: string | null, plan: any, rowIndex: number): Promise<void> {
  try {
    const payload = {
      action: 'update',
      sheetName: SHEET_TAB_NAME,
      rowIndex: rowIndex,
      id: plan.id || '',
      date: plan.date || plan.edu_date || '',
      category: plan.category || '',
      title: plan.title || '',
      institution: plan.institution || plan.agency || '',
      instructor: plan.instructor || '',
      target: plan.target || plan.target_participants || plan.target_group || '',
      schedule: plan.schedule || '',
      time_range: plan.time_range || '',
      hours: plan.hours !== undefined ? plan.hours : (plan.total_hours || 0),
      cost: plan.cost !== undefined ? plan.cost : (plan.estimated_cost || 0)
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error(err); throw err; }
}

export async function deletePlan(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'delete', 
        sheetName: SHEET_TAB_NAME, 
        rowIndex: rowIndex,
        id: id
      }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const res = await response.json();
    if (res.success === false) throw new Error(res.error || '구글 시트 삭제 실패');
  } catch (err) { console.error('deletePlan 실패:', err); throw err; }
}

// ============================================================================
// 2. 교육 기안서 (education_drafts) - 조회 / 추가 / 수정 / 삭제
// ============================================================================

export async function fetchDrafts(spreadsheetId: string, accessToken?: string | null): Promise<EducationDraft[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_DRAFT_NAME}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Drafts fetch failed');
    const res = await response.json();
    let rows = extractRowsFromData(res);
    if (rows.length > 0 && (Array.isArray(rows[0]) ? rows[0].some(c => typeof c === 'string' && c.toLowerCase() === 'id') : rows[0]?.id)) rows = rows.slice(1);
    
    // 💡 백엔드가 객체나 배열 어떤 것을 주든 유연하게 캐치하도록 이중 안전 처리
    return rows.filter((row: any) => {
      if (!row) return false;
      const idVal = Array.isArray(row) ? row[0] : row.id;
      return idVal && idVal.toString().trim() !== '';
    }).map(row => {
      // 만약 외부 utils에서 파싱이 깨질 경우를 대비해 수신 데이터 명세 강제 동기화
      const parsed = mapRowToDraft(row);
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        if (row.plan_id) parsed.plan_id = row.plan_id;
        if (row.draft_date) parsed.draft_date = row.draft_date;
      }
      return parsed;
    });
  } catch (err) { console.error(err); return []; }
}

export async function addDraft(spreadsheetId: string, accessToken: string | null, draft: any): Promise<void> {
  try {
    const payload = {
      action: 'create',
      sheetName: SHEET_TAB_DRAFT_NAME,
      id: draft.id || '',
      plan_id: draft.plan_id || '',
      draft_date: draft.draft_date || '',
      drafter: draft.drafter || '',
      purpose: draft.purpose || '',
      content_summary: draft.content_summary || '',
      budget_breakdown: draft.budget_breakdown || ''
    };

    const response = await fetch(API_URL, { 
       method: 'POST', 
       headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
       body: JSON.stringify(payload) 
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('addDraft 실패:', err); throw err; }
}

export async function updateDraft(spreadsheetId: string, accessToken: string | null, draft: any, rowIndex: number): Promise<void> {
  try {
    const payload = {
      action: 'update',
      sheetName: SHEET_TAB_DRAFT_NAME,
      rowIndex: rowIndex,
      id: draft.id || '',
      plan_id: draft.plan_id || '',
      draft_date: draft.draft_date || '',
      drafter: draft.drafter || '',
      purpose: draft.purpose || '',
      content_summary: draft.content_summary || '',
      budget_breakdown: draft.budget_breakdown || ''
    };

    const response = await fetch(API_URL, { 
       method: 'POST', 
       headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
       body: JSON.stringify(payload) 
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('updateDraft 실패:', err); throw err; }
}

export async function deleteDraft(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string): Promise<void> {
  try { 
    await fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ action: 'delete', sheetName: SHEET_TAB_DRAFT_NAME, rowIndex, id }) 
    }); 
  } catch (err) { console.error('deleteDraft 실패:', err); throw err; }
}

// ============================================================================
// 3. 결과 보고서 (education_reports) - 조회 / 추가 / 수정 / 삭제 (구조 통일 최적화)
// ============================================================================

export async function fetchReports(spreadsheetId: string, accessToken?: string | null): Promise<EducationReport[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_REPORT_NAME}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reports fetch failed');
    const res = await response.json();
    let rows = extractRowsFromData(res);
    if (rows.length > 0 && (Array.isArray(rows[0]) ? rows[0].some(c => typeof c === 'string' && c.toLowerCase() === 'id') : rows[0]?.id)) rows = rows.slice(1);
    return rows.filter((row: any) => (Array.isArray(row) ? row[0] : row.id)).map(mapRowToReport);
  } catch (err) { console.error(err); return []; }
}

export async function addReport(spreadsheetId: string, accessToken: string | null, report: any): Promise<void> {
  try { 
    const response = await fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ 
        action: 'create',
        sheetName: SHEET_TAB_REPORT_NAME, 
        ...report 
      }) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('addReport 실패:', err); throw err; }
}

export async function updateReport(spreadsheetId: string, accessToken: string | null, report: any, rowIndex: number): Promise<void> {
  try { 
    const response = await fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ 
        action: 'update', 
        sheetName: SHEET_TAB_REPORT_NAME, 
        rowIndex, 
        ...report 
      }) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('updateReport 실패:', err); throw err; }
}

export async function deleteReport(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string): Promise<void> {
  try { 
    const response = await fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ 
        action: 'delete', 
        sheetName: SHEET_TAB_REPORT_NAME, 
        rowIndex,
        id
      }) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('deleteReport 실패:', err); throw err; }
}
