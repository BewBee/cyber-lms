/**
 * pages/api/quizzes/[id]/index.ts — Fetches questions for a specific module.
 * GET /api/quizzes/:id → returns module + student-safe questions (correct flags stripped).
 * Teacher view: add ?teacherView=true with a valid teacher token to include is_correct and explanation.
 * To test: GET /api/quizzes/{moduleId} — expect module object with question_options without is_correct.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { toStudentQuestions } from '@/lib/quizEngine';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';
import type { Question } from '@/types';

// ---------------------------------------------------------------------------
// Dev-mode fallback data (used when Supabase is not configured)
// Covers the 7 core module UUIDs seeded in seed_core_modules.sql
// ---------------------------------------------------------------------------
const DEV_MODULE_MAP: Record<string, { title: string; description: string }> = {
  '10000000-0000-0000-0000-000000000001': { title: 'Cybersecurity Fundamentals', description: 'CIA Triad, threat landscape, authentication, and core security concepts.' },
  '10000000-0000-0000-0000-000000000002': { title: 'Network Security', description: 'Firewalls, VPNs, MitM attacks, IDS/IPS, and wireless security.' },
  '10000000-0000-0000-0000-000000000003': { title: 'Web Application Security', description: 'OWASP Top 10, SQL Injection, XSS, CSRF, and secure coding.' },
  '10000000-0000-0000-0000-000000000004': { title: 'Cryptography Essentials', description: 'Encryption, hashing, digital signatures, PKI, and TLS.' },
  '10000000-0000-0000-0000-000000000005': { title: 'Social Engineering & Phishing', description: 'Phishing, spear phishing, vishing, baiting, and defences.' },
  '10000000-0000-0000-0000-000000000006': { title: 'Malware & Threat Analysis', description: 'Viruses, ransomware, rootkits, botnets, EDR, and sandboxing.' },
  '10000000-0000-0000-0000-000000000007': { title: 'Ethical Hacking & Penetration Testing', description: 'Pentest methodology, Nmap, Metasploit, privilege escalation.' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDevQuestions(moduleId: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pools: Record<string, any[]> = {
    '10000000-0000-0000-0000-000000000001': [
      { question_id: 'dev-q1', module_id: moduleId, question_text: 'What does the "C" in the CIA Triad stand for?', difficulty: 'easy', order_index: 1, question_options: [
        { option_id: 'o1', question_id: 'dev-q1', option_key: 'a', option_text: 'Confidentiality', is_correct: true },
        { option_id: 'o2', question_id: 'dev-q1', option_key: 'b', option_text: 'Compliance', is_correct: false },
        { option_id: 'o3', question_id: 'dev-q1', option_key: 'c', option_text: 'Configuration', is_correct: false },
        { option_id: 'o4', question_id: 'dev-q1', option_key: 'd', option_text: 'Cryptography', is_correct: false },
      ]},
      { question_id: 'dev-q2', module_id: moduleId, question_text: 'Which principle ensures data has not been tampered with?', difficulty: 'easy', order_index: 2, question_options: [
        { option_id: 'o5', question_id: 'dev-q2', option_key: 'a', option_text: 'Confidentiality', is_correct: false },
        { option_id: 'o6', question_id: 'dev-q2', option_key: 'b', option_text: 'Integrity', is_correct: true },
        { option_id: 'o7', question_id: 'dev-q2', option_key: 'c', option_text: 'Availability', is_correct: false },
        { option_id: 'o8', question_id: 'dev-q2', option_key: 'd', option_text: 'Authentication', is_correct: false },
      ]},
      { question_id: 'dev-q3', module_id: moduleId, question_text: 'What is a "threat actor"?', difficulty: 'easy', order_index: 3, question_options: [
        { option_id: 'o9', question_id: 'dev-q3', option_key: 'a', option_text: 'A software bug', is_correct: false },
        { option_id: 'o10', question_id: 'dev-q3', option_key: 'b', option_text: 'Any entity with potential to harm a system', is_correct: true },
        { option_id: 'o11', question_id: 'dev-q3', option_key: 'c', option_text: 'A network firewall rule', is_correct: false },
        { option_id: 'o12', question_id: 'dev-q3', option_key: 'd', option_text: 'An antivirus signature', is_correct: false },
      ]},
      { question_id: 'dev-q4', module_id: moduleId, question_text: 'What is a vulnerability?', difficulty: 'medium', order_index: 4, question_options: [
        { option_id: 'o13', question_id: 'dev-q4', option_key: 'a', option_text: 'An active attack', is_correct: false },
        { option_id: 'o14', question_id: 'dev-q4', option_key: 'b', option_text: 'A weakness that can be exploited', is_correct: true },
        { option_id: 'o15', question_id: 'dev-q4', option_key: 'c', option_text: 'An encryption algorithm', is_correct: false },
        { option_id: 'o16', question_id: 'dev-q4', option_key: 'd', option_text: 'A monitoring tool', is_correct: false },
      ]},
      { question_id: 'dev-q5', module_id: moduleId, question_text: 'Authentication vs. authorization: which is correct?', difficulty: 'medium', order_index: 5, question_options: [
        { option_id: 'o17', question_id: 'dev-q5', option_key: 'a', option_text: 'They are the same concept', is_correct: false },
        { option_id: 'o18', question_id: 'dev-q5', option_key: 'b', option_text: 'Authentication verifies identity; authorization grants access', is_correct: true },
        { option_id: 'o19', question_id: 'dev-q5', option_key: 'c', option_text: 'Authorization verifies identity', is_correct: false },
        { option_id: 'o20', question_id: 'dev-q5', option_key: 'd', option_text: 'Authentication is only for networks', is_correct: false },
      ]},
      { question_id: 'dev-q6', module_id: moduleId, question_text: 'Which attack overwhelms a system to deny service?', difficulty: 'easy', order_index: 6, question_options: [
        { option_id: 'o21', question_id: 'dev-q6', option_key: 'a', option_text: 'MitM', is_correct: false },
        { option_id: 'o22', question_id: 'dev-q6', option_key: 'b', option_text: 'SQL Injection', is_correct: false },
        { option_id: 'o23', question_id: 'dev-q6', option_key: 'c', option_text: 'Denial of Service (DoS)', is_correct: true },
        { option_id: 'o24', question_id: 'dev-q6', option_key: 'd', option_text: 'Phishing', is_correct: false },
      ]},
      { question_id: 'dev-q7', module_id: moduleId, question_text: 'What is "defense in depth"?', difficulty: 'medium', order_index: 7, question_options: [
        { option_id: 'o25', question_id: 'dev-q7', option_key: 'a', option_text: 'Relying on a single strong firewall', is_correct: false },
        { option_id: 'o26', question_id: 'dev-q7', option_key: 'b', option_text: 'Multiple security layers so that if one fails, others remain', is_correct: true },
        { option_id: 'o27', question_id: 'dev-q7', option_key: 'c', option_text: 'Encrypting all data at rest', is_correct: false },
        { option_id: 'o28', question_id: 'dev-q7', option_key: 'd', option_text: 'Only allowing admin users', is_correct: false },
      ]},
      { question_id: 'dev-q8', module_id: moduleId, question_text: 'Which is an example of a physical security control?', difficulty: 'easy', order_index: 8, question_options: [
        { option_id: 'o29', question_id: 'dev-q8', option_key: 'a', option_text: 'Password policy', is_correct: false },
        { option_id: 'o30', question_id: 'dev-q8', option_key: 'b', option_text: 'Firewall rules', is_correct: false },
        { option_id: 'o31', question_id: 'dev-q8', option_key: 'c', option_text: 'Biometric door locks', is_correct: true },
        { option_id: 'o32', question_id: 'dev-q8', option_key: 'd', option_text: 'Intrusion Detection System', is_correct: false },
      ]},
      { question_id: 'dev-q9', module_id: moduleId, question_text: 'What is non-repudiation?', difficulty: 'medium', order_index: 9, question_options: [
        { option_id: 'o33', question_id: 'dev-q9', option_key: 'a', option_text: 'Ensuring data is unreadable', is_correct: false },
        { option_id: 'o34', question_id: 'dev-q9', option_key: 'b', option_text: 'Ensuring a party cannot deny having performed an action', is_correct: true },
        { option_id: 'o35', question_id: 'dev-q9', option_key: 'c', option_text: 'Preventing data modification', is_correct: false },
        { option_id: 'o36', question_id: 'dev-q9', option_key: 'd', option_text: 'Making systems always available', is_correct: false },
      ]},
      { question_id: 'dev-q10', module_id: moduleId, question_text: 'What is the principle of least privilege?', difficulty: 'medium', order_index: 10, question_options: [
        { option_id: 'o37', question_id: 'dev-q10', option_key: 'a', option_text: 'Giving all users admin access', is_correct: false },
        { option_id: 'o38', question_id: 'dev-q10', option_key: 'b', option_text: 'Granting users only the permissions they need for their job', is_correct: true },
        { option_id: 'o39', question_id: 'dev-q10', option_key: 'c', option_text: 'Restricting all users from any access', is_correct: false },
        { option_id: 'o40', question_id: 'dev-q10', option_key: 'd', option_text: 'Using strong passwords for all accounts', is_correct: false },
      ]},
    ],
  };

  // For modules 2-7, generate generic quiz questions based on the module topic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genericByModule: Record<string, any[]> = {
    '10000000-0000-0000-0000-000000000002': [
      { question_id: 'dev-n1', module_id: moduleId, question_text: 'What is the primary purpose of a firewall?', difficulty: 'easy', order_index: 1, question_options: [
        { option_id: 'n1a', question_id: 'dev-n1', option_key: 'a', option_text: 'Speed up network traffic', is_correct: false },
        { option_id: 'n1b', question_id: 'dev-n1', option_key: 'b', option_text: 'Monitor and control network traffic based on rules', is_correct: true },
        { option_id: 'n1c', question_id: 'dev-n1', option_key: 'c', option_text: 'Assign IP addresses', is_correct: false },
        { option_id: 'n1d', question_id: 'dev-n1', option_key: 'd', option_text: 'Encrypt all network data', is_correct: false },
      ]},
      { question_id: 'dev-n2', module_id: moduleId, question_text: 'Which protocol does HTTPS use for encryption?', difficulty: 'easy', order_index: 2, question_options: [
        { option_id: 'n2a', question_id: 'dev-n2', option_key: 'a', option_text: 'MD5', is_correct: false },
        { option_id: 'n2b', question_id: 'dev-n2', option_key: 'b', option_text: 'TLS (Transport Layer Security)', is_correct: true },
        { option_id: 'n2c', question_id: 'dev-n2', option_key: 'c', option_text: 'SSH', is_correct: false },
        { option_id: 'n2d', question_id: 'dev-n2', option_key: 'd', option_text: 'IPSec', is_correct: false },
      ]},
      { question_id: 'dev-n3', module_id: moduleId, question_text: 'What port does HTTPS use by default?', difficulty: 'easy', order_index: 3, question_options: [
        { option_id: 'n3a', question_id: 'dev-n3', option_key: 'a', option_text: '80', is_correct: false },
        { option_id: 'n3b', question_id: 'dev-n3', option_key: 'b', option_text: '443', is_correct: true },
        { option_id: 'n3c', question_id: 'dev-n3', option_key: 'c', option_text: '22', is_correct: false },
        { option_id: 'n3d', question_id: 'dev-n3', option_key: 'd', option_text: '8080', is_correct: false },
      ]},
      { question_id: 'dev-n4', module_id: moduleId, question_text: 'What is ARP poisoning?', difficulty: 'medium', order_index: 4, question_options: [
        { option_id: 'n4a', question_id: 'dev-n4', option_key: 'a', option_text: 'Sending fake DNS responses', is_correct: false },
        { option_id: 'n4b', question_id: 'dev-n4', option_key: 'b', option_text: 'Linking an attacker\'s MAC to a legitimate IP via falsified ARP', is_correct: true },
        { option_id: 'n4c', question_id: 'dev-n4', option_key: 'c', option_text: 'Flooding a network with broadcast packets', is_correct: false },
        { option_id: 'n4d', question_id: 'dev-n4', option_key: 'd', option_text: 'Intercepting SSL certificates', is_correct: false },
      ]},
      { question_id: 'dev-n5', module_id: moduleId, question_text: 'What does a VPN do?', difficulty: 'easy', order_index: 5, question_options: [
        { option_id: 'n5a', question_id: 'dev-n5', option_key: 'a', option_text: 'Speeds up internet browsing', is_correct: false },
        { option_id: 'n5b', question_id: 'dev-n5', option_key: 'b', option_text: 'Creates an encrypted tunnel for remote users', is_correct: true },
        { option_id: 'n5c', question_id: 'dev-n5', option_key: 'c', option_text: 'Blocks all malicious traffic', is_correct: false },
        { option_id: 'n5d', question_id: 'dev-n5', option_key: 'd', option_text: 'Assigns private IP addresses', is_correct: false },
      ]},
      { question_id: 'dev-n6', module_id: moduleId, question_text: 'What is a Man-in-the-Middle (MitM) attack?', difficulty: 'medium', order_index: 6, question_options: [
        { option_id: 'n6a', question_id: 'dev-n6', option_key: 'a', option_text: 'Flooding a server with requests', is_correct: false },
        { option_id: 'n6b', question_id: 'dev-n6', option_key: 'b', option_text: 'Intercepting and potentially altering communication between two parties', is_correct: true },
        { option_id: 'n6c', question_id: 'dev-n6', option_key: 'c', option_text: 'Brute-forcing passwords', is_correct: false },
        { option_id: 'n6d', question_id: 'dev-n6', option_key: 'd', option_text: 'Scanning for open ports', is_correct: false },
      ]},
      { question_id: 'dev-n7', module_id: moduleId, question_text: 'Which wireless security protocol is most secure?', difficulty: 'medium', order_index: 7, question_options: [
        { option_id: 'n7a', question_id: 'dev-n7', option_key: 'a', option_text: 'WEP', is_correct: false },
        { option_id: 'n7b', question_id: 'dev-n7', option_key: 'b', option_text: 'WPA', is_correct: false },
        { option_id: 'n7c', question_id: 'dev-n7', option_key: 'c', option_text: 'WPA2', is_correct: false },
        { option_id: 'n7d', question_id: 'dev-n7', option_key: 'd', option_text: 'WPA3', is_correct: true },
      ]},
      { question_id: 'dev-n8', module_id: moduleId, question_text: 'What does IDS stand for?', difficulty: 'easy', order_index: 8, question_options: [
        { option_id: 'n8a', question_id: 'dev-n8', option_key: 'a', option_text: 'Internet Defense System', is_correct: false },
        { option_id: 'n8b', question_id: 'dev-n8', option_key: 'b', option_text: 'Intrusion Detection System', is_correct: true },
        { option_id: 'n8c', question_id: 'dev-n8', option_key: 'c', option_text: 'Internal Data Security', is_correct: false },
        { option_id: 'n8d', question_id: 'dev-n8', option_key: 'd', option_text: 'Integrated Defense Shield', is_correct: false },
      ]},
      { question_id: 'dev-n9', module_id: moduleId, question_text: 'What is DNS spoofing?', difficulty: 'medium', order_index: 9, question_options: [
        { option_id: 'n9a', question_id: 'dev-n9', option_key: 'a', option_text: 'Intercepting SSL certificates', is_correct: false },
        { option_id: 'n9b', question_id: 'dev-n9', option_key: 'b', option_text: 'Returning falsified DNS responses to redirect users to malicious IPs', is_correct: true },
        { option_id: 'n9c', question_id: 'dev-n9', option_key: 'c', option_text: 'Flooding a DNS server with requests', is_correct: false },
        { option_id: 'n9d', question_id: 'dev-n9', option_key: 'd', option_text: 'Changing a domain\'s registration', is_correct: false },
      ]},
      { question_id: 'dev-n10', module_id: moduleId, question_text: 'IDS detects threats; IPS does what additionally?', difficulty: 'hard', order_index: 10, question_options: [
        { option_id: 'n10a', question_id: 'dev-n10', option_key: 'a', option_text: 'Only logs events', is_correct: false },
        { option_id: 'n10b', question_id: 'dev-n10', option_key: 'b', option_text: 'Actively blocks or prevents threats', is_correct: true },
        { option_id: 'n10c', question_id: 'dev-n10', option_key: 'c', option_text: 'Encrypts all traffic', is_correct: false },
        { option_id: 'n10d', question_id: 'dev-n10', option_key: 'd', option_text: 'Acts as a VPN gateway', is_correct: false },
      ]},
    ],
  };

  // Return specific pool or generic fallback
  if (pools[moduleId]) return pools[moduleId];
  if (genericByModule[moduleId]) return genericByModule[moduleId];

  // Ultimate fallback: 10 generic security questions for any module
  return Array.from({ length: 10 }, (_, i) => ({
    question_id: `dev-generic-${i}`,
    module_id: moduleId,
    question_text: `Security question ${i + 1}: Which of the following is a security best practice?`,
    difficulty: 'easy' as const,
    order_index: i + 1,
    question_options: [
      { option_id: `g${i}a`, question_id: `dev-generic-${i}`, option_key: 'a', option_text: 'Use strong, unique passwords', is_correct: true },
      { option_id: `g${i}b`, question_id: `dev-generic-${i}`, option_key: 'b', option_text: 'Reuse the same password everywhere', is_correct: false },
      { option_id: `g${i}c`, question_id: `dev-generic-${i}`, option_key: 'c', option_text: 'Share your credentials with colleagues', is_correct: false },
      { option_id: `g${i}d`, question_id: `dev-generic-${i}`, option_key: 'd', option_text: 'Disable two-factor authentication for convenience', is_correct: false },
    ],
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const { id } = req.query;
  if (!isValidUUID(id)) return err(res, 'Invalid module ID', 400);

  const supabase = getServiceClient();
  const isTeacherView = req.query.teacherView === 'true';

  // Fetch module metadata
  const { data: module, error: modError } = await supabase
    .from('modules')
    .select('module_id, module_name, description, module_type, is_locked, exp_bonus_percent')
    .eq('module_id', id)
    .single();

  if (modError || !module) {
    // Dev fallback: serve stub data if module ID is a known dev UUID
    const devMeta = DEV_MODULE_MAP[id as string];
    if (devMeta) {
      const devQuestions = buildDevQuestions(id as string);
      const safeQuestions = isTeacherView ? devQuestions : toStudentQuestions(devQuestions);
      return res.status(200).json({
        module: {
          module_id: id,
          module_name: devMeta.title,
          description: devMeta.description,
          module_type: 'core',
          is_locked: false,
          exp_bonus_percent: 0,
        },
        questions: safeQuestions,
        total: safeQuestions.length,
      });
    }
    return err(res, 'Module not found', 404);
  }

  // Fetch questions with options
  // Teacher view includes is_correct + explanation; student view strips them
  const optionSelect = isTeacherView
    ? 'option_id, question_id, option_key, option_text, is_correct'
    : 'option_id, question_id, option_key, option_text'; // is_correct intentionally excluded

  const questionSelect = isTeacherView
    ? `question_id, module_id, question_text, difficulty, explanation, created_by, created_at, question_options ( ${optionSelect} )`
    : `question_id, module_id, question_text, difficulty, created_by, created_at, question_options ( ${optionSelect} )`;

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select(questionSelect)
    .eq('module_id', id)
    .order('created_at', { ascending: true });

  if (qError) {
    console.error('[GET /api/quizzes/:id] DB error:', qError.message);
    return err(res, 'Failed to fetch questions', 500);
  }

  const safeQuestions = isTeacherView
    ? questions ?? []
    : toStudentQuestions((questions as unknown as Question[]) ?? []);

  res.status(200).json({
    module,
    questions: safeQuestions,
    total: safeQuestions.length,
  });
}
