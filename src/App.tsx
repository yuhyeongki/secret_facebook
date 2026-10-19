import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AnonymousBoard } from './components/AnonymousBoard.tsx';
import { OneOnOneCounseling } from './components/OneOnOneCounseling.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { SupabaseSetupBanner } from './components/SupabaseSetupBanner.tsx';
import { HeartHandshake, PhoneCall, ShieldCheck, Lock, Sparkles } from 'lucide-react';

function CounselingApp() {
  const { role } = useAuth();
  const [currentTab, setCurrentTab] = useState<'board' | 'consultation' | 'dashboard'>('board');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const handleSelectNotificationLink = (link: string) => {
    if (link.startsWith('/consultation/')) {
      const parts = link.split('/');
      const id = parseInt(parts[2], 10);
      if (!isNaN(id)) {
        setActiveSessionId(id);
        setCurrentTab('consultation');
      }
    } else if (link.startsWith('/board')) {
      setCurrentTab('board');
    }
  };

  const handleNavigateToSessionFromDashboard = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setCurrentTab('consultation');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Supabase Integration Banner */}
      <SupabaseSetupBanner />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'consultation') {
            setActiveSessionId(null);
          }
        }}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'board' && <AnonymousBoard />}
        {currentTab === 'consultation' && (
          <OneOnOneCounseling activeSessionId={activeSessionId} />
        )}
        {currentTab === 'dashboard' && (
          <TeacherDashboard onNavigateToSession={handleNavigateToSessionFromDashboard} />
        )}
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectLink={handleSelectNotificationLink}
        onUnreadCountChange={setUnreadCount}
      />

      {/* Warm Classroom Footer & Emergency Hotlines */}
      <footer className="bg-white border-t border-stone-200 py-8 px-4 text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-stone-800">
                우리반 비밀 상담소 · 학생 존중 & 비밀 보장
              </p>
              <p className="text-[11px] text-stone-400">
                선생님과 학생 간의 모든 상담 내역은 안전하게 암호화되어 관리됩니다.
              </p>
            </div>
          </div>

          {/* Emergency Helpline Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-stone-400">도움이 필요할 땐 언제나:</span>
            <span className="px-2.5 py-1 bg-stone-100 rounded-md font-medium text-stone-700 flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-stone-500" />
              청소년 상담 전화 <strong>1388</strong>
            </span>
            <span className="px-2.5 py-1 bg-stone-100 rounded-md font-medium text-stone-700">
              학교 Wee 클래스 / 센터
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CounselingApp />
    </AuthProvider>
  );
}
