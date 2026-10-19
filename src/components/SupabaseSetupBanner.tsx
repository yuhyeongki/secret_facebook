import React, { useState } from 'react';
import { Database, Check, Copy, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { SUPABASE_SCHEMA_SQL, SUPABASE_URL } from '../lib/supabase.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const SupabaseSetupBanner: React.FC = () => {
  const { isSupabaseTableMissing } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-stone-900 text-white text-xs px-4 py-2 border-b border-emerald-800/60 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold flex items-center gap-1.5 text-emerald-300">
              <Database className="w-3.5 h-3.5" />
              Supabase 연동 중
            </span>
            {SUPABASE_URL ? (
              <span className="text-stone-300 hidden sm:inline">
                연결 URL: <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-200">{SUPABASE_URL.replace('https://', '')}</code>
              </span>
            ) : null}
            {isSupabaseTableMissing && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                테이블 생성 스크립트 대기
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Supabase SQL 테이블 스크립트 보기</span>
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <span>Supabase 콘솔 열기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* SQL Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    Supabase 테이블 스키마 SQL
                  </h3>
                  <p className="text-xs text-stone-500">
                    Supabase 대시보드(SQL Editor)에 붙여넣고 'Run'을 실행하면 테이블이 자동 생성됩니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-900 text-stone-100 flex-1 overflow-y-auto font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{SUPABASE_SCHEMA_SQL}</pre>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex items-center justify-between">
              <span className="text-xs text-stone-500">
                테이블: users, anonymous_posts, consultation_sessions, notifications 등 7개
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>전체 SQL 복사하기</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
