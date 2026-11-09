import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initDb, pool } from './db.ts';
import { isAdminRequest, login, logout, requireAdmin } from './auth.ts';
import { seedCategoriesAndPrompts, seedHelpIntroIfEmpty } from './seedPrompts.ts';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILES_PER_POST,
  assertAllowedFile,
  contentDisposition,
  ensureUploadRoot,
  extensionOf,
  postDir,
  removePostFiles,
  resolveStoredPath,
  restoreUtf8Filename,
} from './helpFiles.ts';
import {
  getDashboardPayload,
  getIndicatorDetail,
  loadScenario,
  refreshEconomicData,
  saveScenario,
} from './economic/service.ts';
import { calculateBidCost } from './economic/compute.ts';
import type { BidCostScenario } from '../src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_POST },
});

function nowIso() {
  return new Date().toISOString();
}

function mapL1(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}
function mapL2(row: Record<string, unknown>) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description ?? '',
    sortOrder: row.sort_order,
    viewType: row.view_type === 'board' ? 'board' : 'prompt',
  };
}
function mapPrompt(row: Record<string, unknown>) {
  let tags: string[] = [];
  try {
    tags = row.tags ? JSON.parse(String(row.tags)) : [];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    categoryLevel2Id: row.category_level2_id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    agentName: row.agent_name,
    agentDescription: row.agent_description,
    content: row.content,
    tags,
  };
}

app.get('/api/auth/me', (req, res) => {
  res.json({ admin: isAdminRequest(req) });
});

app.post('/api/auth/login', async (req, res) => {
  const password = String(req.body?.password ?? '');
  const result = await login(password);
  if (!result) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }
  res.json(result);
});

app.post('/api/auth/logout', (req, res) => {
  logout(req);
  res.json({ ok: true });
});

app.get('/api/categories/level1', async (_req, res) => {
  const result = await pool.query('SELECT * FROM category_level1 ORDER BY sort_order, name');
  res.json(result.rows.map(mapL1));
});

app.post('/api/categories/level1', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const sortOrder = Number(req.body?.sortOrder ?? 0);
  if (!name) {
    res.status(400).json({ error: '단계 1 이름은 필수입니다.' });
    return;
  }
  const dup = await pool.query('SELECT id FROM category_level1 WHERE name = $1', [name]);
  if (dup.rowCount) {
    res.status(409).json({ error: '같은 이름의 단계 1이 이미 있습니다.' });
    return;
  }
  const id = `l1-${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO category_level1 (id, name, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$4)`,
    [id, name, sortOrder, nowIso()]
  );
  res.status(201).json({ id, name, sortOrder });
});

app.put('/api/categories/level1/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM category_level1 WHERE id = $1', [id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '단계 1을 찾을 수 없습니다.' });
    return;
  }
  const name = req.body?.name != null ? String(req.body.name).trim() : existing.rows[0].name;
  const sortOrder = req.body?.sortOrder != null ? Number(req.body.sortOrder) : existing.rows[0].sort_order;
  try {
    await pool.query(
      `UPDATE category_level1 SET name = $1, sort_order = $2, updated_at = $3 WHERE id = $4`,
      [name, sortOrder, nowIso(), id]
    );
  } catch (err) {
    res.status(409).json({ error: '단계 1 이름 중복 또는 저장 실패입니다.' });
    return;
  }
  res.json({ id, name, sortOrder });
});

app.delete('/api/categories/level1/:id', requireAdmin, async (req, res) => {
  const children = await pool.query('SELECT COUNT(*)::int AS n FROM category_level2 WHERE parent_id = $1', [
    req.params.id,
  ]);
  if ((children.rows[0]?.n ?? 0) > 0) {
    res.status(409).json({ error: '하위 단계 2가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.', childCount: children.rows[0].n });
    return;
  }
  const result = await pool.query('DELETE FROM category_level1 WHERE id = $1', [req.params.id]);
  if (!result.rowCount) {
    res.status(404).json({ error: '단계 1을 찾을 수 없습니다.' });
    return;
  }
  res.json({ ok: true });
});

app.get('/api/categories/level2', async (req, res) => {
  const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : null;
  const result = parentId
    ? await pool.query('SELECT * FROM category_level2 WHERE parent_id = $1 ORDER BY sort_order, name', [parentId])
    : await pool.query('SELECT * FROM category_level2 ORDER BY sort_order, name');
  res.json(result.rows.map(mapL2));
});

