/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EducationPlan, EducationDraft } from './types';
import {
  mapRowToPlan,
  mapPlanToRow,
  mapRowToDraft,
  mapDraftToRow,
} from './utils';

const SPREADSHEET_NAME = '연간교육계획수립_DB';
const SHEET_TAB_NAME = '교육계획';
const SHEET_TAB_DRAFT_NAME = 'education_drafts';

const SHEET_ID = 0;
const DRAFT_SHEET_ID = 1;

// Default Mock Data for immediate offline/out-of-box usage
const DEFAULT_MOCK_PLANS: EducationPlan[] = [
  {
    id: 'edu_mock_1',
    edu_date: '2026-03-15',
    category: '사내',
    title: '전사 안전 관리 및 환경 교육',
    agency: '대성스틸 안전환경본부',
    instructor: '김철수 본부장',
    target_group: '전 임직원',
    schedule: '03/15~03/15',
    time_range: '09~12',
    total_hours: 3,
    estimated_cost: 0
  },
  {
    id: 'edu_mock_2',
    edu_date: '2026-05-10',
    category: '사외',
    title: '스틸 제조 공정 스마트화 및 AI 도입 워크숍',
    agency: '한국스마트제조협회',
    instructor: '이영희 박사',
    target_group: '생산기술 및 품질관리팀',
    schedule: '05/10~05/12',
    time_range: '09~17',
    total_hours: 24,
    estimated_cost: 1200000
  },
  {
    id: 'edu_mock_3',
    edu_date: '2026-09-20',
    category: '사내',
    title: '신입 사원 직무 역량 강화 OJT',
    agency: '인사노무팀',
    instructor: '박민수 과장',
    target_group: '2026년 하반기 신입사원',
    schedule: '09/20~09/24',
    time_range: '13~18',
    total_hours: 20,
    estimated_cost: 250000
  }
];

const DEFAULT_MOCK_DRAFTS: EducationDraft[] = [
  {
    id: 'draft_mock_1',
    plan_id: 'edu_mock_2',
    drafter: '정품질 대리',
    draft_date: '2026-04-20',
    purpose: '스틸 제조 공정 스마트 팩토리 최신 기술 습득 및 생산 현장 도입 방안 구상',
    content_summary: '1. AI 기반 품질 예측 솔루션 구축 우수사례 분석\n2. 스마트센서 연동 빅데이터 수집 기법 실습\n3. 우리 공정 생산 라인 최적화 적용 시뮬레이션 워크숍 진행',
    budget_breakdown: '1. 교육 참가비: 400,000원 * 3명 = 1,200,000원\n2. 여비 및 식비: 100,000원\n\n총 소요예산: 1,300,000원'
  }
];

/**
 * Returns spreadsheet configuration from env or localStorage
 */
export function getSpreadsheetConfig() {
  const metaEnv = (import.meta as any).env || {};
  
  const spreadsheetId = 
    metaEnv.VITE_SPREADSHEET_ID || 
    localStorage.getItem('ds_steel_spreadsheet_id') || 
    '1v0E0Zz6-mO1TWhRz-H8bX9K4rVMyF4ZpXW0p_2gO0Hk'; // Standard fallback public sheet

  const apiKey = 
    metaEnv.VITE_GOOGLE_API_KEY || 
    localStorage.getItem('ds_steel_google_api_key') || 
    'AIzaSyBBsSXc9iGdFMC5sd3afRZIvr3UND8QjDE'; // Shared API key

  return { spreadsheetId, apiKey };
}

/**
 * Searches Google Drive for a spreadsheet with the DB name.
 */
