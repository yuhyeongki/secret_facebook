import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // If it's a simulated dev user token for fast role-switching preview
    if (token.startsWith('dev_token_')) {
      const parts = token.split('___');
      const uid = parts[1] || 'dev-user-default';
      const email = parts[2] || 'student@school.kr';
      const name = decodeURIComponent(parts[3] || '우리반 학생');
      req.user = { uid, email, name };
      return next();
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      // Fallback if token is custom or expired
      req.user = {
        uid: 'supabase-user',
        email: 'user@school.kr',
        name: '상담소 사용자',
      };
      return next();
    }

    req.user = {
      uid: user.id,
      email: user.email || 'user@school.kr',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '우리반 구성원',
    };
    next();
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    return res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
  }
};
