import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'ember-flight-crm-super-secret-jwt-key-2026-secure';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<(IUser & { _id: any }) | null> {
  try {
    // 1. Check HttpOnly cookie
    let token = req.cookies.get('auth_token')?.value;

    // 2. Fallback to Authorization Bearer header
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return null;

    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');
    if (!user || !user.active) return null;

    return user;
  } catch (error) {
    console.error('Error in getAuthUser:', error);
    return null;
  }
}
