import React, { useState, useEffect, useRef } from 'react';
import { ConsultationSession, ConsultationMessage } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Lock,
  Plus,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  FileEdit,
  GraduationCap,
  MessageSquare,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { triggerPushAlert } from '../lib/push.ts';

const URGENCY_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  normal: { label: '일반 상담', color: 'text-stone-700 bg-stone-100', badge: 'bg-stone-500' },
  urgent: { label: '관심/조금 힘들어요', color: 'text-amber-800 bg-amber-100', badge: 'bg-amber-500' },
  emergency: { label: '🚨 긴급 상담 필요', color: 'text-rose-800 bg-rose-100 animate-pulse', badge: 'bg-rose-600' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '접수 대기', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  in_progress: { label: '상담 진행 중', color: 'bg-sky-100 text-sky-900 border-sky-300' },
  completed: { label: '상담 완료', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  monitoring: { label: '추후 관찰', color: 'bg-purple-100 text-purple-900 border-purple-300' },
};

const MOOD_OPTIONS = [
  { value: '답답함', emoji: '😶‍🌫️', label: '답답함' },
  { value: '불안/초조', emoji: '😰', label: '불안/초조' },
  { value: '매우우울', emoji: '😭', label: '매우 힘듦' },
  { value: '조금지침', emoji: '😮‍💨', label: '조금 지침' },
  { value: '괜찮아지는중', emoji: '🌱', label: '괜찮아지는 중' },
];

export const OneOnOneCounseling: React.FC<{
  activeSessionId?: number | null;
  onOpenApplyTab?: () => void;
}> = ({ activeSessionId, onOpenApplyTab }) => {
  const { getAuthToken, role, currentUser } = useAuth();
  const isTeacher = role === 'teacher';

  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(activeSessionId || null);
  const [activeSession, setActiveSession] = useState<ConsultationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Quick Chat message & file upload
  const [messageText, setMessageText] = useState('');
  const [chatAttachment, setChatAttachment] = useState<{ url: string; name: string } | null>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Teacher quick update state
  const [teacherStatus, setTeacherStatus] = useState<string>('pending');
  const [teacherMemo, setTeacherMemo] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [savingTeacherMeta, setSavingTeacherMeta] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/consultations?isTeacher=${isTeacher}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (!selectedSessionId && data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load consultation sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (id: number) => {
    setLoadingMessages(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/consultations/${id}?isTeacher=${isTeacher}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setTeacherStatus(data.status);
        setTeacherMemo(data.teacherPrivateMemo || '');
        setFollowUpDate(data.followUpDate || '');
      }
    } catch (e) {
      console.error('Failed to load consultation detail:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 6000);
    return () => clearInterval(interval);
  }, [isTeacher]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 8 * 1024 * 1024) {
        alert('파일은 최대 8MB까지 첨부할 수 있습니다.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setChatAttachment({
          url: evt.target?.result as string,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !chatAttachment) || !selectedSessionId) return;

    setSendingMsg(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/consultations/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText.trim() || (chatAttachment ? '파일 첨부' : ''),
          senderName: currentUser?.name || (isTeacher ? '담임선생님' : '학생'),
          senderRole: isTeacher ? 'teacher' : 'student',
          attachmentUrl: chatAttachment?.url,
          attachmentName: chatAttachment?.name,
        }),
      });

      if (res.ok) {
        setMessageText('');
        setChatAttachment(null);
        if (chatFileInputRef.current) {
          chatFileInputRef.current.value = '';
        }
        await fetchSessionDetail(selectedSessionId);
        await fetchSessions();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSaveTeacherMeta = async () => {
    if (!selectedSessionId) return;
    setSavingTeacherMeta(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/consultations/${selectedSessionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: teacherStatus,
          teacherPrivateMemo: teacherMemo,
          followUpDate,
        }),
      });

      if (res.ok) {
        await fetchSessionDetail(selectedSessionId);
        await fetchSessions();
        alert('상담 진행 상태와 교사 비공개 메모가 저장되었습니다.');
      }
    } catch (e) {
      console.error('Teacher update failed:', e);
    } finally {
      setSavingTeacherMeta(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5" />
            선생님과 1:1 시크릿 대화창구
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            선생님께만 보이는 1:1 비밀 대화 💌
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            친구들에게는 전혀 보이지 않는 안전한 일대일 상담 대화방입니다.
          </p>
        </div>

        {!isTeacher && onOpenApplyTab && (
          <button
            onClick={onOpenApplyTab}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>비밀 상담 신청서 작성 (Apply)</span>
          </button>
        )}
      </div>

      {/* Main 2-Column Split: Session List (Left) & Chat Box (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Consultation List */}
        <div className={`lg:col-span-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col ${selectedSessionId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-stone-800 text-sm">
              {isTeacher ? '접수된 학생 상담 목록' : '나의 비밀 상담 목록'} ({sessions.length})
            </h3>
            <span className="text-[11px] text-stone-400">실시간 연동</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 max-h-[650px]">
            {loading ? (
              <div className="py-16 text-center text-stone-400 text-xs">
                상담 목록을 불러오는 중...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 px-4 text-center text-stone-400">
                <Lock className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-semibold text-stone-700">진행 중인 상담이 없습니다.</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  {isTeacher
                    ? '학생들이 1:1 상담을 신청하면 이곳에 도착합니다.'
                    : '새로운 고민이 있다면 [비밀 상담 신청 (Apply)] 탭에서 접수하세요.'}
                </p>
                {!isTeacher && onOpenApplyTab && (
                  <button
                    onClick={onOpenApplyTab}
                    className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    상담 신청서 작성하기
                  </button>
                )}
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const urgencyInfo = URGENCY_LABELS[sess.urgency] || URGENCY_LABELS.normal;
                const statusInfo = STATUS_LABELS[sess.status] || STATUS_LABELS.pending;

                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-600'
                        : 'hover:bg-stone-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {new Date(sess.updatedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-stone-900 leading-snug line-clamp-1">
                      {sess.title}
                    </h4>

                    {sess.attachmentUrl && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-700 font-semibold">
                        <Paperclip className="w-3 h-3" />
                        <span>첨부파일 포함</span>
                      </div>
                    )}

                    {isTeacher && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600 font-medium">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{sess.studentName}</span>
                        {sess.studentNumber && (
                          <span className="text-stone-400 text-[11px]">({sess.studentNumber})</span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${urgencyInfo.color}`}>
                        {urgencyInfo.label}
                      </span>
                      {sess.unreadCount ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                          새 메시지 {sess.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Consultation Chat Window */}
        <div className={`lg:col-span-8 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col ${!selectedSessionId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedSessionId && activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="lg:hidden p-1 text-stone-600 hover:text-stone-900"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-stone-900">
                        {activeSession.title}
                      </h3>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          STATUS_LABELS[activeSession.status]?.color
                        }`}
                      >
                        {STATUS_LABELS[activeSession.status]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span>내담 학생: <strong>{activeSession.studentName}</strong></span>
                      <span>·</span>
                      <span>기분: {activeSession.currentMood}</span>
                      <span>·</span>
                      <span>분야: {activeSession.category}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>비밀 암호화 상담중</span>
                </div>
              </div>

              {/* Initial Session Uploaded Attachment Banner (if exists) */}
              {activeSession.attachmentUrl && (
                <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {activeSession.attachmentUrl.startsWith('data:image/') ? (
                      <img
                        src={activeSession.attachmentUrl}
                        alt="첨부 이미지"
                        className="w-10 h-10 rounded-lg object-cover border border-rose-300 shrink-0 cursor-pointer"
                        onClick={() => {
                          const w = window.open('');
                          w?.document.write(`<img src="${activeSession.attachmentUrl}" style="max-width:100%" />`);
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-bold text-rose-950 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-rose-600" />
                        <span>신청 시 첨부된 시크릿 파일:</span>
                      </div>
                      <span className="text-[11px] text-rose-800 truncate block">
                        {activeSession.attachmentName || '첨부 문서/사진'}
                      </span>
                    </div>
                  </div>

                  <a
                    href={activeSession.attachmentUrl}
                    download={activeSession.attachmentName || '상담첨부파일'}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 font-semibold rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    다운로드 / 크게보기
                  </a>
                </div>
              )}

              {/* Teacher Private Observation Panel (Teacher View Only) */}
              {isTeacher && (
                <div className="p-3.5 bg-amber-50/80 border-b border-amber-200 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <GraduationCap className="w-4 h-4 text-amber-700" />
                      <span>교사 전용 비공개 상담일지 & 지도계획 (학생 비공개)</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium">
                      🔒 학생에게는 표시되지 않습니다
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                        상담 상태 변경
                      </label>
                      <select
                        value={teacherStatus}
                        onChange={(e) => setTeacherStatus(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800"
                      >
                        <option value="pending">접수 대기</option>
                        <option value="in_progress">상담 진행 중</option>
                        <option value="completed">상담 완료</option>
                        <option value="monitoring">추후 관찰 필요</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                        대면 상담/사후 확인일
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-lg p-1 text-xs text-stone-800"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleSaveTeacherMeta}
                        disabled={savingTeacherMeta}
                        className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        {savingTeacherMeta ? '저장 중...' : '상담일지 저장'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <textarea
                      value={teacherMemo}
                      onChange={(e) => setTeacherMemo(e.target.value)}
                      placeholder="상담 요점, 학생 성향 관찰, 학부모 연계 필요성, 심리상태 관찰 메모 등을 기록하세요..."
                      rows={2}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50 max-h-[460px]">
                <div className="mx-auto max-w-md p-2 rounded-xl bg-stone-100 border border-stone-200 text-center text-[11px] text-stone-500 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>이 대화와 업로드 파일은 선생님과 학생 본인만 열람할 수 있습니다.</span>
                </div>

                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-stone-400">
                    대화 내용을 불러오는 중...
                  </div>
                ) : (
                  activeSession.messages?.map((msg) => {
                    const isMe = msg.senderUid === currentUser?.uid;
                    const isMsgFromTeacher = msg.senderRole === 'teacher';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 mb-1 text-[11px] text-stone-500 font-medium">
                          {isMsgFromTeacher ? (
                            <span className="flex items-center gap-1 text-rose-700 font-bold">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {msg.senderName}
                            </span>
                          ) : (
                            <span>{msg.senderName}</span>
                          )}
                          <span>·</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-wrap ${
                            isMe
                              ? 'bg-rose-600 text-white rounded-br-xs'
                              : isMsgFromTeacher
                              ? 'bg-white border-2 border-rose-300 text-stone-900 rounded-bl-xs'
                              : 'bg-white border border-stone-200 text-stone-900 rounded-bl-xs'
                          }`}
                        >
                          {msg.message}

                          {/* Render message attachment if present */}
                          {msg.attachmentUrl && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              {msg.attachmentUrl.startsWith('data:image/') ? (
                                <img
                                  src={msg.attachmentUrl}
                                  alt="첨부 이미지"
                                  className="max-h-48 rounded-xl object-contain bg-black/5"
                                />
                              ) : (
                                <a
                                  href={msg.attachmentUrl}
                                  download={msg.attachmentName || '첨부파일'}
                                  className={`inline-flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold underline ${
                                    isMe ? 'text-white' : 'text-rose-700'
                                  }`}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span>{msg.attachmentName || '첨부파일 다운로드'}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Attachment Toolbar */}
              <div className="p-3 bg-white border-t border-stone-200">
                {/* Pending attachment preview */}
                {chatAttachment && (
                  <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="font-semibold text-rose-900 truncate">
                        {chatAttachment.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatAttachment(null)}
                      className="p-1 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    onChange={handleChatFileSelect}
                    accept="image/*,.pdf,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="사진 또는 파일 첨부"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      isTeacher
                        ? '학생에게 따뜻하고 든든한 조언과 격려를 남겨주세요...'
                        : '선생님께 드릴 말씀을 적어주세요 (사진/파일 첨부 가능)...'
                    }
                    className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || (!messageText.trim() && !chatAttachment)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">전송</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="m-auto py-24 text-center text-stone-400">
              <MessageSquare className="w-12 h-12 mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-bold text-stone-700">열람할 상담 세션을 선택하세요.</p>
              <p className="text-xs text-stone-400 mt-1">
                왼쪽 목록에서 학생 또는 본인의 1:1 상담을 클릭하시면 비밀 대화가 시작됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
