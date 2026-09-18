import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Kho lưu hồ sơ người chơi: Upstash Redis (REST) khi có biến môi trường, nếu không thì file JSON.
 * Biến môi trường (Vercel → Storage → Upstash for Redis tự thêm): KV_REST_API_URL + KV_REST_API_TOKEN
 * hoặc UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */
const HASH = 'q2q:players';

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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

async function readFile() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeFile(all) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all));
}

export const store = {
  /** 'redis' = bền vững; 'file' = local dev (trên Vercel không có env thì chỉ là /tmp tạm thời) */
  kind() {
    return redisEnv() ? 'redis' : 'file';
  },
  persistent() {
    return !!redisEnv() || !process.env.VERCEL;
  },
  /** @returns {Promise<Record<string, any>>} */
  async all() {
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
    return readFile();
  },
  async get(name) {
    if (redisEnv()) {
      const v = await redis(['HGET', HASH, name]);
      return v ? JSON.parse(v) : null;
    }
    return (await readFile())[name] ?? null;
  },
  async set(name, rec) {
    if (redisEnv()) {
      await redis(['HSET', HASH, name, JSON.stringify(rec)]);
      return;
    }
    const all = await readFile();
    all[name] = rec;
    await writeFile(all);
  },
  async remove(name) {
    if (redisEnv()) {
      await redis(['HDEL', HASH, name]);
      return;
    }
    const all = await readFile();
    delete all[name];
    await writeFile(all);
  },
};