async function searchSpreadsheet(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to search spreadsheet:', errorBody);
    throw new Error('Google Drive search failed');
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a new Google Sheet spreadsheet with the standard schema and header.
 */
async function createSpreadsheet(accessToken: string): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title: SPREADSHEET_NAME,
    },
    sheets: [
      {
        properties: {
          sheetId: SHEET_ID,
          title: SHEET_TAB_NAME,
          gridProperties: {
            rowCount: 200,
            columnCount: 11,
          },
        },
      },
      {
        properties: {
          sheetId: DRAFT_SHEET_ID,
          title: SHEET_TAB_DRAFT_NAME,
          gridProperties: {
            rowCount: 200,
            columnCount: 7,
          },
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to create spreadsheet:', errorBody);
    throw new Error('Spreadsheet creation failed');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize plans headers
  const headers = [
    'ID',
    '교육일자',
    '구분',
    '교육명',
    '교육기관',
    '강사',
    '대상자',
    '교육일정',
    '교육시간',
    '시간',
    '예상비용',
  ];
  await writeHeaders(spreadsheetId, accessToken, SHEET_TAB_NAME, headers, 'A1:K1');

  // Initialize drafts headers
  const draftHeaders = [
    '기안번호',
    '교육계획ID',
    '기안자',
    '기안일자',
    '교육목적',
    '교육내용',
    '소요예산 상세내역',
  ];
  await writeHeaders(spreadsheetId, accessToken, SHEET_TAB_DRAFT_NAME, draftHeaders, 'A1:G1');

  return spreadsheetId;
}

/**
 * Writes headers to the spreadsheet.
 */
async function writeHeaders(
  spreadsheetId: string,
  accessToken: string,
  tabName: string,
  headers: string[],
  rangeSelector: string
): Promise<void> {
  const range = `${tabName}!${rangeSelector}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const body = {
    values: [headers],
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed to write headers for ${tabName}:`, errorBody);
    throw new Error(`Header initialization failed for ${tabName}`);
  }
}

/**
 * Ensures that the education_drafts sheet tab exists.
 */
async function ensureDraftTabExists(spreadsheetId: string, accessToken: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch spreadsheet metadata');
  }

  const data = await response.json();
  const sheets = data.sheets || [];
  const hasDraftsTab = sheets.some(
    (sheet: any) => sheet.properties.title === SHEET_TAB_DRAFT_NAME
  );

  if (!hasDraftsTab) {
    console.log('education_drafts tab not found. Creating it...');
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const updateBody = {
      requests: [
        {
          addSheet: {
            properties: {
              sheetId: DRAFT_SHEET_ID,
              title: SHEET_TAB_DRAFT_NAME,
              gridProperties: {
                rowCount: 200,
                columnCount: 7,
              },
            },
          },
        },
      ],
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    if (!updateResponse.ok) {
      console.error('Failed to create education_drafts tab:', await updateResponse.text());
      return;
    }

    // Write draft headers
    const draftHeaders = [
      '기안번호',
      '교육계획ID',
      '기안자',
      '기안일자',
      '교육목적',
      '교육내용',
      '소요예산 상세내역',
    ];
    await writeHeaders(spreadsheetId, accessToken, SHEET_TAB_DRAFT_NAME, draftHeaders, 'A1:G1');
    console.log('education_drafts tab created and initialized successfully.');
  }
}

/**
 * Public method to find or create the database spreadsheet.
 */
export async function findOrCreateSpreadsheet(accessToken?: string | null): Promise<string> {
  if (!accessToken) {
    const { spreadsheetId } = getSpreadsheetConfig();
    return spreadsheetId;
  }
  let id = await searchSpreadsheet(accessToken);
  if (!id) {
    id = await createSpreadsheet(accessToken);
  } else {
    // If spreadsheet already exists, double check if drafts tab is there
    await ensureDraftTabExists(id, accessToken);
  }
  return id;
}

/**
 * Fetches all education plans from the Google Sheet.
 */