app.post('/api/categories/level2', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const parentId = String(req.body?.parentId ?? '').trim();
  const description = String(req.body?.description ?? '');
  const sortOrder = Number(req.body?.sortOrder ?? 0);
  if (!name || !parentId) {
    res.status(400).json({ error: '단계 2 이름과 상위 단계 1이 필요합니다.' });
    return;
  }
  const parent = await pool.query('SELECT id FROM category_level1 WHERE id = $1', [parentId]);
  if (!parent.rowCount) {
    res.status(400).json({ error: '상위 단계 1이 존재하지 않습니다.' });
    return;
  }
  const id = `l2-${crypto.randomUUID()}`;
  try {
    await pool.query(
      `INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'prompt',$6,$6)`,
      [id, parentId, name, description, sortOrder, nowIso()]
    );
  } catch {
    res.status(409).json({ error: '같은 단계 1 아래 동일 이름의 단계 2가 있습니다.' });
    return;
  }
  res.status(201).json({ id, parentId, name, description, sortOrder, viewType: 'prompt' });
});

app.put('/api/categories/level2/:id', requireAdmin, async (req, res) => {
  const existing = await pool.query('SELECT * FROM category_level2 WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const cur = existing.rows[0];
  const name = req.body?.name != null ? String(req.body.name).trim() : cur.name;
  const description = req.body?.description != null ? String(req.body.description) : cur.description;
  const parentId = req.body?.parentId != null ? String(req.body.parentId) : cur.parent_id;
  const sortOrder = req.body?.sortOrder != null ? Number(req.body.sortOrder) : cur.sort_order;
  try {
    await pool.query(
      `UPDATE category_level2 SET name=$1, description=$2, parent_id=$3, sort_order=$4, updated_at=$5 WHERE id=$6`,
      [name, description, parentId, sortOrder, nowIso(), req.params.id]
    );
  } catch {
    res.status(409).json({ error: '단계 2 저장에 실패했습니다. 이름 중복 또는 잘못된 상위 단계입니다.' });
    return;
  }
  res.json(mapL2({ ...cur, name, description, parent_id: parentId, sort_order: sortOrder }));
});

app.delete('/api/categories/level2/:id', requireAdmin, async (req, res) => {
  const cat = await pool.query('SELECT * FROM category_level2 WHERE id = $1', [req.params.id]);
  if (!cat.rowCount) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const prompts = await pool.query('SELECT COUNT(*)::int AS n FROM prompts WHERE category_level2_id = $1', [
    req.params.id,
  ]);
  if ((prompts.rows[0]?.n ?? 0) > 0) {
    res.status(409).json({
      error: '연결된 프롬프트가 있어 삭제할 수 없습니다. 먼저 이동하거나 삭제하세요.',
      promptCount: prompts.rows[0].n,
    });
    return;
  }
  if (cat.rows[0].view_type === 'board') {
    const posts = await pool.query('SELECT COUNT(*)::int AS n FROM help_posts');
    if ((posts.rows[0]?.n ?? 0) > 0) {
      res.status(409).json({
        error: '게시물이 남아 있어 게시판 단계 2를 삭제할 수 없습니다.',
        postCount: posts.rows[0].n,
      });
      return;
    }
  }
  await pool.query('DELETE FROM category_level2 WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/prompts', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const cat = typeof req.query.categoryLevel2Id === 'string' ? req.query.categoryLevel2Id : '';
  const params: unknown[] = [];
  const where: string[] = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(title ILIKE $${params.length} OR subtitle ILIKE $${params.length} OR agent_name ILIKE $${params.length} OR agent_description ILIKE $${params.length} OR content ILIKE $${params.length})`
    );
  }
  if (cat) {
    params.push(cat);
    where.push(`category_level2_id = $${params.length}`);
  }
  const sql = `SELECT * FROM prompts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY title`;
  const result = await pool.query(sql, params);
  res.json(result.rows.map(mapPrompt));
});

app.get('/api/prompts/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  if (!result.rowCount) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  res.json(mapPrompt(result.rows[0]));
});

app.post('/api/prompts', requireAdmin, async (req, res) => {
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const title = String(body.title ?? '').trim();
  if (!categoryLevel2Id || !title) {
    res.status(400).json({ error: '제목과 단계 2가 필요합니다.' });
    return;
  }
  const cat = await pool.query('SELECT view_type FROM category_level2 WHERE id = $1', [categoryLevel2Id]);
  if (!cat.rowCount) {
    res.status(400).json({ error: '단계 2가 존재하지 않습니다.' });
    return;
  }
  if (cat.rows[0].view_type === 'board') {
    res.status(400).json({ error: '게시판 단계 2에는 프롬프트를 생성할 수 없습니다.' });
    return;
  }
  const id = `p-${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
    [
      id,
      categoryLevel2Id,
      title,
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      nowIso(),
    ]
  );
  const created = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
  res.status(201).json(mapPrompt(created.rows[0]));
});

app.put('/api/prompts/:id', requireAdmin, async (req, res) => {
  const existing = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  const cur = existing.rows[0];
  const body = req.body ?? {};
  const categoryLevel2Id = body.categoryLevel2Id != null ? String(body.categoryLevel2Id) : cur.category_level2_id;
  const cat = await pool.query('SELECT view_type FROM category_level2 WHERE id = $1', [categoryLevel2Id]);
  if (!cat.rowCount || cat.rows[0].view_type === 'board') {
    res.status(400).json({ error: '게시판 단계 2로는 프롬프트를 이동할 수 없습니다.' });
    return;
  }
  await pool.query(
    `UPDATE prompts SET category_level2_id=$1, title=$2, subtitle=$3, agent_name=$4, agent_description=$5, content=$6, tags=$7, updated_at=$8
     WHERE id=$9`,
    [
      categoryLevel2Id,
      body.title != null ? String(body.title) : cur.title,
      body.subtitle != null ? String(body.subtitle) : cur.subtitle,
      body.agentName != null ? String(body.agentName) : cur.agent_name,
      body.agentDescription != null ? String(body.agentDescription) : cur.agent_description,
      body.content != null ? String(body.content) : cur.content,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : JSON.parse(cur.tags || '[]')),
      nowIso(),
      req.params.id,
    ]
  );
  const updated = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  res.json(mapPrompt(updated.rows[0]));
});

app.delete('/api/prompts/:id', requireAdmin, async (req, res) => {
  const result = await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
  if (!result.rowCount) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  res.json({ ok: true });
});

app.post('/api/prompts/reset', requireAdmin, async (_req, res) => {
  await seedCategoriesAndPrompts(pool, { reset: true });
  await seedHelpIntroIfEmpty(pool);
  res.json({ ok: true });
});

app.get('/api/help-posts', async (_req, res) => {
  const posts = await pool.query('SELECT * FROM help_posts ORDER BY created_at DESC');
  const counts = await pool.query(
    `SELECT post_id, COUNT(*)::int AS n FROM help_attachments GROUP BY post_id`
  );
  const cmap = new Map(counts.rows.map((r) => [r.post_id, r.n]));
  res.json(
    posts.rows.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      attachmentCount: cmap.get(p.id) ?? 0,
    }))
  );
});

