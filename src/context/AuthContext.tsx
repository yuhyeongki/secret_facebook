import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { supabase } from '../lib/supabase.ts';
import { User, UserRole } from '../types/index.ts';

interface AuthContextType {
  supabaseUser: any;
  currentUser: User | null;
  role: UserRole;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (targetRole: UserRole, targetName?: string, targetNumber?: string) => Promise<void>;
  getAuthToken: () => Promise<string>;
  refreshUserProfile: () => Promise<void>;
  updateProfileData: (data: { name?: string; studentNumber?: string; role?: UserRole }) => Promise<void>;
  isSupabaseTableMissing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_TEACHER = {
  uid: 'teacher-megayhk',
  email: 'megayhk@gmail.com',
  name: '김선생님 (담임교사)',
  role: 'teacher' as UserRole,
  studentNumber: '1학년 3반 담임',
};

const DEMO_STUDENT = {
  uid: 'student-haneul',
  email: 'student_haneul@school.kr',
  name: '김하늘',
  role: 'student' as UserRole,
  studentNumber: '1학년 3반 14번',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupabaseTableMissing, setIsSupabaseTableMissing] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Active testing persona (default to Teacher megayhk or Student)
  const [activePersona, setActivePersona] = useState<typeof DEMO_TEACHER | typeof DEMO_STUDENT>(
    DEMO_TEACHER
  );

  const getAuthToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
    // Return formatted dev token with persona details
    return `dev_token____${activePersona.uid}___${activePersona.email}___${encodeURIComponent(activePersona.name)}`;
  };

  const syncUserWithDb = async (overridePersona?: typeof DEMO_TEACHER | typeof DEMO_STUDENT) => {
    try {
      const persona = overridePersona || (supabaseUser ? {
        uid: supabaseUser.id,
        email: supabaseUser.email || 'user@school.kr',
        name: supabaseUser.user_metadata?.full_name || '상담소 이용자',
        role: (supabaseUser.email === 'megayhk@gmail.com' ? 'teacher' : 'student') as UserRole,
        studentNumber: supabaseUser.email === 'megayhk@gmail.com' ? '교원' : '학생',
      } : activePersona);

      const token = await getAuthToken();

      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: persona.email,
          name: persona.name,
          role: persona.role,
          studentNumber: persona.studentNumber,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check Supabase table status
  useEffect(() => {
    async function checkSupabase() {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code === 'PGRST205') {
          // Table does not exist in schema cache yet
          setIsSupabaseTableMissing(true);
        } else {
          setIsSupabaseTableMissing(false);
        }
      } catch (e) {
        console.warn('Supabase table check:', e);
      }
    }
    checkSupabase();
  }, []);

  useEffect(() => {
    // Listen to Supabase auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      syncUserWithDb();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      syncUserWithDb();
    });

    return () => subscription.unsubscribe();
  }, [activePersona]);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setSupabaseUser(null);
      setActivePersona(DEMO_STUDENT);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const switchDemoRole = async (targetRole: UserRole, targetName?: string, targetNumber?: string) => {
    startTransition(() => {
      setLoading(true);
      if (targetRole === 'teacher') {
        const teacher = {
          ...DEMO_TEACHER,
          name: targetName || DEMO_TEACHER.name,
        };
        setActivePersona(teacher);
      } else {
        const student = {
          uid: targetName ? `student-${encodeURIComponent(targetName)}` : DEMO_STUDENT.uid,
          email: `${targetName ? 'student_' + targetName : 'student_haneul'}@school.kr`,
          name: targetName || DEMO_STUDENT.name,
          role: 'student' as UserRole,
          studentNumber: targetNumber || DEMO_STUDENT.studentNumber,
        };
        setActivePersona(student);
      }
    });
  };

  const refreshUserProfile = async () => {
    await syncUserWithDb();
  };

  const updateProfileData = async (data: { name?: string; studentNumber?: string; role?: UserRole }) => {
    const token = await getAuthToken();
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setCurrentUser(updated);
    }
  };

  const currentRole: UserRole = currentUser?.role || activePersona.role;

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        currentUser,
        role: currentRole,
        loading,
        loginWithGoogle,
        logout,
        switchDemoRole,
        getAuthToken,
        refreshUserProfile,
        updateProfileData,
        isSupabaseTableMissing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
