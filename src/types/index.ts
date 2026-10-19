export type UserRole = 'student' | 'teacher';

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  studentNumber?: string;
  avatar?: string;
  createdAt: string;
}

export interface AnonymousPost {
  id: number;
  authorUid: string;
  nickname: string;
  category: string;
  title: string;
  content: string;
  empathyCount: number;
  isAnonymous: boolean;
  createdAt: string;
  comments: PostComment[];
  reactions: PostReaction[];
}

export interface PostReaction {
  id: number;
  postId: number;
  userUid: string;
  reactionType: 'cheer' | 'sympathy' | 'hug' | 'warmth';
  createdAt: string;
}

export interface PostComment {
  id: number;
  postId: number;
  authorUid: string;
  authorName: string;
  isTeacher: boolean;
  content: string;
  createdAt: string;
}

export type ConsultationStatus = 'pending' | 'in_progress' | 'completed' | 'monitoring';
export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';

export interface ConsultationSession {
  id: number;
  studentUid: string;
  studentName: string;
  studentNumber?: string;
  title: string;
  category: string;
  urgency: UrgencyLevel;
  currentMood: string;
  status: ConsultationStatus;
  teacherPrivateMemo?: string;
  followUpDate?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  unreadCount?: number;
  lastMessage?: ConsultationMessage | null;
  messages?: ConsultationMessage[];
}

export interface ConsultationMessage {
  id: number;
  sessionId: number;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  recipientUid: string;
  title: string;
  body: string;
  link?: string;
  type: 'new_consultation' | 'new_reply' | 'reaction' | 'status_change';
  isRead: boolean;
  createdAt: string;
}

export interface StudentHistorySummary {
  studentUid: string;
  studentName: string;
  studentNumber?: string;
  sessionsCount: number;
  pendingCount: number;
  urgentCount: number;
  recentMood: string;
  recentCategory: string;
  lastConsultationDate: string;
  sessions: ConsultationSession[];
}

export interface TeacherAnalytics {
  totalSessions: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  monitoringCount: number;
  urgentCount: number;
  studentsCount: number;
  studentHistories: StudentHistorySummary[];
  recentSessions: ConsultationSession[];
}
