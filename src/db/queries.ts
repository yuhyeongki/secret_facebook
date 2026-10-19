import { db } from './index.ts';
import {
  users,
  anonymousPosts,
  postReactions,
  postComments,
  consultationSessions,
  consultationMessages,
  notifications,
} from './schema.ts';
import { eq, desc, and, or, sql } from 'drizzle-orm';

// ----------------- USER QUERIES -----------------

export async function getOrCreateUser(
  uid: string,
  email: string,
  name: string,
  role?: string,
  studentNumber?: string,
  avatar?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      // If user exists, optionally update name/avatar if provided
      if (name && (existing[0].name !== name || (role && existing[0].role !== role))) {
        const updated = await db
          .update(users)
          .set({
            name: name || existing[0].name,
            avatar: avatar || existing[0].avatar,
            role: role || existing[0].role,
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    // Teacher auto-assignment for megayhk@gmail.com or email containing teacher
    const isTeacher =
      email === 'megayhk@gmail.com' ||
      role === 'teacher' ||
      email.includes('teacher');
    const finalRole = isTeacher ? 'teacher' : (role || 'student');

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || (isTeacher ? '담임 선생님' : '우리반 학생'),
        role: finalRole,
        studentNumber: studentNumber || (isTeacher ? '교직원' : '1반'),
        avatar: avatar || '',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('사용자 정보를 동기화하는 중 오류가 발생했습니다.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { name?: string; studentNumber?: string; avatar?: string; role?: string }
) {
  try {
    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, uid))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw new Error('프로필 업데이트 중 오류가 발생했습니다.', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new Error('사용자 목록을 불러오는 중 오류가 발생했습니다.', { cause: error });
  }
}

// ----------------- ANONYMOUS POSTS QUERIES -----------------

export async function getAnonymousPosts() {
  try {
    const posts = await db
      .select()
      .from(anonymousPosts)
      .orderBy(desc(anonymousPosts.createdAt));

    // For each post, fetch reactions and comments
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const comments = await db
          .select()
          .from(postComments)
          .where(eq(postComments.postId, post.id))
          .orderBy(postComments.createdAt);

        const reactions = await db
          .select()
          .from(postReactions)
          .where(eq(postReactions.postId, post.id));

        return {
          ...post,
          comments,
          reactions,
        };
      })
    );

    return postsWithDetails;
  } catch (error) {
    console.error('getAnonymousPosts error:', error);
    throw new Error('익명 고민 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createAnonymousPost(data: {
  authorUid: string;
  nickname: string;
  category: string;
  title: string;
  content: string;
  isAnonymous?: boolean;
}) {
  try {
    const inserted = await db
      .insert(anonymousPosts)
      .values({
        authorUid: data.authorUid,
        nickname: data.nickname || '익명의 친구',
        category: data.category || '기타',
        title: data.title,
        content: data.content,
        isAnonymous: data.isAnonymous ?? true,
      })
      .returning();

    // Notify all teachers about the new worry post
    const teacherUsers = await db.select().from(users).where(eq(users.role, 'teacher'));
    for (const teacher of teacherUsers) {
      if (teacher.uid !== data.authorUid) {
        await createNotification(
          teacher.uid,
          '새로운 익명 고민이 등록되었습니다 📮',
          `"${data.title.substring(0, 30)}..." 게시판에 학생의 고민이 도착했습니다.`,
          '/board',
          'reaction'
        );
      }
    }

    return inserted[0];
  } catch (error) {
    console.error('createAnonymousPost error:', error);
    throw new Error('고민 글을 등록하는 데 실패했습니다.', { cause: error });
  }
}

export async function addPostReaction(postId: number, userUid: string, reactionType: string) {
  try {
    // Check if user already reacted with this type
    const existing = await db
      .select()
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userUid, userUid)
        )
      );

    if (existing.length > 0) {
      if (existing[0].reactionType === reactionType) {
        // Toggle off
        await db.delete(postReactions).where(eq(postReactions.id, existing[0].id));
        await db
          .update(anonymousPosts)
          .set({ empathyCount: sql`${anonymousPosts.empathyCount} - 1` })
          .where(eq(anonymousPosts.id, postId));
        return { action: 'removed' };
      } else {
        // Change reaction type
        await db
          .update(postReactions)
          .set({ reactionType })
          .where(eq(postReactions.id, existing[0].id));
        return { action: 'updated', reactionType };
      }
    }

    // Insert new reaction
    await db.insert(postReactions).values({
      postId,
      userUid,
      reactionType,
    });

    await db
      .update(anonymousPosts)
      .set({ empathyCount: sql`${anonymousPosts.empathyCount} + 1` })
      .where(eq(anonymousPosts.id, postId));

    // Notify post author
    const post = await db.select().from(anonymousPosts).where(eq(anonymousPosts.id, postId));
    if (post.length > 0 && post[0].authorUid !== userUid) {
      await createNotification(
        post[0].authorUid,
        '내 고민에 새로운 공감 응원이 도착했어요! 💛',
        `누군가가 내 고민 글 "${post[0].title.substring(0, 20)}"에 따뜻한 응원을 보냈습니다.`,
        '/board',
        'reaction'
      );
    }

    return { action: 'added', reactionType };
  } catch (error) {
    console.error('addPostReaction error:', error);
    throw new Error('공감 반응을 처리하지 못했습니다.', { cause: error });
  }
}

