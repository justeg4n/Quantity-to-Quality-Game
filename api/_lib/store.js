import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Kho lưu hồ sơ người chơi — chọn tự động theo biến môi trường sẵn có, ưu tiên:
 *   1) Vercel Blob (@vercel/blob) — kho object storage CỦA CHÍNH Vercel, có gói miễn phí
 *      (Hobby: 1 GB lưu trữ + lượt đọc/ghi hào phóng), bật bằng nút "Blob" trong tab Storage
 *      của project (KHÔNG phải "Marketplace Database Providers" — mục đó mới tính phí).
 *      Vercel tự set biến BLOB_READ_WRITE_TOKEN sau khi tạo, không cần đăng ký dịch vụ ngoài.
 *   2) Upstash Redis REST — chỉ dùng nếu bạn tự tạo tài khoản MIỄN PHÍ trực tiếp tại
 *      upstash.com (gói Free, không qua Vercel Marketplace) rồi tự điền UPSTASH_REDIS_REST_URL
 *      + UPSTASH_REDIS_REST_TOKEN vào Environment Variables của project.
 *   3) File JSON — chỉ dùng khi chạy `npm run dev` cục bộ (không bền vững trên Vercel).
 */
const HASH = 'q2q:players';
const BLOB_PATH = 'q2q-players.json';

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function blobReadAll() {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
  if (!blobs.length) return {};
  const r = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!r.ok) return {};
  try {
    return await r.json();
  } catch {
    return {};
  }
}

async function blobWriteAll(all) {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATH, JSON.stringify(all), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cmd) {
  const env = redisEnv();
  const r = await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const FILE = process.env.VERCEL ? '/tmp/q2q-players.json' : path.join(process.cwd(), '.data', 'players.json');

async function fileReadAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function fileWriteAll(all) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all));
}

export const store = {
  /** 'blob' | 'redis' = bền vững (miễn phí); 'file' = local dev / chưa cấu hình gì trên Vercel */
  kind() {
    if (hasBlob()) return 'blob';
    if (redisEnv()) return 'redis';
    return 'file';
  },
  persistent() {
    return hasBlob() || !!redisEnv() || !process.env.VERCEL;
  },
  /** @returns {Promise<Record<string, any>>} */
  async all() {
    if (hasBlob()) return blobReadAll();
    if (redisEnv()) {
      const flat = (await redis(['HGETALL', HASH])) || [];
      const out = {};
      for (let i = 0; i < flat.length; i += 2) {
        try {
          out[flat[i]] = JSON.parse(flat[i + 1]);
        } catch {
          /* bỏ qua bản ghi hỏng */
        }
      }
      return out;
    }
    return fileReadAll();
  },
  async get(name) {
    if (redisEnv() && !hasBlob()) {
      const v = await redis(['HGET', HASH, name]);
      return v ? JSON.parse(v) : null;
    }
    return (await this.all())[name] ?? null;
  },
  async set(name, rec) {
    if (redisEnv() && !hasBlob()) {
      await redis(['HSET', HASH, name, JSON.stringify(rec)]);
      return;
    }
    const all = await this.all();
    all[name] = rec;
    if (hasBlob()) await blobWriteAll(all);
    else await fileWriteAll(all);
  },
  async remove(name) {
    if (redisEnv() && !hasBlob()) {
      await redis(['HDEL', HASH, name]);
      return;
    }
    const all = await this.all();
    delete all[name];
    if (hasBlob()) await blobWriteAll(all);
    else await fileWriteAll(all);
  },
};
