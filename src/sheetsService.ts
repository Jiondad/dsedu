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

// 새로 만드신 영문 규격 구글 스프레드시트 고유 ID를 확실하게 Fallback으로 고정합니다.
const SPREADSHEET_ID = (import.meta as any).env?.VITE_SPREADSHEET_ID || (import.meta as any).env?.APP_URL || '1u3MYYrV9QBq-yOPimkntzg2niDuQUsPLycDW-0aM6IY';

// 구글 앱스 스크립트(Apps Script) 배포 주소를 모든 데이터 통신의 베이스 URL로 강제 통일합니다.
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

  // 1. 이미 순수 배열 형태인 경우 ([{id: ...}, {id: ...}])
  if (Array.isArray(data)) {
    return data;
  }

  // 2. { data: [...] } 또는 { data: { data: [...] } } 형태로 감싸져 있는 경우 방어
  if (data.data) {
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (data.data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    if (data.data.values && Array.isArray(data.data.values)) {
      return data.data.values;
    }
  }

  // 3. Google Sheets v4 API 대응 규격인 경우
  if (data.values && Array.isArray(data.values)) {
    return data.values;
  }

  // 4. 어떤 키값 안에 배열이 숨어있든 싹 찾아내기 (오브젝트 스캔)
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
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

/**
 * 모든 교육 계획 조회
 */
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

    // 첫 행이 헤더일 경우 안전하게 필터링 및 슬라이스
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
        // 배열 구조 또는 객체 구조에 상관없이 ID 필드 검증
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

/**
 * 신규 교육 계획 추가
 */
export async function addPlan(
  spreadsheetId: string,
  accessToken: string | null,
  plan: EducationPlan
): Promise<void> {
  const body = {
    sheetName: SHEET_TAB_NAME,
    ...plan
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Plan append via Apps Script failed');
  } catch (err) {
    console.error('Apps Script save plan failed:', err);
    throw err;
  }
}

/**
 * 기존 교육 계획 수정
 */
export async function updatePlan(
  spreadsheetId: string,
  accessToken: string | null,
  plan: EducationPlan,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'update',
    sheetName: SHEET_TAB_NAME,
    rowIndex: rowIndex, // 백엔드 처리용 인덱스
    ...plan
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Plan update via Apps Script failed');
  } catch (err) {
    console.error('Apps Script update plan failed:', err);
    throw err;
  }
}

/**
 * 교육 계획 삭제
 */
export async function deletePlan(
  spreadsheetId: string,
  accessToken: string | null,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'delete',
    sheetName: SHEET_TAB_NAME,
    rowIndex: rowIndex
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Plan deletion via Apps Script failed');
  } catch (err) {
    console.error('Apps Script delete plan failed:', err);
    throw err;
  }
}

// ============================================================================
// 2. 교육 기안서 (education_drafts) - 조회 / 추가 / 수정 / 삭제
// ============================================================================

/**
 * 모든 기안서 조회
 */
export async function fetchDrafts(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<EducationDraft[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_DRAFT_NAME}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Drafts fetch failed');

    const res = await response.json();
    let rows = extractRowsFromData(res);

    if (rows.length > 0) {
      const firstRow = rows[0];
      const isHeader = Array.isArray(firstRow)
        ? firstRow.some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id' || cell.includes('draft') || cell.includes('기안')))
        : firstRow && typeof firstRow === 'object' && Object.values(firstRow).some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id'));
      if (isHeader) rows = rows.slice(1);
    }

    return rows
      .filter((row: any) => {
        if (!row || row.length === 0) return false;
        const idVal = Array.isArray(row) ? row[0] : row.id || row.draftId;
        if (!idVal || idVal.toString().trim() === '') return false;
        return true;
      })
      .map(mapRowToDraft);
  } catch (err) {
    console.error('Apps Script drafts load failed:', err);
    return [];
  }
}

/**
 * 기안서 추가
 */
export async function addDraft(
  spreadsheetId: string,
  accessToken: string | null,
  draft: EducationDraft
): Promise<void> {
  const body = {
    sheetName: SHEET_TAB_DRAFT_NAME,
    ...draft
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Draft append failed');
  } catch (err) {
    console.error('Apps Script add draft failed:', err);
  }
}

/**
 * 기안서 수정
 */
export async function updateDraft(
  spreadsheetId: string,
  accessToken: string | null,
  draft: EducationDraft,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'update',
    sheetName: SHEET_TAB_DRAFT_NAME,
    rowIndex: rowIndex,
    ...draft
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Draft update failed');
  } catch (err) {
    console.error('Apps Script update draft failed:', err);
  }
}

/**
 * 기안서 삭제
 */
export async function deleteDraft(
  spreadsheetId: string,
  accessToken: string | null,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'delete',
    sheetName: SHEET_TAB_DRAFT_NAME,
    rowIndex: rowIndex
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Draft deletion failed');
  } catch (err) {
    console.error('Apps Script delete draft failed:', err);
  }
}

// ============================================================================
// 3. 결과 보고서 (education_reports) - 조회 / 추가 / 수정 / 삭제
// ============================================================================

/**
 * 모든 보고서 조회
 */
export async function fetchReports(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<EducationReport[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_REPORT_NAME}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reports fetch failed');

    const res = await response.json();
    let rows = extractRowsFromData(res);

    if (rows.length > 0) {
      const firstRow = rows[0];
      const isHeader = Array.isArray(firstRow)
        ? firstRow.some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id' || cell.includes('report') || cell.includes('보고')))
        : firstRow && typeof firstRow === 'object' && Object.values(firstRow).some(cell => typeof cell === 'string' && (cell.toLowerCase() === 'id'));
      if (isHeader) rows = rows.slice(1);
    }

    return rows
      .filter((row: any) => {
        if (!row || row.length === 0) return false;
        const idVal = Array.isArray(row) ? row[0] : row.id || row.reportId;
        if (!idVal || idVal.toString().trim() === '') return false;
        return true;
      })
      .map(mapRowToReport);
  } catch (err) {
    console.error('Apps Script reports load failed:', err);
    return [];
  }
}

/**
 * 보고서 추가
 */
export async function addReport(
  spreadsheetId: string,
  accessToken: string | null,
  report: EducationReport
): Promise<void> {
  const body = {
    sheetName: SHEET_TAB_REPORT_NAME,
    ...report
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Report append failed');
  } catch (err) {
    console.error('Apps Script add report failed:', err);
  }
}

/**
 * 보고서 수정
 */
export async function updateReport(
  spreadsheetId: string,
  accessToken: string | null,
  report: EducationReport,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'update',
    sheetName: SHEET_TAB_REPORT_NAME,
    rowIndex: rowIndex,
    ...report
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Report update failed');
  } catch (err) {
    console.error('Apps Script update report failed:', err);
  }
}

/**
 * 보고서 삭제
 */
export async function deleteReport(
  spreadsheetId: string,
  accessToken: string | null,
  rowIndex: number
): Promise<void> {
  const body = {
    action: 'delete',
    sheetName: SHEET_TAB_REPORT_NAME,
    rowIndex: rowIndex
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Report deletion failed');
  } catch (err) {
    console.error('Apps Script delete report failed:', err);
  }
}