export async function addPostComment(
  postId: number,
  authorUid: string,
  authorName: string,
  isTeacher: boolean,
  content: string
) {
  try {
    const inserted = await db
      .insert(postComments)
      .values({
        postId,
        authorUid,
        authorName,
        isTeacher,
        content,
      })
      .returning();

    // Notify post author
    const post = await db.select().from(anonymousPosts).where(eq(anonymousPosts.id, postId));
    if (post.length > 0 && post[0].authorUid !== authorUid) {
      await createNotification(
        post[0].authorUid,
        isTeacher ? '선생님께서 따뜻한 조언을 남겨주셨어요! 🍎' : '내 고민에 따뜻한 응원 댓글이 달렸어요 💬',
        `"${content.substring(0, 30)}..."`,
        '/board',
        'new_reply'
      );
    }

    return inserted[0];
  } catch (error) {
    console.error('addPostComment error:', error);
    throw new Error('댓글을 등록하지 못했습니다.', { cause: error });
  }
}

// ----------------- 1:1 CONSULTATION SESSIONS & MESSAGES -----------------

export async function getConsultationSessions(userUid: string, isTeacher: boolean) {
  try {
    let query;
    if (isTeacher) {
      // Teachers see all student sessions
      query = db
        .select()
        .from(consultationSessions)
        .orderBy(desc(consultationSessions.updatedAt));
    } else {
      // Students see only their own sessions
      query = db
        .select()
        .from(consultationSessions)
        .where(eq(consultationSessions.studentUid, userUid))
        .orderBy(desc(consultationSessions.updatedAt));
    }

    const sessions = await query;

    // Attach latest message and unread count
    const enrichedSessions = await Promise.all(
      sessions.map(async (sess) => {
        const msgs = await db
          .select()
          .from(consultationMessages)
          .where(eq(consultationMessages.sessionId, sess.id))
          .orderBy(desc(consultationMessages.createdAt));

        const unreadCount = msgs.filter(
          (m) => !m.isRead && m.senderUid !== userUid
        ).length;

        return {
          ...sess,
          // Hide teacherPrivateMemo from student!
          teacherPrivateMemo: isTeacher ? sess.teacherPrivateMemo : '',
          messageCount: msgs.length,
          lastMessage: msgs.length > 0 ? msgs[0] : null,
          unreadCount,
        };
      })
    );

    return enrichedSessions;
  } catch (error) {
    console.error('getConsultationSessions error:', error);
    throw new Error('상담 세션 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function getConsultationSessionById(sessionId: number, userUid: string, isTeacher: boolean) {
  try {
    const rows = await db
      .select()
      .from(consultationSessions)
      .where(eq(consultationSessions.id, sessionId));

    if (rows.length === 0) return null;
    const session = rows[0];

    // Security check: non-teacher can only access their own session
    if (!isTeacher && session.studentUid !== userUid) {
      throw new Error('해당 비밀 상담에 접근할 권한이 없습니다.');
    }

    // Fetch messages
    const messages = await db
      .select()
      .from(consultationMessages)
      .where(eq(consultationMessages.sessionId, sessionId))
      .orderBy(consultationMessages.createdAt);

    // Mark messages as read for this user
    await db
      .update(consultationMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(consultationMessages.sessionId, sessionId),
          eq(consultationMessages.isRead, false),
          sql`${consultationMessages.senderUid} != ${userUid}`
        )
      );

    return {
      ...session,
      teacherPrivateMemo: isTeacher ? session.teacherPrivateMemo : '',
      messages,
    };
  } catch (error) {
    console.error('getConsultationSessionById error:', error);
    throw new Error('상담 상세 내용을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createConsultationSession(data: {
  studentUid: string;
  studentName: string;
  studentNumber?: string;
  title: string;
  category: string;
  urgency: string;
  currentMood: string;
  initialMessage: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  try {
    const insertedSession = await db
      .insert(consultationSessions)
      .values({
        studentUid: data.studentUid,
        studentName: data.studentName,
        studentNumber: data.studentNumber || '',
        title: data.title,
        category: data.category || '일반상담',
        urgency: data.urgency || 'normal',
        currentMood: data.currentMood || '답답함',
        status: 'pending',
        attachmentUrl: data.attachmentUrl || null,
        attachmentName: data.attachmentName || null,
      })
      .returning();

    const session = insertedSession[0];

    // Insert initial message
    if (data.initialMessage || data.attachmentUrl) {
      await db.insert(consultationMessages).values({
        sessionId: session.id,
        senderUid: data.studentUid,
        senderName: data.studentName,
        senderRole: 'student',
        message: data.initialMessage || '(첨부파일 포함 상담 신청)',
        attachmentUrl: data.attachmentUrl || null,
        attachmentName: data.attachmentName || null,
      });
    }

    // Push notification to all teachers!
    const teacherUsers = await db.select().from(users).where(eq(users.role, 'teacher'));
    for (const teacher of teacherUsers) {
      await createNotification(
        teacher.uid,
        `🔔 [비밀상담 접수] ${data.studentName} 학생의 새 상담 신청`,
        `[${data.urgency === 'urgent' ? '🚨긴급' : '상담'}] ${data.title}: "${data.initialMessage ? data.initialMessage.substring(0, 35) : '파일 첨부 상담'}..."`,
        `/consultation/${session.id}`,
        'new_consultation'
      );
    }

    return session;
  } catch (error) {
    console.error('createConsultationSession error:', error);
    throw new Error('1:1 비밀 상담을 신청하지 못했습니다.', { cause: error });
  }
}

export async function addConsultationMessage(
  sessionId: number,
  senderUid: string,
  senderName: string,
  senderRole: string,
  message: string,
  attachmentUrl?: string,
  attachmentName?: string
) {
  try {
    const sessRows = await db
      .select()
      .from(consultationSessions)
      .where(eq(consultationSessions.id, sessionId));

    if (sessRows.length === 0) {
      throw new Error('존재하지 않는 상담 세션입니다.');
    }
    const session = sessRows[0];

    const insertedMsg = await db
      .insert(consultationMessages)
      .values({
        sessionId,
        senderUid,
        senderName,
        senderRole,
        message,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
      })
      .returning();

    // Update session timestamp & auto-transition status from 'pending' to 'in_progress' if teacher replies
    const updates: any = { updatedAt: new Date() };
    if (senderRole === 'teacher' && session.status === 'pending') {
      updates.status = 'in_progress';
    }
    await db
      .update(consultationSessions)
      .set(updates)
      .where(eq(consultationSessions.id, sessionId));

    // Send notification to recipient
    if (senderRole === 'teacher') {
      // Notify student
      await createNotification(
        session.studentUid,
        '선생님께서 1:1 상담 메시지를 보내셨습니다 💌',
        `"${message.substring(0, 35)}..." 지금 확인해보세요.`,
        `/consultation/${sessionId}`,
        'new_reply'
      );
    } else {
      // Student sent message -> Notify teachers
      const teacherUsers = await db.select().from(users).where(eq(users.role, 'teacher'));
      for (const teacher of teacherUsers) {
        await createNotification(
          teacher.uid,
          `💬 [상담 메시지] ${session.studentName} 학생`,
          `"${message.substring(0, 35)}..."`,
          `/consultation/${sessionId}`,
          'new_reply'
        );
      }
    }

    return insertedMsg[0];
  } catch (error) {
    console.error('addConsultationMessage error:', error);
    throw new Error('메시지 전송에 실패했습니다.', { cause: error });
  }
}

export async function updateConsultationSessionByTeacher(
  sessionId: number,
  data: {
    status?: string;
    teacherPrivateMemo?: string;
    followUpDate?: string;
    category?: string;
    urgency?: string;
  }
) {
  try {
    const existing = await db
      .select()
      .from(consultationSessions)
      .where(eq(consultationSessions.id, sessionId));
    if (existing.length === 0) throw new Error('상담 세션을 찾을 수 없습니다.');

    const oldStatus = existing[0].status;

    const updated = await db
      .update(consultationSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(consultationSessions.id, sessionId))
      .returning();

    // If status changed, notify student
    if (data.status && data.status !== oldStatus) {
      const statusLabels: Record<string, string> = {
        pending: '접수 완료',
        in_progress: '상담 진행 중',
        completed: '상담 완료',
        monitoring: '지속 관찰/추후 상담',
      };
      await createNotification(
        existing[0].studentUid,
        `선생님께서 상담 상태를 변경하셨습니다: [${statusLabels[data.status] || data.status}]`,
        `"${existing[0].title}" 상담의 진행 상태가 업데이트되었습니다.`,
        `/consultation/${sessionId}`,
        'status_change'
      );
    }

    return updated[0];
  } catch (error) {
    console.error('updateConsultationSessionByTeacher error:', error);
    throw new Error('상담 이력 및 메모 업데이트 실패', { cause: error });
  }
}

// ----------------- TEACHER CONSULTATION DATABASE & STATS -----------------

export async function getTeacherDashboardAnalytics() {
  try {
    const allSessions = await db
      .select()
      .from(consultationSessions)
      .orderBy(desc(consultationSessions.updatedAt));

    const allUsersList = await db.select().from(users).where(eq(users.role, 'student'));

    const totalSessions = allSessions.length;
    const pendingCount = allSessions.filter((s) => s.status === 'pending').length;
    const inProgressCount = allSessions.filter((s) => s.status === 'in_progress').length;
    const completedCount = allSessions.filter((s) => s.status === 'completed').length;
    const monitoringCount = allSessions.filter((s) => s.status === 'monitoring').length;
    const urgentCount = allSessions.filter((s) => s.urgency === 'urgent' || s.urgency === 'emergency').length;

    // Student aggregate stats: how many sessions each student had
    const studentHistoryMap: Record<string, any> = {};
    for (const s of allSessions) {
      if (!studentHistoryMap[s.studentUid]) {
        studentHistoryMap[s.studentUid] = {
          studentUid: s.studentUid,
          studentName: s.studentName,
          studentNumber: s.studentNumber,
          sessionsCount: 0,
          pendingCount: 0,
          urgentCount: 0,
          recentMood: s.currentMood,
          recentCategory: s.category,
          lastConsultationDate: s.updatedAt,
          sessions: [],
        };
      }
      studentHistoryMap[s.studentUid].sessionsCount += 1;
      if (s.status === 'pending') studentHistoryMap[s.studentUid].pendingCount += 1;
      if (s.urgency === 'urgent' || s.urgency === 'emergency') studentHistoryMap[s.studentUid].urgentCount += 1;
      studentHistoryMap[s.studentUid].sessions.push(s);
    }

    return {
      totalSessions,
      pendingCount,
      inProgressCount,
      completedCount,
      monitoringCount,
      urgentCount,
      studentsCount: allUsersList.length,
      studentHistories: Object.values(studentHistoryMap),
      recentSessions: allSessions.slice(0, 10),
    };
  } catch (error) {
    console.error('getTeacherDashboardAnalytics error:', error);
    throw new Error('선생님 통계 대시보드 로드 실패', { cause: error });
  }
}

// ----------------- NOTIFICATIONS -----------------

export async function getNotifications(userUid: string) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientUid, userUid))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
  } catch (error) {
    console.error('getNotifications error:', error);
    throw new Error('알림 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function createNotification(
  recipientUid: string,
  title: string,
  body: string,
  link: string,
  type: string
) {
  try {
    const inserted = await db
      .insert(notifications)
      .values({
        recipientUid,
        title,
        body,
        link,
        type,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('createNotification error:', error);
    // Silent fail for notifications to avoid crashing main flow
    return null;
  }
}

export async function markNotificationAsRead(id: number, userUid: string) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.recipientUid, userUid)));
    return { success: true };
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    throw new Error('알림 읽음 처리 실패', { cause: error });
  }
}

export async function markAllNotificationsAsRead(userUid: string) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientUid, userUid));
    return { success: true };
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    throw new Error('모든 알림 읽음 처리 실패', { cause: error });
  }
}
