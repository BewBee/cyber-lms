/**
 * pages/api/student/powerups.ts — Power-up inventory for CyberShield LMS.
 * GET  ?studentId= : fetch student's power-up quantities (seeds defaults on first call)
 * POST ?studentId= { powerupType } : consume 1 of a power-up
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { isNonEmptyString } from '@/lib/apiHelpers';

export type PowerupType = 'fifty_fifty' | 'shield' | 'skip' | 'packet_sniffer';

const DEFAULT_POWERUPS: { powerup_type: PowerupType; quantity: number }[] = [
  { powerup_type: 'fifty_fifty',   quantity: 3 },
  { powerup_type: 'shield',        quantity: 2 },
  { powerup_type: 'skip',          quantity: 1 },
  { powerup_type: 'packet_sniffer', quantity: 1 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const studentId = req.query.studentId as string | undefined;

  if (!isNonEmptyString(studentId)) {
    return res.status(400).json({ error: 'studentId required' });
  }

  // ── GET — fetch inventory (seed defaults if first time) ──────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('student_powerups')
      .select('powerup_type, quantity')
      .eq('student_id', studentId);

    if (error) return res.status(500).json({ error: error.message });

    // First time: seed default power-ups for this student
    if (!data || data.length === 0) {
      const inserts = DEFAULT_POWERUPS.map((p) => ({
        student_id: studentId,
        ...p,
      }));
      const { data: seeded, error: seedErr } = await supabase
        .from('student_powerups')
        .insert(inserts)
        .select('powerup_type, quantity');

      if (seedErr) return res.status(500).json({ error: seedErr.message });
      return res.status(200).json({ powerups: seeded ?? [] });
    }

    // Ensure all powerup types exist (in case new types were added)
    const existingTypes = new Set(data.map((p) => p.powerup_type));
    const missing = DEFAULT_POWERUPS.filter((p) => !existingTypes.has(p.powerup_type));
    if (missing.length > 0) {
      await supabase
        .from('student_powerups')
        .insert(missing.map((p) => ({ student_id: studentId, ...p })));
      return res.status(200).json({
        powerups: [
          ...data,
          ...missing,
        ],
      });
    }

    return res.status(200).json({ powerups: data });
  }

  // ── POST — consume 1 power-up ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { powerupType } = req.body as { powerupType?: string };

    if (!isNonEmptyString(powerupType)) {
      return res.status(400).json({ error: 'powerupType required' });
    }

    // Fetch current quantity
    const { data: current, error: fetchErr } = await supabase
      .from('student_powerups')
      .select('quantity')
      .eq('student_id', studentId)
      .eq('powerup_type', powerupType)
      .single();

    if (fetchErr || !current) {
      return res.status(404).json({ error: 'Power-up not found for this student' });
    }

    if (current.quantity <= 0) {
      return res.status(400).json({ error: 'No power-ups of this type remaining' });
    }

    const newQty = current.quantity - 1;
    const { error: updateErr } = await supabase
      .from('student_powerups')
      .update({ quantity: newQty })
      .eq('student_id', studentId)
      .eq('powerup_type', powerupType);

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.status(200).json({ remaining: newQty });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
