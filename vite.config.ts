import { defineConfig, type Plugin } from 'vite';
import { handleApi } from './api/_lib/handler.js';

/** Khi chạy `npm run dev`: phục vụ /api/players bằng cùng handler với Vercel Function (lưu vào .data/players.json) */
function devApi(): Plugin {
  return {
    name: 'q2q-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/players', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        let raw = '';
        req.on('data', (c: Buffer) => (raw += c));
        req.on('end', async () => {
          const { status, body } = await handleApi({
            method: req.method ?? 'GET',
            name: url.searchParams.get('name') ?? undefined,
            body: raw ? raw : undefined,
            adminKey: (req.headers['x-admin-key'] as string | undefined) ?? undefined,
          });
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(body));
        });
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [devApi()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { port: 5173, open: false },
});
