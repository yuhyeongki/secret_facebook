import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  process.env.VITE_SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createClient('https://placeholder-project.supabase.co', 'placeholder-anon-key');

// SQL script ready for Supabase SQL Editor
export const SUPABASE_SCHEMA_SQL = `-- 우리반 비밀 상담소 Supabase 테이블 생성 스크립트
-- Supabase 대시보드 -> SQL Editor에 붙여넣고 'RUN'을 실행하세요.

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  student_number TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 익명 고민 나눔 게시판
CREATE TABLE IF NOT EXISTS public.anonymous_posts (
  id SERIAL PRIMARY KEY,
  author_uid TEXT NOT NULL,
  nickname TEXT DEFAULT '익명의 친구' NOT NULL,
  category TEXT DEFAULT '기타' NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  empathy_count INTEGER DEFAULT 0 NOT NULL,
  is_anonymous BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 게시글 공감 반응
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES public.anonymous_posts(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL,
  reaction_type TEXT DEFAULT 'cheer' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 게시글 따뜻한 댓글
CREATE TABLE IF NOT EXISTS public.post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES public.anonymous_posts(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  author_name TEXT NOT NULL,
  is_teacher BOOLEAN DEFAULT false NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 1:1 비밀 상담 세션
CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id SERIAL PRIMARY KEY,
  student_uid TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_number TEXT,
  title TEXT NOT NULL,
  category TEXT DEFAULT '일반상담' NOT NULL,
  urgency TEXT DEFAULT 'normal' NOT NULL,
  current_mood TEXT DEFAULT '답답함' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  teacher_private_memo TEXT DEFAULT '',
  follow_up_date TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 1:1 비밀 상담 대화 메시지
CREATE TABLE IF NOT EXISTS public.consultation_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  sender_uid TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'student' NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. 알림
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  recipient_uid TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 정책 설정 (누구나 안전하게 접근 가능하도록)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 정책 중복 오류 방지 DO 블록
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on users') THEN
    CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on anonymous_posts') THEN
    CREATE POLICY "Allow all on anonymous_posts" ON public.anonymous_posts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on post_reactions') THEN
    CREATE POLICY "Allow all on post_reactions" ON public.post_reactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on post_comments') THEN
    CREATE POLICY "Allow all on post_comments" ON public.post_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on consultation_sessions') THEN
    CREATE POLICY "Allow all on consultation_sessions" ON public.consultation_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on consultation_messages') THEN
    CREATE POLICY "Allow all on consultation_messages" ON public.consultation_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on notifications') THEN
    CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.anonymous_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.anonymous_posts (category);
CREATE INDEX IF NOT EXISTS idx_consultation_student ON public.consultation_sessions (student_uid);
CREATE INDEX IF NOT EXISTS idx_consultation_updated ON public.consultation_sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.consultation_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_uid, is_read);

-- 9. 실시간 대화 및 알림을 위한 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages, public.notifications, public.anonymous_posts;

-- 10. 초기 기본 계정 및 환영 글
INSERT INTO public.users (uid, email, name, role, student_number)
VALUES
  ('teacher-megayhk', 'megayhk@gmail.com', '김선생님 (담임교사)', 'teacher', '1학년 3반 담임'),
  ('student-haneul', 'student_haneul@school.kr', '김하늘', 'student', '1학년 3반 14번')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.anonymous_posts (author_uid, nickname, category, title, content, empathy_count, is_anonymous)
VALUES
  ('teacher-megayhk', '담임선생님 🍎', '학교생활', '우리반 비밀 상담소에 온 것을 환영합니다! 🌱', '학업, 진로, 친구 관계, 가족 문제 등 어떤 고민이든 혼자 끙끙 앓지 말고 편하게 털어놓으세요. 마음 우체통은 완전 익명으로, 1:1 상담은 선생님에게만 비밀로 전달됩니다.', 5, false)
ON CONFLICT DO NOTHING;
`;
