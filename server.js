import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './api/_lib/handler.js';

/**
 * Server tự host (VPS/Docker) — phục vụ bản build tĩnh (dist/) + API /api/players,
 * dùng chung `handleApi` với Vercel Function và Vite dev middleware. Không phụ thuộc
 * gói ngoài nào ở runtime: nếu không đặt BLOB_READ_WRITE_TOKEN / UPSTASH_REDIS_REST_*,
 * store.js tự lưu vào file JSON tại `.data/players.json` (mount volume để lưu bền).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  let filePath = path.normalize(path.join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || filePath === DIST) {
    if (path.extname(filePath)) {
      // đường dẫn có phần mở rộng (asset thật) nhưng không tồn tại → 404 thật, không fallback
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    filePath = path.join(DIST, 'index.html'); // SPA fallback cho route không có đuôi file
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://internal');
  if (url.pathname === '/api/players') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      const { status, body } = await handleApi({
        method: req.method ?? 'GET',
        name: url.searchParams.get('name') ?? undefined,
        body: raw || undefined,
        adminKey: req.headers['x-admin-key'],
      });
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    });
    return;
  }
  void serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Quantity to Quality — listening on :${PORT}`);
});
