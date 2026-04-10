/**
 * pages/api/student/store.ts — Power-up store for CyberShield LMS.
 * GET  ?studentId= : fetch store catalogue + student's current coin balance
 * POST ?studentId= { itemId } : purchase an item (deduct coins, grant power-up)
 *
 * Store items are hardcoded (no DB table needed for MVP).
 * Currency: Credits (coins column on users table).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { isNonEmptyString } from '@/lib/apiHelpers';

export interface StoreItem {
  id: string;
  powerup_type: string;
  name: string;
  icon: string;
  description: string;
  flavour: string;
  cost: number;
  level_required: number;
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'buy_fifty_fifty',
    powerup_type: 'fifty_fifty',
    name: 'NMAP SCAN',
    icon: '🎯',
    description: 'Eliminates 2 wrong answers. Narrows the target to 2 remaining options.',
    flavour: '// Run a port scan. See what\'s really open.',
    cost: 60,
    level_required: 1,
  },
  {
    id: 'buy_shield',
    powerup_type: 'shield',
    name: 'FIREWALL.EXE',
    icon: '🛡',
    description: 'Absorbs one wrong answer. No life lost on next mistake.',
    flavour: '// Deploy perimeter defence. One hit, zero damage.',
    cost: 90,
    level_required: 1,
  },
  {
    id: 'buy_packet_sniffer',
    powerup_type: 'packet_sniffer',
    name: 'PACKET SNIFFER',
    icon: '📡',
    description: 'Intercepts one wrong answer before it breaks your streak.',
    flavour: '// Capture the packet before it corrupts the chain.',
    cost: 120,
    level_required: 5,
  },
  {
    id: 'buy_skip',
    powerup_type: 'skip',
    name: 'ZERO-DAY EXPLOIT',
    icon: '⏭',
    description: 'Bypass a question entirely. No penalty, no attempt logged.',
    flavour: '// Unknown vulnerability. Undetected passage.',
    cost: 150,
    level_required: 1,
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const studentId = req.query.studentId as string | undefined;

  if (!isNonEmptyString(studentId)) {
    return res.status(400).json({ error: 'studentId required' });
  }

  // ── GET — catalogue + coin balance ───────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: user, error } = await supabase
      .from('users')
      .select('coins')
      .eq('id', studentId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Student not found' });

    return res.status(200).json({
      coins: user.coins ?? 0,
      items: STORE_ITEMS,
    });
  }

  // ── POST — purchase ───────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { itemId } = req.body as { itemId?: string };
    if (!isNonEmptyString(itemId)) return res.status(400).json({ error: 'itemId required' });

    const item = STORE_ITEMS.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check balance + level
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('coins, level')
      .eq('id', studentId)
      .single();

    if (fetchErr || !user) return res.status(404).json({ error: 'Student not found' });

    if ((user.level ?? 1) < item.level_required) {
      return res.status(400).json({ error: `Requires Level ${item.level_required}. You are Level ${user.level ?? 1}.` });
    }

    const currentCoins = user.coins ?? 0;
    if (currentCoins < item.cost) {
      return res.status(400).json({ error: `Not enough Credits. You have ${currentCoins} CR, need ${item.cost} CR.` });
    }

    // Deduct coins
    const newCoins = currentCoins - item.cost;
    const { error: coinErr } = await supabase
      .from('users')
      .update({ coins: newCoins })
      .eq('id', studentId);

    if (coinErr) return res.status(500).json({ error: coinErr.message });

    // Grant power-up (upsert: increment if exists, insert if not)
    const { data: existingPu } = await supabase
      .from('student_powerups')
      .select('quantity')
      .eq('student_id', studentId)
      .eq('powerup_type', item.powerup_type)
      .single();

    if (existingPu) {
      await supabase
        .from('student_powerups')
        .update({ quantity: existingPu.quantity + 1 })
        .eq('student_id', studentId)
        .eq('powerup_type', item.powerup_type);
    } else {
      await supabase
        .from('student_powerups')
        .insert({ student_id: studentId, powerup_type: item.powerup_type, quantity: 1 });
    }

    return res.status(200).json({
      newCoins,
      powerupType: item.powerup_type,
      newQuantity: (existingPu?.quantity ?? 0) + 1,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
