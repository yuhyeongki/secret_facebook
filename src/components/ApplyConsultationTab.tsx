import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Lock,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  ShieldCheck,
  Send,
  Sparkles,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { triggerPushAlert } from '../lib/push.ts';

const CATEGORIES = [
  '학업/성적 고민',
  '친구 및 교우관계',
  '진로 및 미래 진학',
  '정서 및 마음건강',
  '학교생활 적응',
  '가정 및 개인사',
  '🚨 긴급 도움이 필요해요',
  '기타 고민',
];

const MOODS = [
  { value: '답답함', emoji: '😶‍🌫️', label: '답답함', desc: '마음이 무겁고 막막해요' },
  { value: '불안/초조', emoji: '😰', label: '불안/초조', desc: '걱정이 많고 긴장돼요' },
  { value: '매우우울', emoji: '😭', label: '매우 힘듦', desc: '혼자 견디기 벅차요' },
  { value: '조금지침', emoji: '😮‍💨', label: '조금 지침', desc: '의욕이 없고 피곤해요' },
  { value: '괜찮아지는중', emoji: '🌱', label: '회복 중', desc: '도움을 받고 싶어요' },
];

interface ApplyConsultationTabProps {
  onSuccess: (newSessionId: number) => void;
}

export const ApplyConsultationTab: React.FC<ApplyConsultationTabProps> = ({ onSuccess }) => {
  const { getAuthToken, currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('학업/성적 고민');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [mood, setMood] = useState('답답함');
  const [content, setContent] = useState('');

  // Uploaded file state
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert('파일 크기는 최대 8MB까지 업로드 가능합니다.');
      return;
    }

    setFileName(file.name);
    setFileType(file.type);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFileDataUrl(null);
    setFileName(null);
    setFileType(null);
    setFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!content.trim() && !fileDataUrl)) return;

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          urgency,
          currentMood: mood,
          initialMessage: content.trim(),
          attachmentUrl: fileDataUrl,
          attachmentName: fileName,
          studentName: currentUser?.name || '우리반 학생',
          studentNumber: currentUser?.studentNumber || '',
        }),
      });

      if (res.ok) {
        const session = await res.json();
        triggerPushAlert(
          '1:1 비밀 상담이 접수되었습니다 🔒',
          `"${title.trim()}" 상담 신청서와 첨부파일이 선생님께 전달되었습니다.`
        );
        onSuccess(session.id);
      } else {
        const err = await res.json();
        alert(err.error || '상담 신청에 실패했습니다.');
      }
    } catch (err) {
      console.error('Apply consultation error:', err);
      alert('서버 연결 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            비밀 보장 신청서 (Apply)
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
          선생님께 비밀 1:1 상담 신청하기 ✍️
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          혼자 고민하지 마세요. 고민 사연이나 관련 사진, 손편지, 일기, 과제 사진 등을 안전하게 업로드하여 담임 선생님께만 1:1로 신청할 수 있습니다.
        </p>
      </div>

      {/* Main Apply Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Applicant Info (Read-only badge) */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-semibold">신청 학생:</span>
            <span className="font-extrabold text-stone-900">{currentUser?.name || '우리반 학생'}</span>
            <span className="text-stone-400">({currentUser?.studentNumber || '1반 학생'})</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>선생님 외 타인 열람 불가</span>
          </div>
        </div>

        {/* 1. Category & Urgency */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">1</span>
            상담 영역 및 긴급도
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                상담 분야
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                도움이 필요한 긴급도
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    urgency === 'normal'
                      ? 'bg-stone-800 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  일반 상담
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    urgency === 'urgent'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  조금 힘들어요
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('emergency')}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    urgency === 'emergency'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  🚨 긴급 필요
                </button>
              </div>
            </div>
          </div>

          {/* Current Mood */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              현재 내 마음 상태
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    mood === m.value
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xl mb-1">{m.emoji}</div>
                  <div className="font-bold text-xs text-stone-900">{m.label}</div>
                  <div className="text-[10px] text-stone-500 truncate">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Title & Story */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">2</span>
            상담 내용 작성
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              상담 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 친구와의 다툼 때문에 학교 가기가 두렵고 힘들어요"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              maxLength={80}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              선생님께 털어놓고 싶은 고민 사연
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상황이나 마음 상태를 편안하게 적어주세요. 글로 쓰기 어려운 부분은 아래에 사진이나 파일을 첨부하셔도 좋습니다."
              rows={5}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 3. Secret File / Photo Upload Area */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">3</span>
              시크릿 파일 / 사진 업로드 (선택)
            </h2>
            <span className="text-[11px] text-stone-400">사진, 일기장, 캡처, 문서 첨부 가능</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.txt,.docx"
            className="hidden"
          />

          {!fileDataUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-rose-500 bg-rose-50/50'
                  : 'border-stone-200 bg-stone-50/60 hover:bg-stone-50 hover:border-rose-300'
              }`}
            >
              <UploadCloud className="w-10 h-10 mx-auto text-rose-400 mb-2" />
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                고민과 관련된 사진이나 파일을 이곳에 끌어다 놓거나 클릭하여 업로드하세요
              </p>
              <p className="text-xs text-stone-500 mt-1">
                JPG, PNG, GIF, WebP, PDF (최대 8MB)
              </p>
              <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 shadow-2xs">
                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>파일 찾아보기</span>
              </div>
            </div>
          ) : (
            <div className="border border-rose-200 bg-rose-50/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden w-full">
                {fileType?.startsWith('image/') ? (
                  <img
                    src={fileDataUrl}
                    alt="Upload Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-rose-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <FileText className="w-8 h-8" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 truncate">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                  <span className="text-[11px] text-stone-500">{fileSize} · 암호화 완료</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold text-xs rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>삭제 / 다시 올리기</span>
              </button>
            </div>
          )}

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-stone-400 shrink-0" />
            <span>업로드된 파일은 담임선생님만 열람 가능하며, 상담 종료 후 안전하게 보관 및 폐기됩니다.</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span>상담 신청 및 파일 업로드 처리 중...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>선생님께 비밀 1:1 상담 접수하기 (Apply)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