export async function fetchPlans(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<EducationPlan[]> {
  const range = `${SHEET_TAB_NAME}!A2:K1000`;
  const { apiKey } = getSpreadsheetConfig();
  
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const headers: HeadersInit = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `?key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to fetch plans from spreadsheet:', errorBody);
      throw new Error('Plans fetch failed');
    }

    const data = await response.json();
    const rows = data.values || [];

    const plans = rows
      .filter((row: any[]) => row && row.length > 0 && row[0] !== '')
      .map(mapRowToPlan);

    // Save cache locally on success
    localStorage.setItem('ds_steel_plans_cache', JSON.stringify(plans));
    return plans;
  } catch (err) {
    console.warn('Google Sheets API plans load failed, loading from local cache fallback:', err);
    const cached = localStorage.getItem('ds_steel_plans_cache');
    if (cached) {
      return JSON.parse(cached);
    }
    // Return mock data initially so the app is instantly populated
    localStorage.setItem('ds_steel_plans_cache', JSON.stringify(DEFAULT_MOCK_PLANS));
    return DEFAULT_MOCK_PLANS;
  }
}

/**
 * Appends a new education plan to the Google Sheet.
 */
export async function addPlan(
  spreadsheetId: string,
  accessToken: string | null,
  plan: EducationPlan
): Promise<void> {
  // Update local storage cache first to guarantee persistence
  try {
    const cached = localStorage.getItem('ds_steel_plans_cache');
    const plans: EducationPlan[] = cached ? JSON.parse(cached) : [];
    plans.push(plan);
    localStorage.setItem('ds_steel_plans_cache', JSON.stringify(plans));
  } catch (err) {
    console.error('Failed to update local cache in addPlan:', err);
  }

  const range = `${SHEET_TAB_NAME}!A:K`;
  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, saved plan to local cache only');
    return;
  }

  const body = {
    values: [mapPlanToRow(plan)],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets append failed (public mode might be read-only):', errorBody);
      if (!accessToken) return; // In public mode, treat local storage success as primary
      throw new Error('Plan append failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets save failed:', err);
    if (accessToken) throw err;
  }
}

/**
 * Updates an existing education plan at a specific row.
 */
export async function updatePlan(
  spreadsheetId: string,
  accessToken: string | null,
  plan: EducationPlan,
  rowIndex: number
): Promise<void> {
  // Update local storage cache
  try {
    const cached = localStorage.getItem('ds_steel_plans_cache');
    if (cached) {
      const plans: EducationPlan[] = JSON.parse(cached);
      const index = plans.findIndex(p => p.id === plan.id);
      if (index !== -1) {
        plans[index] = plan;
      } else if (rowIndex >= 0 && rowIndex < plans.length) {
        plans[rowIndex] = plan;
      }
      localStorage.setItem('ds_steel_plans_cache', JSON.stringify(plans));
    }
  } catch (err) {
    console.error('Failed to update local cache in updatePlan:', err);
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEET_TAB_NAME}!A${sheetRow}:K${sheetRow}`;
  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, updated plan in local cache only');
    return;
  }

  const body = {
    values: [mapPlanToRow(plan)],
  };

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets update failed (public mode might be read-only):', errorBody);
      if (!accessToken) return;
      throw new Error('Plan update failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets update failed:', err);
    if (accessToken) throw err;
  }
}

/**
 * Deletes an education plan row.
 */
export async function deletePlan(
  spreadsheetId: string,
  accessToken: string | null,
  rowIndex: number
): Promise<void> {
  // Update local cache
  try {
    const cached = localStorage.getItem('ds_steel_plans_cache');
    if (cached) {
      const plans: EducationPlan[] = JSON.parse(cached);
      if (rowIndex >= 0 && rowIndex < plans.length) {
        plans.splice(rowIndex, 1);
      }
      localStorage.setItem('ds_steel_plans_cache', JSON.stringify(plans));
    }
  } catch (err) {
    console.error('Failed to delete from local cache in deletePlan:', err);
  }

  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, deleted plan from local cache only');
    return;
  }

  const startIndex = rowIndex + 1; // 0-based index inclusive
  const endIndex = rowIndex + 2;   // 0-based index exclusive

  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: SHEET_ID,
            dimension: 'ROWS',
            startIndex,
            endIndex,
          },
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets delete failed (public mode might be read-only):', errorBody);
      if (!accessToken) return;
      throw new Error('Plan deletion failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets delete failed:', err);
    if (accessToken) throw err;
  }
}

/**
 * Fetches all drafts from the education_drafts sheet tab.
 */
