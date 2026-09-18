import { mergeRecords } from './merge.js';
import { store } from './store.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Quality@123';
const MAX_NAME = 16;

/**
 * Xử lý API độc lập với framework — dùng cho Vercel Function và Vite dev middleware.
 * GET    /api/players            → { players: [...], persistent, kind }
 * GET    /api/players?name=X     → { player | null }
 * PUT    /api/players?name=X     body = PlayerRecord → gộp với bản trên server, trả bản đã gộp
 * DELETE /api/players?name=X     header x-admin-key = mật khẩu admin
 * @param {{ method: string; name?: string; body?: any; adminKey?: string }} req
 * @returns {Promise<{ status: number; body: any }>}
 */
export async function handleApi(req) {
  const method = (req.method || 'GET').toUpperCase();
  const name = (req.name ?? '').trim().slice(0, MAX_NAME);
  try {
    if (method === 'GET') {
      if (name) {
        const p = await store.get(name);
        return { status: 200, body: { player: p ?? null } }; // 200 + null để trình duyệt không log lỗi 404 cho tên mới
      }
      const all = await store.all();
      return { status: 200, body: { players: Object.values(all), persistent: store.persistent(), kind: store.kind() } };
    }
    if (method === 'PUT' || method === 'POST') {
      if (!name) return { status: 400, body: { error: 'missing name' } };
      let rec = req.body;
      if (typeof rec === 'string') rec = JSON.parse(rec);
      if (!rec || typeof rec !== 'object') return { status: 400, body: { error: 'bad body' } };
      if (JSON.stringify(rec).length > 200_000) return { status: 413, body: { error: 'too large' } };
      const merged = mergeRecords(await store.get(name), { ...rec, name });
      await store.set(name, merged);
      return { status: 200, body: { player: merged } };
    }
    if (method === 'DELETE') {
      if (req.adminKey !== ADMIN_PASSWORD) return { status: 401, body: { error: 'unauthorized' } };
      if (!name) return { status: 400, body: { error: 'missing name' } };
      await store.remove(name);
      return { status: 200, body: { ok: true } };
    }
    return { status: 405, body: { error: 'method not allowed' } };
  } catch (e) {
    return { status: 500, body: { error: String(e && e.message ? e.message : e) } };
  }
}
