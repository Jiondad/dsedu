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

// 대문자 I(아이)가 완벽하게 검증된 진짜 구글 앱스 스크립트 배포 주소
const API_URL = (import.meta as any).env?.VITE_APP_URL || 
                (import.meta as any).env?.APP_URL || 
                'https://script.google.com/macros/s/1PNdiWIScbCkAbtUS9cBxzLksJ3V7IjK3xJyB6aKc8MU/exec';

/**
 * 낡은 API Key 의존성을 제거하고 앱스 스크립트 기반 설정을 반환합니다.
 */
export function getSpreadsheetConfig() {
  const spreadsheetId = localStorage.getItem('ds_steel_spreadsheet_id') || SPREADSHEET_ID;
  return { spreadsheetId, apiUrl: API_URL };
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

export async function addPlan(spreadsheetId: string, accessToken: string | null, plan: EducationPlan): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ 
        action: 'create', 
        sheetName: SHEET_TAB_NAME, 
        ...plan 
      }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const res = await response.json();
    if (res.success === false) throw new Error(res.error || '구글 시트 저장 실패');
  } catch (err) { 
    console.error('addPlan 실패:', err); 
    throw err; 
  }
}

export async function updatePlan(spreadsheetId: string, accessToken: string | null, plan: EducationPlan, rowIndex: number): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'update', 
        sheetName: SHEET_TAB_NAME, 
        rowIndex: rowIndex, 
        ...plan 
      }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const res = await response.json();
    if (res.success === false) throw new Error(res.error || '구글 시트 수정 실패');
  } catch (err) { 
    console.error('updatePlan 실패:', err); 
    throw err; 
  }
}

export async function deletePlan(spreadsheetId: string, accessToken: string | null, rowIndex: number): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'delete', 
        sheetName: SHEET_TAB_NAME, 
        rowIndex: rowIndex 
      }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const res = await response.json();
    if (res.success === false) throw new Error(res.error || '구글 시트 삭제 실패');
  } catch (err) { 
    console.error('deletePlan 실패:', err); 
    throw err; 
  }
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
    return rows.filter((row: any) => (Array.isArray(row) ? row[0] : row.id)).map(mapRowToDraft);
  } catch (err) { console.error(err); return []; }
}

export async function addDraft(spreadsheetId: string, accessToken: string | null, draft: EducationDraft): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'create', sheetName: SHEET_TAB_DRAFT_NAME, ...draft }) }); } catch (err) { console.error(err); }
}

export async function updateDraft(spreadsheetId: string, accessToken: string | null, draft: EducationDraft, rowIndex: number): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'update', sheetName: SHEET_TAB_DRAFT_NAME, rowIndex, ...draft }) }); } catch (err) { console.error(err); }
}

export async function deleteDraft(spreadsheetId: string, accessToken: string | null, rowIndex: number): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', sheetName: SHEET_TAB_DRAFT_NAME, rowIndex }) }); } catch (err) { console.error(err); }
}

// ============================================================================
// 3. 결과 보고서 (education_reports) - 조회 / 추가 / 수정 / 삭제
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

export async function addReport(spreadsheetId: string, accessToken: string | null, report: EducationReport): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'create', sheetName: SHEET_TAB_REPORT_NAME, ...report }) }); } catch (err) { console.error(err); }
}

export async function updateReport(spreadsheetId: string, accessToken: string | null, report: EducationReport, rowIndex: number): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'update', sheetName: SHEET_TAB_REPORT_NAME, rowIndex, ...report }) }); } catch (err) { console.error(err); }
}

export async function deleteReport(spreadsheetId: string, accessToken: string | null, rowIndex: number): Promise<void> {
  try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', sheetName: SHEET_TAB_REPORT_NAME, rowIndex }) }); } catch (err) { console.error(err); }
}
