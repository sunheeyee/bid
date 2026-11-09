import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, 'data', 'help-uploads');

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES_PER_POST = 10;
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.js',
  '.mjs',
  '.cjs',
  '.sh',
  '.ps1',
  '.com',
  '.msi',
  '.dll',
]);

export function restoreUtf8Filename(originalname: string): string {
  const raw = originalname || 'file';
  let restored = raw;
  try {
    restored = Buffer.from(raw, 'latin1').toString('utf8');
  } catch {
    restored = raw;
  }
  const cleaned = path.basename(restored).replace(/[\r\n"]/g, '').replace(/[\\/]/g, '_');
  return cleaned.replace(/\.\./g, '_') || 'file';
}

export function extensionOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

export function assertAllowedFile(originalName: string, size: number) {
  if (size > MAX_FILE_BYTES) {
    throw new Error(`파일 크기 제한(20MB)을 초과했습니다: ${originalName}`);
  }
  const ext = extensionOf(originalName);
  if (BLOCKED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${originalName}`);
  }
}

export async function ensureUploadRoot() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export function postDir(postId: string) {
  const safe = path.basename(postId);
  return path.join(UPLOAD_ROOT, safe);
}

export async function removePostFiles(postId: string) {
  const dir = postDir(postId);
  await fs.rm(dir, { recursive: true, force: true });
}

export function asciiFallbackName(name: string): string {
  const base = path.basename(name).replace(/[\\/"]/g, '_');
  return base.replace(/[^\x20-\x7E]/g, '_') || 'download';
}

export function contentDisposition(originalName: string): string {
  const safe = path.basename(originalName).replace(/[\r\n"]/g, '').replace(/\.\./g, '_');
  const fallback = asciiFallbackName(safe);
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function resolveStoredPath(postId: string, storedName: string) {
  const dir = postDir(postId);
  const file = path.basename(storedName);
  const full = path.resolve(dir, file);
  if (!full.startsWith(dir)) {
    throw new Error('잘못된 파일 경로입니다.');
  }
  return full;
}
