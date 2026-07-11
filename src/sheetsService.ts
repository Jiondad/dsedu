/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 💡 [백엔드 Apps Script 연동 가이드]
 * 구글 앱스 스크립트(Google Apps Script)가 e.parameter.year를 수신하여 "tab_name_" + year 형태로 동적 시트 조회를 수행할 수 있는 가이드입니다.
 * 
 * [GET (doGet) 처리 예시]
 * function doGet(e) {
 *   const year = e.parameter.year || "2026"; // 기본값 지정
 *   const sheetName = e.parameter.sheetName; // 예: annual_plans, education_drafts, education_reports
 *   const targetSheetName = sheetName + "_" + year; // 동적 시트 이름 구성 (예: annual_plans_2026)
 *   
 *   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 *   let sheet = ss.getSheetByName(targetSheetName);
 *   if (!sheet) {
 *     // 시트가 존재하지 않으면 새로 생성하거나 기존 시트를 fallback으로 사용 가능
 *     sheet = ss.getSheetByName(sheetName); 
 *   }
 *   ...
 * }
 * 
 * [POST (doPost) 처리 예시]
 * function doPost(e) {
 *   const year = e.parameter.year || "2026"; // URL 파라미터로 넘어오는 year 수신
 *   const postData = JSON.parse(e.postData.contents);
 *   const yearFromBody = postData.year || year; // payload 내부의 year도 함께 대조
 *   const sheetName = postData.sheetName;
 *   const targetSheetName = sheetName + "_" + yearFromBody;
 *   ...
 * }
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
export const API_URL = (import.meta as any).env?.VITE_APP_URL || 
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
  accessToken?: string | null,
  year?: string
): Promise<EducationPlan[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_NAME}${year ? `&year=${year}` : ''}&t=${new Date().getTime()}`;

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

export async function addPlan(spreadsheetId: string, accessToken: string | null, plan: any, year?: string): Promise<void> {
  try {
    const payload = {
      action: 'create',
      sheetName: SHEET_TAB_NAME,
      year: year || '',
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
      cost: plan.cost !== undefined ? plan.cost : (plan.estimated_cost || 0),
      headcount: Number(plan.headcount) || 1
    };

    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error(err); throw err; }
}

export async function updatePlan(spreadsheetId: string, accessToken: string | null, plan: any, rowIndex: number, year?: string): Promise<void> {
  try {
    const payload = {
      action: 'update',
      sheetName: SHEET_TAB_NAME,
      rowIndex: rowIndex,
      year: year || '',
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
      cost: plan.cost !== undefined ? plan.cost : (plan.estimated_cost || 0),
      headcount: Number(plan.headcount) || 1
    };

    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error(err); throw err; }
}

export async function deletePlan(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string, year?: string): Promise<void> {
  try {
    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'delete', 
        sheetName: SHEET_TAB_NAME, 
        rowIndex: rowIndex,
        id: id,
        year: year || ''
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

export async function fetchDrafts(spreadsheetId: string, accessToken?: string | null, year?: string): Promise<EducationDraft[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_DRAFT_NAME}${year ? `&year=${year}` : ''}&t=${new Date().getTime()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Drafts fetch failed');
    const res = await response.json();
    const rows = extractRowsFromData(res);
    
    if (rows.length === 0) return [];

    // 💡 [버그 종결 방어선] 시트 헤더 행(['id', 'plan_id', ...])이 섞여 들어오면 무조건 원천 차단 및 필터링
    const cleanRows = rows.filter((row: any) => {
      if (!row) return false;
      
      // 배열 구조일 때 첫 번째 칸이 'id'이거나 공백이면 제외
      if (Array.isArray(row)) {
        const firstCell = String(row[0] || '').trim().toLowerCase();
        return firstCell !== '' && firstCell !== 'id';
      }
      
      // 객체 구조일 때 id 값이 'id'이거나 공백이면 제외
      const idVal = String(row.id || '').trim().toLowerCase();
      return idVal !== '' && idVal !== 'id';
    });

    return cleanRows.map((row: any) => {
      const parsed = mapRowToDraft(row);
      // 오브젝트 형태 복원 호환성 보완
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        if (row.plan_id) parsed.plan_id = row.plan_id;
      }
      return parsed;
    });
  } catch (err) { 
    console.error('fetchDrafts 최종 로드 실패:', err); 
    return []; 
  }
}

export async function addDraft(spreadsheetId: string, accessToken: string | null, draft: any, year?: string): Promise<void> {
  try {
    const payload = {
      action: 'create',
      sheetName: SHEET_TAB_DRAFT_NAME,
      year: year || '',
      id: draft.id || '',
      plan_id: draft.plan_id || '',
      draft_date: draft.draft_date || '',
      drafter: draft.drafter || '',
      purpose: draft.purpose || '',
      content_summary: draft.content_summary || '',
      budget_breakdown: draft.budget_breakdown || ''
    };

    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, { 
       method: 'POST', 
       headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
       body: JSON.stringify(payload) 
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('addDraft 실패:', err); throw err; }
}

export async function updateDraft(spreadsheetId: string, accessToken: string | null, draft: any, rowIndex: number, year?: string): Promise<void> {
  try {
    const payload = {
      action: 'update',
      sheetName: SHEET_TAB_DRAFT_NAME,
      rowIndex: rowIndex,
      year: year || '',
      id: draft.id || '',
      plan_id: draft.plan_id || '',
      draft_date: draft.draft_date || '',
      drafter: draft.drafter || '',
      purpose: draft.purpose || '',
      content_summary: draft.content_summary || '',
      budget_breakdown: draft.budget_breakdown || ''
    };

    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, { 
       method: 'POST', 
       headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
       body: JSON.stringify(payload) 
    });
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('updateDraft 실패:', err); throw err; }
}

export async function deleteDraft(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string, year?: string): Promise<void> {
  try { 
    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ action: 'delete', sheetName: SHEET_TAB_DRAFT_NAME, rowIndex, id, year: year || '' }) 
    }); 
  } catch (err) { console.error('deleteDraft 실패:', err); throw err; }
}

// ============================================================================
// 3. 결과 보고서 (education_reports) - 조회 / 추가 / 수정 / 삭제 (구조 통일 최적화)
// ============================================================================

export async function fetchReports(spreadsheetId: string, accessToken?: string | null, year?: string): Promise<EducationReport[]> {
  const url = `${API_URL}?action=read&sheetName=${SHEET_TAB_REPORT_NAME}${year ? `&year=${year}` : ''}&t=${new Date().getTime()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reports fetch failed');
    const res = await response.json();
    let rows = extractRowsFromData(res);

    // 💡 [치명적 버그 수정] 첫 번째 데이터가 헤더인지 검사할 때, 
    // 단순히 id 속성이 있는지가 아니라 '값' 자체가 "id" 문자열인지 정확하게 확인하도록 수정!
    if (rows.length > 0) {
      const firstRow = rows[0];
      if (Array.isArray(firstRow)) {
        if (String(firstRow[0]).trim().toLowerCase() === 'id') {
          rows = rows.slice(1);
        }
      } else if (firstRow && typeof firstRow === 'object') {
        // 객체일 경우 id 값이 'id'라는 문자열일 때만 잘라냄
        if (String(firstRow.id || '').trim().toLowerCase() === 'id') {
          rows = rows.slice(1);
        }
      }
    }

    return rows.filter((row: any) => {
       // 빈 데이터 방어
       const idVal = Array.isArray(row) ? row[0] : row.id;
       return idVal && String(idVal).trim() !== '';
    }).map(mapRowToReport);
  } catch (err) { 
    console.error('fetchReports 최종 로드 실패:', err); 
    return []; 
  }
}

