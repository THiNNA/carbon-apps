import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- Password Helpers ---
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT Helpers ---
export function signToken(payload: any, secret: string, expiresIn: string | number): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyToken<T = any>(token: string, secret: string): T {
  return jwt.verify(token, secret) as T;
}

// --- API Response Helper ---
export function buildApiResponse<T = any>({
  success,
  message,
  data,
  meta,
  errors
}: {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
  errors?: any[];
}) {
  return {
    success,
    message,
    data,
    meta,
    errors
  };
}