app.get('/api/help-posts/:id', async (req, res) => {
  const post = await pool.query('SELECT * FROM help_posts WHERE id = $1', [req.params.id]);
  if (!post.rowCount) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  const files = await pool.query('SELECT * FROM help_attachments WHERE post_id = $1 ORDER BY created_at', [
    req.params.id,
  ]);
  const p = post.rows[0];
  res.json({
    id: p.id,
    title: p.title,
    body: p.body,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    attachments: files.rows.map((f) => ({
      id: f.id,
      postId: f.post_id,
      originalName: f.original_name,
      storedName: f.stored_name,
      mimeType: f.mime_type,
      sizeBytes: f.size_bytes,
      createdAt: f.created_at,
    })),
  });
});

app.post('/api/help-posts', requireAdmin, upload.array('files[]', MAX_FILES_PER_POST), async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) {
      res.status(400).json({ error: '제목은 필수입니다.' });
      return;
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const restored = files.map((f) => {
      const originalName = restoreUtf8Filename(f.originalname);
      assertAllowedFile(originalName, f.size);
      return { ...f, originalName };
    });
    const postId = `hp-${crypto.randomUUID()}`;
    const created = nowIso();
    await pool.query(
      `INSERT INTO help_posts (id, title, body, created_at, updated_at) VALUES ($1,$2,$3,$4,$4)`,
      [postId, title, String(req.body?.body ?? ''), created]
    );
    await fs.mkdir(postDir(postId), { recursive: true });
    for (const file of restored) {
      const id = `ha-${crypto.randomUUID()}`;
      const ext = extensionOf(file.originalName);
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      const storedName = `${id}${ext}`;
      await fs.writeFile(path.join(postDir(postId), storedName), file.buffer);
      await pool.query(
        `INSERT INTO help_attachments (id, post_id, original_name, stored_name, mime_type, size_bytes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, postId, file.originalName, storedName, file.mimetype, file.size, created]
      );
    }
    const createdPost = await pool.query('SELECT * FROM help_posts WHERE id = $1', [postId]);
    res.status(201).json({ id: postId, title, createdAt: createdPost.rows[0].created_at });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '업로드에 실패했습니다.' });
  }
});

app.delete('/api/help-posts/:id', requireAdmin, async (req, res) => {
  const existing = await pool.query('SELECT id FROM help_posts WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  await pool.query('DELETE FROM help_posts WHERE id = $1', [req.params.id]);
  await removePostFiles(req.params.id);
  res.json({ ok: true });
});

app.get('/api/help-posts/:id/attachments/:attachmentId', async (req, res) => {
  const file = await pool.query('SELECT * FROM help_attachments WHERE id = $1 AND post_id = $2', [
    req.params.attachmentId,
    req.params.id,
  ]);
  if (!file.rowCount) {
    res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
    return;
  }
  const row = file.rows[0];
  try {
    const full = resolveStoredPath(row.post_id, row.stored_name);
    res.setHeader('Content-Disposition', contentDisposition(row.original_name));
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.sendFile(full);
  } catch {
    res.status(400).json({ error: '잘못된 파일 경로입니다.' });
  }
});

app.get('/api/economic/summary', async (_req, res) => {
  try {
    const payload = await getDashboardPayload();
    res.json(payload.summary);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '요약 조회 실패' });
  }
});

app.get('/api/economic/indicators', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const list = category ? payload.indicators.filter((i) => i.category === category) : payload.indicators;
    res.json({ indicators: list, providerStatus: payload.providerStatus });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '지표 조회 실패' });
  }
});

app.get('/api/economic/indicators/:key', async (req, res) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const detail = await getIndicatorDetail(req.params.key, from, to);
    if (!detail) {
      res.status(404).json({ error: '지표를 찾을 수 없습니다.' });
      return;
    }
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '지표 상세 조회 실패' });
  }
});

app.get('/api/economic/series', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    const keys = typeof req.query.keys === 'string' ? req.query.keys.split(',').filter(Boolean) : [];
    if (!keys.length) {
      res.json({ series: payload.series });
      return;
    }
    const filtered = Object.fromEntries(keys.map((k) => [k, payload.series[k]]).filter(([, v]) => v));
    res.json({ series: filtered });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '시계열 조회 실패' });
  }
});

app.post('/api/economic/refresh', requireAdmin, async (_req, res) => {
  try {
    await refreshEconomicData(true);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '갱신 실패' });
  }
});

app.get('/api/economic/dashboard', async (_req, res) => {
  try {
    res.json(await getDashboardPayload());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '대시보드 조회 실패' });
  }
});

app.get('/api/economic/bid-cost', async (_req, res) => {
  try {
    const scenario = await loadScenario();
    res.json(scenario);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '원가 시나리오 조회 실패' });
  }
});

app.put('/api/economic/bid-cost', async (req, res) => {
  try {
    const saved = await saveScenario(req.body as BidCostScenario);
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '원가 시나리오 저장 실패' });
  }
});

app.post('/api/economic/bid-cost/calculate', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    const scenario = (req.body?.lines ? req.body : payload.bidCost.scenario) as BidCostScenario;
    const series: Record<string, { period: string; value: number; fetchedAt: string; sourceTimestamp: string | null; isEstimated: boolean }[]> =
      {};
    for (const [key, item] of Object.entries(payload.series)) {
      series[key] = item.points.map((p) => ({
        period: p.period,
        value: p.value,
        fetchedAt: p.fetchedAt,
        sourceTimestamp: p.sourceTimestamp,
        isEstimated: p.isEstimated,
      }));
    }
    res.json(calculateBidCost(scenario, series));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '원가 계산 실패' });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : '서버 오류';
  if (/File too large/i.test(message)) {
    res.status(400).json({ error: '파일 크기 제한(20MB)을 초과했습니다.' });
    return;
  }
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

async function main() {
  await ensureUploadRoot();
  await initDb();
  const dist = path.resolve(__dirname, '../dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next();
    });
  });
  app.listen(PORT, () => {
    console.log(`API server listening on http://127.0.0.1:${PORT}`);
  });
  void refreshEconomicData(false);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
