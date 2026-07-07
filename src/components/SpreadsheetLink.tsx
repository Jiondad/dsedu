/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, Database, CheckCircle, Copy, Check } from 'lucide-react';

interface SpreadsheetLinkProps {
  spreadsheetId: string | null;
}

export default function SpreadsheetLink({ spreadsheetId }: SpreadsheetLinkProps) {
  const [copied, setCopied] = useState(false);

  if (!spreadsheetId) return null;

  const editUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(spreadsheetId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5 sm:mt-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-800">구글 스프레드시트 DB 활성화 완료</h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> 실시간 동기화
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            구글 드라이브에 <span className="font-semibold text-gray-700">연간교육계획수립_DB</span> 파일이 연동되어 데이터를 안전하게 저장 중입니다.
          </p>
          <div className="flex items-center gap-1.5 mt-2 font-mono text-[10px] text-gray-400">
            <span>ID: {spreadsheetId.substring(0, 16)}...</span>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="ID 복사"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      <a
        href={editUrl}
        target="_blank"
        referrerPolicy="no-referrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-600 text-gray-600 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto text-center justify-center"
      >
        <span>구글 시트 바로가기</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
