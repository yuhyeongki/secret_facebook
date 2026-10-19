import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. 사용자 테이블 (선생님/학생)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('student'), // 'teacher' | 'student'
  studentNumber: text('student_number'), // e.g. "1학년 2반 15번"
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. 익명 고민 나눔 게시글
export const anonymousPosts = pgTable('anonymous_posts', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid').notNull(),
  nickname: text('nickname').notNull().default('익명의 친구'),
  category: text('category').notNull().default('기타'), // '학업/성적', '친구관계', '진로', '가족', '학교생활', '기타'
  title: text('title').notNull(),
  content: text('content').notNull(),
  empathyCount: integer('empathy_count').notNull().default(0),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. 익명 게시글 공감 반응
export const postReactions = pgTable('post_reactions', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => anonymousPosts.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid').notNull(),
  reactionType: text('reaction_type').notNull().default('cheer'), // 'cheer' | 'sympathy' | 'hug' | 'warmth'
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. 익명 게시글 따뜻한 댓글
export const postComments = pgTable('post_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => anonymousPosts.id, { onDelete: 'cascade' })
    .notNull(),
  authorUid: text('author_uid').notNull(),
  authorName: text('author_name').notNull(),
  isTeacher: boolean('is_teacher').notNull().default(false),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. 선생님-학생 1:1 비밀 상담 세션
export const consultationSessions = pgTable('consultation_sessions', {
  id: serial('id').primaryKey(),
  studentUid: text('student_uid').notNull(),
  studentName: text('student_name').notNull(),
  studentNumber: text('student_number'),
  title: text('title').notNull(),
  category: text('category').notNull().default('일반상담'), // '학업/성적', '교우관계', '진로상담', '정서/심리', '가정문제', '긴급상담', '기타'
  urgency: text('urgency').notNull().default('normal'), // 'normal', 'urgent', 'emergency'
  currentMood: text('current_mood').notNull().default('답답함'), // '매우우울', '불안/초조', '답답함', '조금지침', '괜찮아지는중'
  status: text('status').notNull().default('pending'), // 'pending' (접수), 'in_progress' (상담중), 'completed' (상담완료), 'monitoring' (추후관찰)
  teacherPrivateMemo: text('teacher_private_memo').default(''), // 선생님만 볼 수 있는 비공개 관찰일지 및 상담 기록
  followUpDate: text('follow_up_date'), // 대면 상담 또는 사후 확인 예정일 (YYYY-MM-DD)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. 1:1 비밀 상담 대화 메시지
export const consultationMessages = pgTable('consultation_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => consultationSessions.id, { onDelete: 'cascade' })
    .notNull(),
  senderUid: text('sender_uid').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull().default('student'), // 'student' | 'teacher'
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. 실시간 및 푸시 알림
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientUid: text('recipient_uid').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link'),
  type: text('type').notNull(), // 'new_consultation' | 'new_reply' | 'reaction' | 'status_change'
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const anonymousPostsRelations = relations(anonymousPosts, ({ many }) => ({
  reactions: many(postReactions),
  comments: many(postComments),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(anonymousPosts, {
    fields: [postReactions.postId],
    references: [anonymousPosts.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(anonymousPosts, {
    fields: [postComments.postId],
    references: [anonymousPosts.id],
  }),
}));

export const consultationSessionsRelations = relations(consultationSessions, ({ many }) => ({
  messages: many(consultationMessages),
}));

export const consultationMessagesRelations = relations(consultationMessages, ({ one }) => ({
  session: one(consultationSessions, {
    fields: [consultationMessages.sessionId],
    references: [consultationSessions.id],
  }),
}));
