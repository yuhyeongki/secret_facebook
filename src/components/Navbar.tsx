import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  HeartHandshake,
  MessageSquareHeart,
  Lock,
  ClipboardList,
  Bell,
  LogIn,
  LogOut,
  UserCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'board' | 'consultation' | 'dashboard';
  onTabChange: (tab: 'board' | 'consultation' | 'dashboard') => void;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  unreadCount,
  onOpenNotifications,
}) => {
  const { role, currentUser, supabaseUser, loginWithGoogle, logout, switchDemoRole } = useAuth();

  const isTeacher = role === 'teacher';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => onTabChange('board')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-stone-900 text-lg tracking-tight">
                  우리반 비밀 상담소
                </span>
                <span className="hidden sm:inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                  비밀 보장 🔒
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                선생님과 우리들의 따뜻한 마음 쉼터
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onTabChange('board')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'board'
                  ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <MessageSquareHeart className="w-4 h-4 text-amber-600" />
              <span>마음 우체통</span>
              <span className="hidden md:inline text-xs font-normal text-stone-400">(익명 고민)</span>
            </button>

            <button
              onClick={() => onTabChange('consultation')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'consultation'
                  ? 'bg-rose-100/80 text-rose-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Lock className="w-4 h-4 text-rose-600" />
              <span>1:1 비밀 상담</span>
              <span className="hidden md:inline text-xs font-normal text-stone-400">(선생님 전용)</span>
            </button>

            {isTeacher && (
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-100/80 text-emerald-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>상담 이력 관리</span>
                <span className="hidden md:inline-block bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  교사용
                </span>
              </button>
            )}
          </nav>

          {/* User & Notification Controls */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title="알림 확인"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Role switch toggle pill for easy teacher/student experience testing */}
            <div className="hidden lg:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                onClick={() => switchDemoRole('teacher')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  isTeacher
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                교사 모드
              </button>
              <button
                onClick={() => switchDemoRole('student')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  !isTeacher
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                학생 모드
              </button>
            </div>

            {/* User profile capsule */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1">
                  {isTeacher ? (
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-xs font-bold text-stone-800">
                    {currentUser?.name || (isTeacher ? '김선생님' : '김하늘')}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500">
                  {isTeacher ? '담임 교사' : (currentUser?.studentNumber || '1반 학생')}
                </span>
              </div>

              {supabaseUser ? (
                <button
                  onClick={logout}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  title="Google 계정으로 로그인"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Google 로그인</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile secondary role switch banner */}
        <div className="lg:hidden py-1.5 px-2 bg-stone-50 border-t border-stone-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-stone-600">
            <span className="font-semibold text-stone-800">
              현재: {isTeacher ? '선생님 모드 🍎' : '학생 모드 🎒'}
            </span>
            <span className="text-stone-400">({currentUser?.name})</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => switchDemoRole(isTeacher ? 'student' : 'teacher')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-medium text-[11px] shadow-2xs hover:bg-stone-100"
            >
              {isTeacher ? '학생으로 전환' : '선생님으로 전환'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
