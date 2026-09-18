import type { PlayerRecord } from './Players';

const BASE = '/api/players';
const TIMEOUT_MS = 6000;

async function call<T>(method: string, query: string, body?: unknown, headers: Record<string, string> = {}): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${query}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null; // offline / chưa cấu hình backend → client tự dùng localStorage
  } finally {
    clearTimeout(timer);
  }
}

export interface ListResult {
  players: PlayerRecord[];
  /** false = server đang chạy ở chế độ tạm (Vercel chưa gắn Redis) */
  persistent: boolean;
  kind: 'redis' | 'file';
}

/** Client gọi backend /api/players. Mọi hàm trả null khi backend không sẵn sàng — game vẫn chạy với dữ liệu máy này. */
export const Api = {
  list(): Promise<ListResult | null> {
    return call<ListResult>('GET', '');
  },
  async get(name: string): Promise<PlayerRecord | null> {
    const r = await call<{ player: PlayerRecord }>('GET', `?name=${encodeURIComponent(name)}`);
    return r?.player ?? null;
  },
  /** Gửi hồ sơ lên server; server gộp với bản đã có (nhiều máy) và trả bản gộp */
  async upsert(rec: PlayerRecord): Promise<PlayerRecord | null> {
    const r = await call<{ player: PlayerRecord }>('PUT', `?name=${encodeURIComponent(rec.name)}`, rec);
    return r?.player ?? null;
  },
  async remove(name: string, adminKey: string): Promise<boolean> {
    const r = await call<{ ok: boolean }>('DELETE', `?name=${encodeURIComponent(name)}`, undefined, { 'x-admin-key': adminKey });
    return !!r?.ok;
  },
};