export async function addReport(spreadsheetId: string, accessToken: string | null, report: any, year?: string): Promise<void> {
  try { 
    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const payload = {
      action: 'create',
      sheetName: SHEET_TAB_REPORT_NAME, 
      year: year || '',
      id: report.id || '',
      draft_id: report.draft_id || report.draftId || '',
      plan_id: report.plan_id || report.planId || '',
      department: report.department || '',
      position: report.position || '',
      drafter_name: report.drafter_name || report.drafterName || '',
      report_date: report.report_date || report.reportDate || '',
      summary: report.summary || '',
      future_plan: report.future_plan || report.futurePlan || '',
      satisfaction_score: report.satisfaction_score !== undefined ? report.satisfaction_score : (report.satisfactionScore || 5.0),
      // camelCase aliases for complete robustness
      draftId: report.draft_id || report.draftId || '',
      planId: report.plan_id || report.planId || '',
      drafterName: report.drafter_name || report.drafterName || '',
      reportDate: report.report_date || report.reportDate || '',
      futurePlan: report.future_plan || report.futurePlan || '',
      satisfactionScore: report.satisfaction_score !== undefined ? report.satisfaction_score : (report.satisfactionScore || 5.0),
      certificate_file: report.certificate_file || report.certificateFile || '',
      certificate_file_name: report.certificate_file_name || report.certificateFileName || '',
      certificateFile: report.certificate_file || report.certificateFile || '',
      certificateFileName: report.certificate_file_name || report.certificateFileName || '',
    };
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(payload) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('addReport 실패:', err); throw err; }
}

export async function updateReport(spreadsheetId: string, accessToken: string | null, report: any, rowIndex: number, year?: string): Promise<void> {
  try { 
    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const payload = {
      action: 'update', 
      sheetName: SHEET_TAB_REPORT_NAME, 
      rowIndex, 
      year: year || '',
      id: report.id || '',
      draft_id: report.draft_id || report.draftId || '',
      plan_id: report.plan_id || report.planId || '',
      department: report.department || '',
      position: report.position || '',
      drafter_name: report.drafter_name || report.drafterName || '',
      report_date: report.report_date || report.reportDate || '',
      summary: report.summary || '',
      future_plan: report.future_plan || report.futurePlan || '',
      satisfaction_score: report.satisfaction_score !== undefined ? report.satisfaction_score : (report.satisfactionScore || 5.0),
      // camelCase aliases for complete robustness
      draftId: report.draft_id || report.draftId || '',
      planId: report.plan_id || report.planId || '',
      drafterName: report.drafter_name || report.drafterName || '',
      reportDate: report.report_date || report.reportDate || '',
      futurePlan: report.future_plan || report.futurePlan || '',
      satisfactionScore: report.satisfaction_score !== undefined ? report.satisfaction_score : (report.satisfactionScore || 5.0),
      certificate_file: report.certificate_file || report.certificateFile || '',
      certificate_file_name: report.certificate_file_name || report.certificateFileName || '',
      certificateFile: report.certificate_file || report.certificateFile || '',
      certificateFileName: report.certificate_file_name || report.certificateFileName || '',
    };
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(payload) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('updateReport 실패:', err); throw err; }
}

export async function deleteReport(spreadsheetId: string, accessToken: string | null, rowIndex: number, id?: string, year?: string): Promise<void> {
  try { 
    const url = `${API_URL}${year ? `?year=${year}` : ''}`;
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ 
        action: 'delete', 
        sheetName: SHEET_TAB_REPORT_NAME, 
        rowIndex,
        id,
        year: year || ''
      }) 
    }); 
    const res = await response.json();
    if (res.success === false) throw new Error(res.error);
  } catch (err) { console.error('deleteReport 실패:', err); throw err; }
}