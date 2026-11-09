import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool } from './db.ts';

const tokens = new Map<string, { expiresAt: number }>();
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const custom = req.headers['x-admin-token'];
  if (typeof custom === 'string' && custom.trim()) return custom.trim();
  return null;
}

export function isAdminRequest(req: Request): boolean {
  const token = readToken(req);
  if (!token) return false;
  const row = tokens.get(token);
  if (!row) return false;
  if (row.expiresAt < Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: '관리자 인증이 필요합니다.' });
    return;
  }
  next();
}

export async function login(password: string) {
  const result = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM admin_settings WHERE id = 1'
  );
  const hash = result.rows[0]?.password_hash;
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function logout(req: Request) {
  const token = readToken(req);
  if (token) tokens.delete(token);
}
