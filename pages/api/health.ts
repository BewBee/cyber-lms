/**
 * pages/api/health.ts — Simple health-check endpoint for CyberShield LMS.
 * Returns { ok: true } when the API layer is running.
 * To test: GET /api/health — expect { ok: true, timestamp: "..." }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(200).json({ ok: true, timestamp: new Date().toISOString(), version: '1.0.0' });
}
