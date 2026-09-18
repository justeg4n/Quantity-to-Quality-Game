import { handleApi } from './_lib/handler.js';

/** Vercel Serverless Function: /api/players */
export default async function handler(req, res) {
  const name = Array.isArray(req.query?.name) ? req.query.name[0] : req.query?.name;
  const { status, body } = await handleApi({
    method: req.method,
    name,
    body: req.body,
    adminKey: req.headers['x-admin-key'],
  });
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}