export async function fetchDrafts(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<EducationDraft[]> {
  const range = `${SHEET_TAB_DRAFT_NAME}!A2:G1000`;
  const { apiKey } = getSpreadsheetConfig();
  
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const headers: HeadersInit = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `?key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to fetch drafts from spreadsheet:', errorBody);
      throw new Error('Drafts fetch failed');
    }

    const data = await response.json();
    const rows = data.values || [];

    const drafts = rows
      .filter((row: any[]) => row && row.length > 0 && row[0] !== '')
      .map(mapRowToDraft);

    localStorage.setItem('ds_steel_drafts_cache', JSON.stringify(drafts));
    return drafts;
  } catch (err) {
    console.warn('Google Sheets API drafts load failed, loading from local cache fallback:', err);
    const cached = localStorage.getItem('ds_steel_drafts_cache');
    if (cached) {
      return JSON.parse(cached);
    }
    // Return mock data initially
    localStorage.setItem('ds_steel_drafts_cache', JSON.stringify(DEFAULT_MOCK_DRAFTS));
    return DEFAULT_MOCK_DRAFTS;
  }
}

/**
 * Appends a new draft to the education_drafts sheet tab.
 */
export async function addDraft(
  spreadsheetId: string,
  accessToken: string | null,
  draft: EducationDraft
): Promise<void> {
  // Update local storage cache
  try {
    const cached = localStorage.getItem('ds_steel_drafts_cache');
    const drafts: EducationDraft[] = cached ? JSON.parse(cached) : [];
    drafts.push(draft);
    localStorage.setItem('ds_steel_drafts_cache', JSON.stringify(drafts));
  } catch (err) {
    console.error('Failed to update local cache in addDraft:', err);
  }

  const range = `${SHEET_TAB_DRAFT_NAME}!A:G`;
  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, saved draft to local cache only');
    return;
  }

  const body = {
    values: [mapDraftToRow(draft)],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets append draft failed:', errorBody);
      if (!accessToken) return;
      throw new Error('Draft append failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets append draft failed:', err);
    if (accessToken) throw err;
  }
}

/**
 * Updates an existing draft at a specific row.
 */
export async function updateDraft(
  spreadsheetId: string,
  accessToken: string | null,
  draft: EducationDraft,
  rowIndex: number
): Promise<void> {
  // Update local storage cache
  try {
    const cached = localStorage.getItem('ds_steel_drafts_cache');
    if (cached) {
      const drafts: EducationDraft[] = JSON.parse(cached);
      const index = drafts.findIndex(d => d.id === draft.id);
      if (index !== -1) {
        drafts[index] = draft;
      } else if (rowIndex >= 0 && rowIndex < drafts.length) {
        drafts[rowIndex] = draft;
      }
      localStorage.setItem('ds_steel_drafts_cache', JSON.stringify(drafts));
    }
  } catch (err) {
    console.error('Failed to update local cache in updateDraft:', err);
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEET_TAB_DRAFT_NAME}!A${sheetRow}:G${sheetRow}`;
  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, updated draft in local cache only');
    return;
  }

  const body = {
    values: [mapDraftToRow(draft)],
  };

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets update draft failed:', errorBody);
      if (!accessToken) return;
      throw new Error('Draft update failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets update draft failed:', err);
    if (accessToken) throw err;
  }
}

/**
 * Deletes a draft row.
 */
export async function deleteDraft(
  spreadsheetId: string,
  accessToken: string | null,
  rowIndex: number
): Promise<void> {
  // Update local storage cache
  try {
    const cached = localStorage.getItem('ds_steel_drafts_cache');
    if (cached) {
      const drafts: EducationDraft[] = JSON.parse(cached);
      if (rowIndex >= 0 && rowIndex < drafts.length) {
        drafts.splice(rowIndex, 1);
      }
      localStorage.setItem('ds_steel_drafts_cache', JSON.stringify(drafts));
    }
  } catch (err) {
    console.error('Failed to delete from local cache in deleteDraft:', err);
  }

  const { apiKey } = getSpreadsheetConfig();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  } else {
    console.log('No auth credentials, deleted draft from local cache only');
    return;
  }

  const startIndex = rowIndex + 1; // 0-based index inclusive
  const endIndex = rowIndex + 2;   // 0-based index exclusive

  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: DRAFT_SHEET_ID,
            dimension: 'ROWS',
            startIndex,
            endIndex,
          },
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Google Sheets delete draft failed:', errorBody);
      if (!accessToken) return;
      throw new Error('Draft deletion failed');
    }
  } catch (err) {
    console.error('Remote Google Sheets delete draft failed:', err);
    if (accessToken) throw err;
  }
}
