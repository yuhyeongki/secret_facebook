import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://josycwwlekamytlbeeph.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvc3ljd3dsZWthbXl0bGJlZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDMyNjEsImV4cCI6MjEwNzk3OTI2MX0.eQdtBuHkcUwzaGzeYfDEc3303_wuHL3zsyrckBQq_M8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

CREATE POLICY "Allow public all access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on anonymous_posts" ON public.anonymous_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on post_reactions" ON public.post_reactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on post_comments" ON public.post_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on consultation_sessions" ON public.consultation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on consultation_messages" ON public.consultation_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
`;
