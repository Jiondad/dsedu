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

/**
 * Searches Google Drive for a spreadsheet with the DB name.
 * If found, returns its spreadsheetId. Otherwise, returns null.
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
 * If the spreadsheet was created earlier without the drafts tab, this adds it.
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
export async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
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
  accessToken: string
): Promise<EducationPlan[]> {
  const range = `${SHEET_TAB_NAME}!A2:K1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to fetch plans from spreadsheet:', errorBody);
    throw new Error('Plans fetch failed');
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows
    .filter((row: any[]) => row && row.length > 0 && row[0] !== '')
    .map(mapRowToPlan);
}

/**
 * Appends a new education plan to the Google Sheet.
 */
export async function addPlan(
  spreadsheetId: string,
  accessToken: string,
  plan: EducationPlan
): Promise<void> {
  const range = `${SHEET_TAB_NAME}!A:K`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const body = {
    values: [mapPlanToRow(plan)],
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
    console.error('Failed to append plan to spreadsheet:', errorBody);
    throw new Error('Plan append failed');
  }
}

/**
 * Updates an existing education plan at a specific row.
 * rowIndex: 0-based index in the plans list.
 */
export async function updatePlan(
  spreadsheetId: string,
  accessToken: string,
  plan: EducationPlan,
  rowIndex: number
): Promise<void> {
  const sheetRow = rowIndex + 2;
  const range = `${SHEET_TAB_NAME}!A${sheetRow}:K${sheetRow}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const body = {
    values: [mapPlanToRow(plan)],
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
    console.error(`Failed to update plan row ${sheetRow}:`, errorBody);
    throw new Error('Plan update failed');
  }
}

/**
 * Deletes an education plan row.
 * rowIndex: 0-based index in the plans list.
 */
export async function deletePlan(
  spreadsheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
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
    console.error(`Failed to delete plan row at index ${startIndex}:`, errorBody);
    throw new Error('Plan deletion failed');
  }
}

/**
 * Fetches all drafts from the education_drafts sheet tab.
 */
export async function fetchDrafts(
  spreadsheetId: string,
  accessToken: string
): Promise<EducationDraft[]> {
  const range = `${SHEET_TAB_DRAFT_NAME}!A2:G1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to fetch drafts from spreadsheet:', errorBody);
    throw new Error('Drafts fetch failed');
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows
    .filter((row: any[]) => row && row.length > 0 && row[0] !== '')
    .map(mapRowToDraft);
}

/**
 * Appends a new draft to the education_drafts sheet tab.
 */
export async function addDraft(
  spreadsheetId: string,
  accessToken: string,
  draft: EducationDraft
): Promise<void> {
  const range = `${SHEET_TAB_DRAFT_NAME}!A:G`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const body = {
    values: [mapDraftToRow(draft)],
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
    console.error('Failed to append draft to spreadsheet:', errorBody);
    throw new Error('Draft append failed');
  }
}

/**
 * Updates an existing draft at a specific row.
 */
export async function updateDraft(
  spreadsheetId: string,
  accessToken: string,
  draft: EducationDraft,
  rowIndex: number
): Promise<void> {
  const sheetRow = rowIndex + 2;
  const range = `${SHEET_TAB_DRAFT_NAME}!A${sheetRow}:G${sheetRow}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const body = {
    values: [mapDraftToRow(draft)],
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
    console.error(`Failed to update draft row ${sheetRow}:`, errorBody);
    throw new Error('Draft update failed');
  }
}

/**
 * Deletes a draft row.
 */
export async function deleteDraft(
  spreadsheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
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
    console.error(`Failed to delete draft row at index ${startIndex}:`, errorBody);
    throw new Error('Draft deletion failed');
  }
}
