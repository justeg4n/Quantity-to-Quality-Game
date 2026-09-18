import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Kho lưu hồ sơ người chơi — chọn tự động theo biến môi trường sẵn có, ưu tiên:
 *   1) Vercel Blob (@vercel/blob) — kho object storage CỦA CHÍNH Vercel, có gói miễn phí
 *      (Hobby: 1 GB), bật bằng nút "Blob" trong tab Storage của project (KHÔNG phải mục
 *      "Marketplace Database Providers" tính phí). Vercel tự set BLOB_READ_WRITE_TOKEN.
 *      MỖI NGƯỜI CHƠI MỘT BLOB riêng (q2q/players/<tên>.json) để ghi người này không
 *      ghi đè người khác, và xoá là xoá đúng blob đó. Đọc luôn kèm tham số chống cache
 *      vì CDN của Blob cache tối thiểu 60 giây.
 *   2) Upstash Redis REST — tự tạo tài khoản MIỄN PHÍ tại upstash.com rồi điền
 *      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *   3) File JSON — chỉ khi chạy `npm run dev` cục bộ (trên Vercel là /tmp, không bền).
 */
const HASH = 'q2q:players';
const BLOB_DIR = 'q2q/players/';
const LEGACY_BLOB = 'q2q-players.json';

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function blobPath(name) {
  return `${BLOB_DIR}${encodeURIComponent(name)}.json`;
}

/** Đọc nội dung một blob, bỏ qua cache CDN */
async function blobFetch(url) {
  const sep = url.includes('?') ? '&' : '?';
  const opts = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } };
  let r = await fetch(`${url}${sep}nocache=${Date.now()}`, opts);
  if (!r.ok) r = await fetch(url, opts); // phòng khi CDN không chấp nhận query lạ
  if (!r.ok) return null;
  try {
    return await r.json();
  } catch {
    return null;
  }
}

/** Liệt kê mọi blob trong thư mục người chơi (phân trang) */
async function blobList(prefix) {
  const { list } = await import('@vercel/blob');
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function blobAll() {
  const blobs = await blobList(BLOB_DIR);
  const recs = await Promise.all(blobs.map((b) => blobFetch(b.url)));
  const out = {};
  recs.forEach((r) => {
    if (r && r.name) out[r.name] = r;
  });
  // dữ liệu từ bản cũ (một file chung) — chỉ đọc, dùng cho tên chưa có blob riêng
  const legacy = await blobList(LEGACY_BLOB);
  if (legacy.length) {
    const old = (await blobFetch(legacy[0].url)) || {};
    for (const [name, rec] of Object.entries(old)) if (!out[name]) out[name] = rec;
  }
  return out;
}

async function blobGet(name) {
  const blobs = await blobList(blobPath(name));
  const exact = blobs.find((b) => b.pathname === blobPath(name));
  if (exact) return blobFetch(exact.url);
  const legacy = await blobList(LEGACY_BLOB);
  if (legacy.length) {
    const old = (await blobFetch(legacy[0].url)) || {};
    return old[name] ?? null;
  }
  return null;
}

async function blobSet(name, rec) {
  const { put } = await import('@vercel/blob');
  await put(blobPath(name), JSON.stringify(rec), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

async function blobRemove(name) {
  const { del, put } = await import('@vercel/blob');
  const blobs = await blobList(blobPath(name));
  const urls = blobs.filter((b) => b.pathname === blobPath(name)).map((b) => b.url);
  if (urls.length) await del(urls);
  // xoá cả trong file chung cũ nếu còn
  const legacy = await blobList(LEGACY_BLOB);
  if (legacy.length) {
    const old = (await blobFetch(legacy[0].url)) || {};
    if (old[name]) {
      delete old[name];
      await put(LEGACY_BLOB, JSON.stringify(old), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
    }
  }
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
    if (hasBlob()) return blobAll();
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
    if (hasBlob()) return blobGet(name);
    if (redisEnv()) {
      const v = await redis(['HGET', HASH, name]);
      return v ? JSON.parse(v) : null;
    }
    return (await fileReadAll())[name] ?? null;
  },
  async set(name, rec) {
    if (hasBlob()) return blobSet(name, rec);
    if (redisEnv()) {
      await redis(['HSET', HASH, name, JSON.stringify(rec)]);
      return;
    }
    const all = await fileReadAll();
    all[name] = rec;
    await fileWriteAll(all);
  },
  async remove(name) {
    if (hasBlob()) return blobRemove(name);
    if (redisEnv()) {
      await redis(['HDEL', HASH, name]);
      return;
    }
    const all = await fileReadAll();
    delete all[name];
    await fileWriteAll(all);
  },
};
