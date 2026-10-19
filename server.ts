import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  updateUserProfile,
  getAllUsers,
  getAnonymousPosts,
  createAnonymousPost,
  addPostReaction,
  addPostComment,
  getConsultationSessions,
  getConsultationSessionById,
  createConsultationSession,
  addConsultationMessage,
  updateConsultationSessionByTeacher,
  getTeacherDashboardAnalytics,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './src/db/queries.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ----------------- API ROUTES -----------------

// 1. User profile sync & update
app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, name, role, studentNumber, avatar } = req.body;
    const uid = req.user?.uid!;
    const userEmail = req.user?.email || email || 'student@school.kr';
    const userName = name || req.user?.name || (userEmail === 'megayhk@gmail.com' ? '담임 선생님' : '우리반 학생');

    const user = await getOrCreateUser(uid, userEmail, userName, role, studentNumber, avatar);
    res.json(user);
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message || '사용자 동기화 실패' });
  }
});

app.put('/api/users/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const { name, studentNumber, avatar, role } = req.body;
    const updated = await updateUserProfile(uid, { name, studentNumber, avatar, role });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message || '프로필 수정 실패' });
  }
});

app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || '사용자 목록 조회 실패' });
  }
});

// 2. Anonymous Worry Board
app.get('/api/posts', async (_req, res) => {
  try {
    const posts = await getAnonymousPosts();
    res.json(posts);
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message || '게시글 목록 조회 실패' });
  }
});

app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { nickname, category, title, content, isAnonymous } = req.body;
    const uid = req.user?.uid!;
    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    }

    const post = await createAnonymousPost({
      authorUid: uid,
      nickname: nickname || '익명의 친구',
      category: category || '기타',
      title,
      content,
      isAnonymous: isAnonymous ?? true,
    });
    res.json(post);
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: error.message || '고민 등록 실패' });
  }
});

app.post('/api/posts/:id/reactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { reactionType } = req.body;
    const uid = req.user?.uid!;

    const result = await addPostReaction(postId, uid, reactionType || 'cheer');
    res.json(result);
  } catch (error: any) {
    console.error('Error reacting to post:', error);
    res.status(500).json({ error: error.message || '공감 반응 실패' });
  }
});

app.post('/api/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { authorName, isTeacher, content } = req.body;
    const uid = req.user?.uid!;

    if (!content) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    const comment = await addPostComment(
      postId,
      uid,
      authorName || '따뜻한 친구',
      Boolean(isTeacher),
      content
    );
    res.json(comment);
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message || '댓글 등록 실패' });
  }
});

// 3. 1:1 Secret Consultation Sessions & Messages
app.get('/api/consultations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const isTeacher = req.query.isTeacher === 'true' || req.user?.email === 'megayhk@gmail.com';
    const sessions = await getConsultationSessions(uid, isTeacher);
    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: error.message || '상담 목록 조회 실패' });
  }
});

app.get('/api/consultations/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const uid = req.user?.uid!;
    const isTeacher = req.query.isTeacher === 'true' || req.user?.email === 'megayhk@gmail.com';

    const session = await getConsultationSessionById(sessionId, uid, isTeacher);
    if (!session) {
      return res.status(404).json({ error: '상담 세션을 찾을 수 없습니다.' });
    }
    res.json(session);
  } catch (error: any) {
    console.error('Error fetching consultation session:', error);
    res.status(500).json({ error: error.message || '상담 상세 조회 실패' });
  }
});

app.post('/api/consultations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const { studentName, studentNumber, title, category, urgency, currentMood, initialMessage } = req.body;

    if (!title || !initialMessage) {
      return res.status(400).json({ error: '상담 제목과 고민 내용을 모두 입력해주세요.' });
    }

    const session = await createConsultationSession({
      studentUid: uid,
      studentName: studentName || '우리반 학생',
      studentNumber: studentNumber || '',
      title,
      category: category || '일반상담',
      urgency: urgency || 'normal',
      currentMood: currentMood || '답답함',
      initialMessage,
    });

    res.json(session);
  } catch (error: any) {
    console.error('Error creating consultation session:', error);
    res.status(500).json({ error: error.message || '1:1 상담 신청 실패' });
  }
});

app.post('/api/consultations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const uid = req.user?.uid!;
    const { senderName, senderRole, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '메시지를 입력해주세요.' });
    }

    const savedMsg = await addConsultationMessage(
      sessionId,
      uid,
      senderName || '참여자',
      senderRole || 'student',
      message.trim()
    );

    res.json(savedMsg);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || '메시지 전송 실패' });
  }
});

app.put('/api/consultations/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { status, teacherPrivateMemo, followUpDate, category, urgency } = req.body;

    const updated = await updateConsultationSessionByTeacher(sessionId, {
      status,
      teacherPrivateMemo,
      followUpDate,
      category,
      urgency,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating consultation status:', error);
    res.status(500).json({ error: error.message || '상담 상태 업데이트 실패' });
  }
});

// 4. Teacher Analytics & Management Dashboard
app.get('/api/teacher/analytics', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const analytics = await getTeacherDashboardAnalytics();
    res.json(analytics);
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message || '선생님 통계 조회 실패' });
  }
});

// 5. Notifications
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const notifs = await getNotifications(uid);
    res.json(notifs);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message || '알림 조회 실패' });
  }
});

app.post('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const uid = req.user?.uid!;
    const result = await markNotificationAsRead(notifId, uid);
    res.json(result);
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: error.message || '알림 읽음 처리 실패' });
  }
});

app.post('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const result = await markAllNotificationsAsRead(uid);
    res.json(result);
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: error.message || '알림 일괄 읽음 처리 실패' });
  }
});

// ----------------- VITE INTEGRATION -----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`우리반 비밀 상담소 서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
}

startServer();
