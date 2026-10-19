import React, { useState, useEffect } from 'react';
import { TeacherAnalytics, StudentHistorySummary, ConsultationSession } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ClipboardList,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Printer,
  Sparkles,
  UserCheck,
  X,
  Bookmark,
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigateToSession: (sessionId: number) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigateToSession,
}) => {
  const { getAuthToken } = useAuth();
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'sessions'>('roster');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentHistorySummary | null>(null);

  const fetchAnalytics = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/teacher/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to load teacher analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handlePrintStudentCard = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const headers = ['학생명', '학번/반', '상담제목', '카테고리', '긴급도', '상태', '기분', '신청일자', '선생님비공개메모'];
    const rows: string[][] = [];

    analytics.studentHistories.forEach((student) => {
      student.sessions.forEach((s) => {
        rows.push([
          `"${student.studentName}"`,
          `"${student.studentNumber || ''}"`,
          `"${s.title.replace(/"/g, '""')}"`,
          `"${s.category}"`,
          `"${s.urgency}"`,
          `"${s.status}"`,
          `"${s.currentMood}"`,
          `"${new Date(s.createdAt).toLocaleDateString()}"`,
          `"${(s.teacherPrivateMemo || '').replace(/"/g, '""')}"`,
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `우리반_학생상담_이력관리부_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-stone-400">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">체계적 상담 이력 데이터베이스를 로드 중입니다...</p>
      </div>
    );
  }

  const studentList = analytics?.studentHistories || [];
  const filteredStudents = studentList.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.studentNumber && s.studentNumber.includes(searchQuery))
  );

  const allSessions: ConsultationSession[] =
    analytics?.studentHistories.flatMap((s) => s.sessions) || [];

  const filteredSessions = allSessions.filter((sess) => {
    const matchSearch =
      sess.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sess.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || sess.status === statusFilter;
    const matchUrgency = urgencyFilter === 'all' || sess.urgency === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold mb-2">
              <ClipboardList className="w-3.5 h-3.5" />
              담임 교사용 상담 통합 관리 시스템
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              학생별 상담 이력 데이터베이스 📚
            </h1>
            <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
              학생들의 상담 이력을 한눈에 체계적으로 조회하고, 비공개 관찰일지 및 사후 지도를 효율적으로 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-950 font-bold text-xs sm:text-sm rounded-xl shadow-md hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>상담기록 CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <span className="text-xs text-emerald-200">총 누적 상담</span>
            <div className="text-2xl font-black mt-0.5">{analytics?.totalSessions || 0}건</div>
          </div>
          <div className="bg-amber-500/20 backdrop-blur-md rounded-xl p-3.5 border border-amber-300/20">
            <span className="text-xs text-amber-200">확인 대기 (접수)</span>
            <div className="text-2xl font-black text-amber-300 mt-0.5">
              {analytics?.pendingCount || 0}건
            </div>
          </div>
          <div className="bg-rose-500/20 backdrop-blur-md rounded-xl p-3.5 border border-rose-300/20">
            <span className="text-xs text-rose-200">🚨 긴급/관심 요망</span>
            <div className="text-2xl font-black text-rose-300 mt-0.5">
              {analytics?.urgentCount || 0}명
            </div>
          </div>
          <div className="bg-purple-500/20 backdrop-blur-md rounded-xl p-3.5 border border-purple-300/20">
            <span className="text-xs text-purple-200">추후 지속 관찰</span>
            <div className="text-2xl font-black text-purple-300 mt-0.5">
              {analytics?.monitoringCount || 0}명
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Roster vs All Sessions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>학생별 상담 이력 대장 ({studentList.length}명)</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-600" />
            <span>상담 건별 통합 대장 ({allSessions.length}건)</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생 이름 또는 제목 검색..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* View 1: Student Roster View */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <th className="py-3 px-4">학생명</th>
                  <th className="py-3 px-4">학번 / 반</th>
                  <th className="py-3 px-4 text-center">총 상담 건수</th>
                  <th className="py-3 px-4 text-center">미처리/긴급</th>
                  <th className="py-3 px-4">최근 상담 분야</th>
                  <th className="py-3 px-4">최근 심리 상태</th>
                  <th className="py-3 px-4">최근 상담 일시</th>
                  <th className="py-3 px-4 text-right">상세 기록</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      등록된 학생 상담 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.studentUid} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {st.studentName}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-medium">
                        {st.studentNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                        {st.sessionsCount}회
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {st.urgentCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            🚨 긴급 {st.urgentCount}건
                          </span>
                        ) : st.pendingCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            대기 {st.pendingCount}건
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-medium">정상</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                          {st.recentCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {st.recentMood}
                      </td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {new Date(st.lastConsultationDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudent(st)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          상담카드 열람
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: All Sessions Detailed Table */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Status & Urgency filter toolbar */}
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-stone-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>진행상태:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800"
            >
              <option value="all">전체 상태</option>
              <option value="pending">접수 대기</option>
              <option value="in_progress">상담 진행 중</option>
              <option value="completed">상담 완료</option>
              <option value="monitoring">추후 관찰 필요</option>
            </select>

            <div className="flex items-center gap-1 text-stone-500 font-semibold ml-2">
              <span>긴급도:</span>
            </div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800"
            >
              <option value="all">전체 긴급도</option>
              <option value="normal">일반 상담</option>
              <option value="urgent">관심/조금 힘들어요</option>
              <option value="emergency">🚨 긴급 상담</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <th className="py-3 px-4">학생명</th>
                  <th className="py-3 px-4">상담 제목</th>
                  <th className="py-3 px-4">분야</th>
                  <th className="py-3 px-4">긴급도</th>
                  <th className="py-3 px-4">진행상태</th>
                  <th className="py-3 px-4">사후 관찰일</th>
                  <th className="py-3 px-4">교사 비공개 메모</th>
                  <th className="py-3 px-4 text-right">대화방</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      해당 조건의 상담 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {s.studentName}
                        {s.studentNumber && (
                          <span className="block text-[11px] text-stone-400 font-normal">
                            {s.studentNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-800 max-w-xs truncate">
                        {s.title}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.urgency === 'emergency' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            🚨 긴급
                          </span>
                        ) : s.urgency === 'urgent' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                            관심
                          </span>
                        ) : (
                          <span className="text-stone-500">일반</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'in_progress'
                              ? 'bg-sky-100 text-sky-800'
                              : s.status === 'monitoring'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status === 'completed'
                            ? '완료'
                            : s.status === 'in_progress'
                            ? '상담중'
                            : s.status === 'monitoring'
                            ? '추후관찰'
                            : '접수대기'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500">
                        {s.followUpDate || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-[200px] truncate">
                        {s.teacherPrivateMemo ? (
                          <span className="text-stone-700 italic">
                            "{s.teacherPrivateMemo}"
                          </span>
                        ) : (
                          <span className="text-stone-300">작성 메모 없음</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onNavigateToSession(s.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          대화창 이동
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Consultation Card Modal (Printable Document Format) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    [상담 기록 카드] {selectedStudent.studentName} 학생
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedStudent.studentNumber || '학번 미등록'} · 총 누적 상담 {selectedStudent.sessionsCount}회
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintStudentCard}
                  className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg cursor-pointer"
                  title="인쇄하기"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Chronological Consultation Timeline */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-500">최근 호소 심리:</span>{' '}
                  <strong className="text-stone-800">{selectedStudent.recentMood}</strong>
                </div>
                <div>
                  <span className="text-stone-500">주요 상담 영역:</span>{' '}
                  <strong className="text-stone-800">{selectedStudent.recentCategory}</strong>
                </div>
              </div>

              <h4 className="font-bold text-xs text-stone-800 tracking-tight uppercase">
                상담 일자별 누적 기록 타임라인
              </h4>

              <div className="space-y-3">
                {selectedStudent.sessions.map((sess, idx) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px]">
                          {selectedStudent.sessions.length - idx}
                        </span>
                        <span className="font-bold text-stone-900">{sess.title}</span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {new Date(sess.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                        분야: {sess.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        기분: {sess.currentMood}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          sess.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        상태: {sess.status}
                      </span>
                      {sess.followUpDate && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                          사후 확인일: {sess.followUpDate}
                        </span>
                      )}
                    </div>

                    {/* Teacher Private Notes */}
                    {sess.teacherPrivateMemo && (
                      <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-950">
                        <div className="font-bold text-[11px] text-amber-800 mb-0.5">
                          🔒 교사 비공개 관찰일지:
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{sess.teacherPrivateMemo}</p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          onNavigateToSession(sess.id);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>대화 내용 열람하기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
