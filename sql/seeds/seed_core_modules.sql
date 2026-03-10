-- =============================================================================
-- CyberShield LMS — 7 Core Module Seed
-- Intended audience: University students (IT / Computer Science / cybersecurity)
-- with beginner-to-intermediate knowledge. Based on FYP report scope.
--
-- Module progression:
--   1. Cybersecurity Fundamentals
--   2. Network Security
--   3. Web Application Security
--   4. Cryptography Essentials
--   5. Social Engineering & Phishing
--   6. Malware & Threat Analysis
--   7. Ethical Hacking & Penetration Testing
--
-- Each module has 15 questions (pool for 10-question random quiz sessions).
-- Run AFTER 001_schema.sql and seed_demo.sql.
-- Idempotent: uses ON CONFLICT DO NOTHING on modules, deletes + reinserts questions.
-- =============================================================================

DO $$
DECLARE
  -- Fixed UUIDs (admin created by seed_demo.sql)
  v_admin_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_course_id UUID := '00000000-0000-0000-0000-000000000010';

  -- Module UUIDs
  v_m1 UUID := '10000000-0000-0000-0000-000000000001'; -- Cybersecurity Fundamentals
  v_m2 UUID := '10000000-0000-0000-0000-000000000002'; -- Network Security
  v_m3 UUID := '10000000-0000-0000-0000-000000000003'; -- Web Application Security
  v_m4 UUID := '10000000-0000-0000-0000-000000000004'; -- Cryptography Essentials
  v_m5 UUID := '10000000-0000-0000-0000-000000000005'; -- Social Engineering & Phishing
  v_m6 UUID := '10000000-0000-0000-0000-000000000006'; -- Malware & Threat Analysis
  v_m7 UUID := '10000000-0000-0000-0000-000000000007'; -- Ethical Hacking & Pen Testing

BEGIN

-- =============================================================================
-- MODULE 1: Cybersecurity Fundamentals
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m1, v_course_id, v_admin_id,
  'Cybersecurity Fundamentals',
  'Learn the core principles of cybersecurity: the CIA Triad (Confidentiality, Integrity, Availability), threat landscape, common attack vectors, and foundational security concepts every IT professional must know.',
  'core', TRUE, 1, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m1);
DELETE FROM questions WHERE module_id = v_m1;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('11000000-0000-0000-0000-000000000001', v_m1, 'What does the "C" in the CIA Triad stand for?', 'easy', 1),
  ('11000000-0000-0000-0000-000000000002', v_m1, 'Which principle ensures that data is accurate and has not been tampered with?', 'easy', 2),
  ('11000000-0000-0000-0000-000000000003', v_m1, 'What is a "threat actor" in cybersecurity?', 'easy', 3),
  ('11000000-0000-0000-0000-000000000004', v_m1, 'Which of the following best describes a vulnerability?', 'medium', 4),
  ('11000000-0000-0000-0000-000000000005', v_m1, 'What is the difference between authentication and authorization?', 'medium', 5),
  ('11000000-0000-0000-0000-000000000006', v_m1, 'Which type of attack involves overwhelming a system with traffic to make it unavailable?', 'easy', 6),
  ('11000000-0000-0000-0000-000000000007', v_m1, 'What is "defense in depth"?', 'medium', 7),
  ('11000000-0000-0000-0000-000000000008', v_m1, 'Which of the following is an example of a physical security control?', 'easy', 8),
  ('11000000-0000-0000-0000-000000000009', v_m1, 'What does "non-repudiation" mean in security?', 'medium', 9),
  ('11000000-0000-0000-0000-000000000010', v_m1, 'A zero-day vulnerability is best described as:', 'hard', 10),
  ('11000000-0000-0000-0000-000000000011', v_m1, 'What is the principle of least privilege?', 'medium', 11),
  ('11000000-0000-0000-0000-000000000012', v_m1, 'Which security model is based on "never trust, always verify"?', 'medium', 12),
  ('11000000-0000-0000-0000-000000000013', v_m1, 'What is a security policy?', 'easy', 13),
  ('11000000-0000-0000-0000-000000000014', v_m1, 'Which of the following is an example of a passive attack?', 'hard', 14),
  ('11000000-0000-0000-0000-000000000015', v_m1, 'What does OPSEC (Operational Security) focus on?', 'hard', 15);

-- Q1
INSERT INTO question_options VALUES
  ('11000000-0001-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','a','Confidentiality',TRUE),
  ('11000000-0001-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','b','Compliance',FALSE),
  ('11000000-0001-0000-0000-000000000003','11000000-0000-0000-0000-000000000001','c','Configuration',FALSE),
  ('11000000-0001-0000-0000-000000000004','11000000-0000-0000-0000-000000000001','d','Cryptography',FALSE);
-- Q2
INSERT INTO question_options VALUES
  ('11000000-0002-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','a','Confidentiality',FALSE),
  ('11000000-0002-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','b','Integrity',TRUE),
  ('11000000-0002-0000-0000-000000000003','11000000-0000-0000-0000-000000000002','c','Availability',FALSE),
  ('11000000-0002-0000-0000-000000000004','11000000-0000-0000-0000-000000000002','d','Authentication',FALSE);
-- Q3
INSERT INTO question_options VALUES
  ('11000000-0003-0000-0000-000000000001','11000000-0000-0000-0000-000000000003','a','A software bug that causes crashes',FALSE),
  ('11000000-0003-0000-0000-000000000002','11000000-0000-0000-0000-000000000003','b','Any entity that has the potential to cause harm to a system or organization',TRUE),
  ('11000000-0003-0000-0000-000000000003','11000000-0000-0000-0000-000000000003','c','A network firewall rule',FALSE),
  ('11000000-0003-0000-0000-000000000004','11000000-0000-0000-0000-000000000003','d','An antivirus signature',FALSE);
-- Q4
INSERT INTO question_options VALUES
  ('11000000-0004-0000-0000-000000000001','11000000-0000-0000-0000-000000000004','a','An active attack on a system',FALSE),
  ('11000000-0004-0000-0000-000000000002','11000000-0000-0000-0000-000000000004','b','A weakness in a system that can be exploited',TRUE),
  ('11000000-0004-0000-0000-000000000003','11000000-0000-0000-0000-000000000004','c','A type of encryption algorithm',FALSE),
  ('11000000-0004-0000-0000-000000000004','11000000-0000-0000-0000-000000000004','d','A network monitoring tool',FALSE);
-- Q5
INSERT INTO question_options VALUES
  ('11000000-0005-0000-0000-000000000001','11000000-0000-0000-0000-000000000005','a','They are the same concept',FALSE),
  ('11000000-0005-0000-0000-000000000002','11000000-0000-0000-0000-000000000005','b','Authentication verifies identity; authorization determines what they can access',TRUE),
  ('11000000-0005-0000-0000-000000000003','11000000-0000-0000-0000-000000000005','c','Authorization verifies identity; authentication grants permissions',FALSE),
  ('11000000-0005-0000-0000-000000000004','11000000-0000-0000-0000-000000000005','d','Authentication is only for networks; authorization is for applications',FALSE);
-- Q6
INSERT INTO question_options VALUES
  ('11000000-0006-0000-0000-000000000001','11000000-0000-0000-0000-000000000006','a','Man-in-the-Middle (MitM)',FALSE),
  ('11000000-0006-0000-0000-000000000002','11000000-0000-0000-0000-000000000006','b','SQL Injection',FALSE),
  ('11000000-0006-0000-0000-000000000003','11000000-0000-0000-0000-000000000006','c','Denial of Service (DoS)',TRUE),
  ('11000000-0006-0000-0000-000000000004','11000000-0000-0000-0000-000000000006','d','Phishing',FALSE);
-- Q7
INSERT INTO question_options VALUES
  ('11000000-0007-0000-0000-000000000001','11000000-0000-0000-0000-000000000007','a','Relying on a single strong firewall',FALSE),
  ('11000000-0007-0000-0000-000000000002','11000000-0000-0000-0000-000000000007','b','Using multiple layers of security controls so that if one fails, others remain',TRUE),
  ('11000000-0007-0000-0000-000000000003','11000000-0000-0000-0000-000000000007','c','Encrypting all data at rest',FALSE),
  ('11000000-0007-0000-0000-000000000004','11000000-0000-0000-0000-000000000007','d','Only allowing admin users to access systems',FALSE);
-- Q8
INSERT INTO question_options VALUES
  ('11000000-0008-0000-0000-000000000001','11000000-0000-0000-0000-000000000008','a','Password policy enforcement',FALSE),
  ('11000000-0008-0000-0000-000000000002','11000000-0000-0000-0000-000000000008','b','Firewall rules',FALSE),
  ('11000000-0008-0000-0000-000000000003','11000000-0000-0000-0000-000000000008','c','Biometric door locks',TRUE),
  ('11000000-0008-0000-0000-000000000004','11000000-0000-0000-0000-000000000008','d','Intrusion Detection System (IDS)',FALSE);
-- Q9
INSERT INTO question_options VALUES
  ('11000000-0009-0000-0000-000000000001','11000000-0000-0000-0000-000000000009','a','Ensuring data cannot be read by unauthorized parties',FALSE),
  ('11000000-0009-0000-0000-000000000002','11000000-0000-0000-0000-000000000009','b','Ensuring a party cannot deny having performed an action',TRUE),
  ('11000000-0009-0000-0000-000000000003','11000000-0000-0000-0000-000000000009','c','Preventing data modification in transit',FALSE),
  ('11000000-0009-0000-0000-000000000004','11000000-0000-0000-0000-000000000009','d','Making systems always available',FALSE);
-- Q10
INSERT INTO question_options VALUES
  ('11000000-0010-0000-0000-000000000001','11000000-0000-0000-0000-000000000010','a','A vulnerability known to the vendor and patched',FALSE),
  ('11000000-0010-0000-0000-000000000002','11000000-0000-0000-0000-000000000010','b','A vulnerability that is publicly known but not yet exploited',FALSE),
  ('11000000-0010-0000-0000-000000000003','11000000-0000-0000-0000-000000000010','c','A vulnerability unknown to the software vendor, with no available patch',TRUE),
  ('11000000-0010-0000-0000-000000000004','11000000-0000-0000-0000-000000000010','d','A vulnerability in physical hardware only',FALSE);
-- Q11
INSERT INTO question_options VALUES
  ('11000000-0011-0000-0000-000000000001','11000000-0000-0000-0000-000000000011','a','Giving all users administrator access for convenience',FALSE),
  ('11000000-0011-0000-0000-000000000002','11000000-0000-0000-0000-000000000011','b','Granting users only the permissions they need to perform their job',TRUE),
  ('11000000-0011-0000-0000-000000000003','11000000-0000-0000-0000-000000000011','c','Restricting all users from accessing any systems',FALSE),
  ('11000000-0011-0000-0000-000000000004','11000000-0000-0000-0000-000000000011','d','Using strong passwords for all accounts',FALSE);
-- Q12
INSERT INTO question_options VALUES
  ('11000000-0012-0000-0000-000000000001','11000000-0000-0000-0000-000000000012','a','Perimeter Security Model',FALSE),
  ('11000000-0012-0000-0000-000000000002','11000000-0000-0000-0000-000000000012','b','Role-Based Access Control (RBAC)',FALSE),
  ('11000000-0012-0000-0000-000000000003','11000000-0000-0000-0000-000000000012','c','Zero Trust Architecture',TRUE),
  ('11000000-0012-0000-0000-000000000004','11000000-0000-0000-0000-000000000012','d','Defense in Depth',FALSE);
-- Q13
INSERT INTO question_options VALUES
  ('11000000-0013-0000-0000-000000000001','11000000-0000-0000-0000-000000000013','a','A technical configuration guide for firewalls',FALSE),
  ('11000000-0013-0000-0000-000000000002','11000000-0000-0000-0000-000000000013','b','A formal document defining rules and expectations for protecting information assets',TRUE),
  ('11000000-0013-0000-0000-000000000003','11000000-0000-0000-0000-000000000013','c','An antivirus software update',FALSE),
  ('11000000-0013-0000-0000-000000000004','11000000-0000-0000-0000-000000000013','d','A list of all network devices',FALSE);
-- Q14
INSERT INTO question_options VALUES
  ('11000000-0014-0000-0000-000000000001','11000000-0000-0000-0000-000000000014','a','A Denial of Service attack',FALSE),
  ('11000000-0014-0000-0000-000000000002','11000000-0000-0000-0000-000000000014','b','Installing ransomware on a server',FALSE),
  ('11000000-0014-0000-0000-000000000003','11000000-0000-0000-0000-000000000014','c','Eavesdropping on network traffic without altering it',TRUE),
  ('11000000-0014-0000-0000-000000000004','11000000-0000-0000-0000-000000000014','d','Sending phishing emails',FALSE);
-- Q15
INSERT INTO question_options VALUES
  ('11000000-0015-0000-0000-000000000001','11000000-0000-0000-0000-000000000015','a','Encrypting all communications',FALSE),
  ('11000000-0015-0000-0000-000000000002','11000000-0000-0000-0000-000000000015','b','Protecting sensitive information from adversaries by identifying and controlling it',TRUE),
  ('11000000-0015-0000-0000-000000000003','11000000-0000-0000-0000-000000000015','c','Setting up intrusion detection systems',FALSE),
  ('11000000-0015-0000-0000-000000000004','11000000-0000-0000-0000-000000000015','d','Monitoring network bandwidth usage',FALSE);


-- =============================================================================
-- MODULE 2: Network Security
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m2, v_course_id, v_admin_id,
  'Network Security',
  'Explore how networks are secured against attacks. Topics include firewalls, VPNs, network protocols, common network attacks (ARP poisoning, DNS spoofing, man-in-the-middle), IDS/IPS systems, and wireless security.',
  'core', TRUE, 2, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m2);
DELETE FROM questions WHERE module_id = v_m2;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('12000000-0000-0000-0000-000000000001', v_m2, 'What is the primary purpose of a firewall?', 'easy', 1),
  ('12000000-0000-0000-0000-000000000002', v_m2, 'Which protocol does HTTPS use for encryption?', 'easy', 2),
  ('12000000-0000-0000-0000-000000000003', v_m2, 'What does a VPN do?', 'easy', 3),
  ('12000000-0000-0000-0000-000000000004', v_m2, 'What is ARP poisoning?', 'medium', 4),
  ('12000000-0000-0000-0000-000000000005', v_m2, 'Which port does HTTPS traffic use by default?', 'easy', 5),
  ('12000000-0000-0000-0000-000000000006', v_m2, 'What is a Man-in-the-Middle (MitM) attack?', 'medium', 6),
  ('12000000-0000-0000-0000-000000000007', v_m2, 'What does an IDS (Intrusion Detection System) do?', 'medium', 7),
  ('12000000-0000-0000-0000-000000000008', v_m2, 'What is DNS spoofing?', 'medium', 8),
  ('12000000-0000-0000-0000-000000000009', v_m2, 'Which wireless security protocol is considered most secure?', 'medium', 9),
  ('12000000-0000-0000-0000-000000000010', v_m2, 'What is a DMZ (Demilitarised Zone) in networking?', 'hard', 10),
  ('12000000-0000-0000-0000-000000000011', v_m2, 'What is port scanning used for in security assessments?', 'medium', 11),
  ('12000000-0000-0000-0000-000000000012', v_m2, 'Which layer of the OSI model do firewalls primarily operate at?', 'hard', 12),
  ('12000000-0000-0000-0000-000000000013', v_m2, 'What is a stateful firewall?', 'hard', 13),
  ('12000000-0000-0000-0000-000000000014', v_m2, 'What does NAT (Network Address Translation) provide from a security standpoint?', 'medium', 14),
  ('12000000-0000-0000-0000-000000000015', v_m2, 'What is the difference between IDS and IPS?', 'hard', 15);

INSERT INTO question_options VALUES
  ('12000000-0001-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','a','Speed up network traffic',FALSE),
  ('12000000-0001-0000-0000-000000000002','12000000-0000-0000-0000-000000000001','b','Monitor and control incoming and outgoing network traffic based on rules',TRUE),
  ('12000000-0001-0000-0000-000000000003','12000000-0000-0000-0000-000000000001','c','Assign IP addresses to devices',FALSE),
  ('12000000-0001-0000-0000-000000000004','12000000-0000-0000-0000-000000000001','d','Encrypt all network data',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0002-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','a','MD5',FALSE),
  ('12000000-0002-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','b','SSH',FALSE),
  ('12000000-0002-0000-0000-000000000003','12000000-0000-0000-0000-000000000002','c','TLS (Transport Layer Security)',TRUE),
  ('12000000-0002-0000-0000-000000000004','12000000-0000-0000-0000-000000000002','d','IPSec only',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0003-0000-0000-000000000001','12000000-0000-0000-0000-000000000003','a','Speeds up internet browsing',FALSE),
  ('12000000-0003-0000-0000-000000000002','12000000-0000-0000-0000-000000000003','b','Creates an encrypted tunnel over a public network to securely connect remote users',TRUE),
  ('12000000-0003-0000-0000-000000000003','12000000-0000-0000-0000-000000000003','c','Blocks all malicious traffic',FALSE),
  ('12000000-0003-0000-0000-000000000004','12000000-0000-0000-0000-000000000003','d','Assigns private IP addresses',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0004-0000-0000-000000000001','12000000-0000-0000-0000-000000000004','a','Sending fake DNS responses to redirect traffic',FALSE),
  ('12000000-0004-0000-0000-000000000002','12000000-0000-0000-0000-000000000004','b','Sending falsified ARP messages to link the attacker''s MAC address with a legitimate IP',TRUE),
  ('12000000-0004-0000-0000-000000000003','12000000-0000-0000-0000-000000000004','c','Flooding a network with broadcast packets',FALSE),
  ('12000000-0004-0000-0000-000000000004','12000000-0000-0000-0000-000000000004','d','Intercepting SSL certificates',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0005-0000-0000-000000000001','12000000-0000-0000-0000-000000000005','a','80',FALSE),
  ('12000000-0005-0000-0000-000000000002','12000000-0000-0000-0000-000000000005','b','443',TRUE),
  ('12000000-0005-0000-0000-000000000003','12000000-0000-0000-0000-000000000005','c','22',FALSE),
  ('12000000-0005-0000-0000-000000000004','12000000-0000-0000-0000-000000000005','d','8080',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0006-0000-0000-000000000001','12000000-0000-0000-0000-000000000006','a','An attacker secretly intercepts and potentially alters communication between two parties',TRUE),
  ('12000000-0006-0000-0000-000000000002','12000000-0000-0000-0000-000000000006','b','Flooding a server with requests',FALSE),
  ('12000000-0006-0000-0000-000000000003','12000000-0000-0000-0000-000000000006','c','Guessing passwords through brute force',FALSE),
  ('12000000-0006-0000-0000-000000000004','12000000-0000-0000-0000-000000000006','d','Scanning for open ports on a target',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0007-0000-0000-000000000001','12000000-0000-0000-0000-000000000007','a','Blocks malicious traffic automatically',FALSE),
  ('12000000-0007-0000-0000-000000000002','12000000-0000-0000-0000-000000000007','b','Monitors network or system activities and alerts administrators about suspicious events',TRUE),
  ('12000000-0007-0000-0000-000000000003','12000000-0000-0000-0000-000000000007','c','Encrypts all data in transit',FALSE),
  ('12000000-0007-0000-0000-000000000004','12000000-0000-0000-0000-000000000007','d','Assigns roles to network users',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0008-0000-0000-000000000001','12000000-0000-0000-0000-000000000008','a','Intercepting SSL certificates',FALSE),
  ('12000000-0008-0000-0000-000000000002','12000000-0000-0000-0000-000000000008','b','Returning falsified DNS responses to redirect users to malicious IP addresses',TRUE),
  ('12000000-0008-0000-0000-000000000003','12000000-0000-0000-0000-000000000008','c','Flooding a DNS server with requests',FALSE),
  ('12000000-0008-0000-0000-000000000004','12000000-0000-0000-0000-000000000008','d','Changing a domain''s registration details',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0009-0000-0000-000000000001','12000000-0000-0000-0000-000000000009','a','WEP',FALSE),
  ('12000000-0009-0000-0000-000000000002','12000000-0000-0000-0000-000000000009','b','WPA',FALSE),
  ('12000000-0009-0000-0000-000000000003','12000000-0000-0000-0000-000000000009','c','WPA2',FALSE),
  ('12000000-0009-0000-0000-000000000004','12000000-0000-0000-0000-000000000009','d','WPA3',TRUE);
INSERT INTO question_options VALUES
  ('12000000-0010-0000-0000-000000000001','12000000-0000-0000-0000-000000000010','a','A zone that completely blocks all external traffic',FALSE),
  ('12000000-0010-0000-0000-000000000002','12000000-0000-0000-0000-000000000010','b','A network segment that sits between the internal network and the internet to host public-facing services',TRUE),
  ('12000000-0010-0000-0000-000000000003','12000000-0000-0000-0000-000000000010','c','A backup network for disaster recovery',FALSE),
  ('12000000-0010-0000-0000-000000000004','12000000-0000-0000-0000-000000000010','d','A virtual private network segment',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0011-0000-0000-000000000001','12000000-0000-0000-0000-000000000011','a','Sending phishing emails to users',FALSE),
  ('12000000-0011-0000-0000-000000000002','12000000-0000-0000-0000-000000000011','b','Identifying open ports and services on a target to understand potential attack surfaces',TRUE),
  ('12000000-0011-0000-0000-000000000003','12000000-0000-0000-0000-000000000011','c','Blocking all incoming traffic',FALSE),
  ('12000000-0011-0000-0000-000000000004','12000000-0000-0000-0000-000000000011','d','Encrypting data in transit',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0012-0000-0000-000000000001','12000000-0000-0000-0000-000000000012','a','Layer 1 (Physical)',FALSE),
  ('12000000-0012-0000-0000-000000000002','12000000-0000-0000-0000-000000000012','b','Layer 3 (Network) and Layer 4 (Transport)',TRUE),
  ('12000000-0012-0000-0000-000000000003','12000000-0000-0000-0000-000000000012','c','Layer 7 (Application) only',FALSE),
  ('12000000-0012-0000-0000-000000000004','12000000-0000-0000-0000-000000000012','d','Layer 2 (Data Link)',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0013-0000-0000-000000000001','12000000-0000-0000-0000-000000000013','a','A firewall that only filters based on IP address',FALSE),
  ('12000000-0013-0000-0000-000000000002','12000000-0000-0000-0000-000000000013','b','A firewall that tracks the state of active connections and makes decisions based on context',TRUE),
  ('12000000-0013-0000-0000-000000000003','12000000-0000-0000-0000-000000000013','c','A firewall that inspects application-layer data',FALSE),
  ('12000000-0013-0000-0000-000000000004','12000000-0000-0000-0000-000000000013','d','A hardware-only firewall device',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0014-0000-0000-000000000001','12000000-0000-0000-0000-000000000014','a','It encrypts all traffic',FALSE),
  ('12000000-0014-0000-0000-000000000002','12000000-0000-0000-0000-000000000014','b','It hides internal IP addresses from external networks, reducing the attack surface',TRUE),
  ('12000000-0014-0000-0000-000000000003','12000000-0000-0000-0000-000000000014','c','It assigns static IP addresses',FALSE),
  ('12000000-0014-0000-0000-000000000004','12000000-0000-0000-0000-000000000014','d','It blocks all outbound traffic',FALSE);
INSERT INTO question_options VALUES
  ('12000000-0015-0000-0000-000000000001','12000000-0000-0000-0000-000000000015','a','IDS blocks threats; IPS only detects them',FALSE),
  ('12000000-0015-0000-0000-000000000002','12000000-0000-0000-0000-000000000015','b','IDS detects and alerts; IPS detects and actively blocks or prevents the threat',TRUE),
  ('12000000-0015-0000-0000-000000000003','12000000-0000-0000-0000-000000000015','c','They are the same technology',FALSE),
  ('12000000-0015-0000-0000-000000000004','12000000-0000-0000-0000-000000000015','d','IPS is hardware-only; IDS is software-only',FALSE);


-- =============================================================================
-- MODULE 3: Web Application Security
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m3, v_course_id, v_admin_id,
  'Web Application Security',
  'Understand the OWASP Top 10 web vulnerabilities including SQL Injection, XSS, CSRF, Broken Authentication, and Insecure Direct Object References. Learn how to identify and prevent these critical web threats.',
  'core', TRUE, 3, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m3);
DELETE FROM questions WHERE module_id = v_m3;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('13000000-0000-0000-0000-000000000001', v_m3, 'What does SQL Injection allow an attacker to do?', 'easy', 1),
  ('13000000-0000-0000-0000-000000000002', v_m3, 'What is Cross-Site Scripting (XSS)?', 'easy', 2),
  ('13000000-0000-0000-0000-000000000003', v_m3, 'What is CSRF (Cross-Site Request Forgery)?', 'medium', 3),
  ('13000000-0000-0000-0000-000000000004', v_m3, 'Which OWASP Top 10 category covers misconfigured security settings?', 'medium', 4),
  ('13000000-0000-0000-0000-000000000005', v_m3, 'What is the best defense against SQL Injection?', 'easy', 5),
  ('13000000-0000-0000-0000-000000000006', v_m3, 'What does IDOR (Insecure Direct Object Reference) mean?', 'medium', 6),
  ('13000000-0000-0000-0000-000000000007', v_m3, 'What is a stored XSS attack?', 'medium', 7),
  ('13000000-0000-0000-0000-000000000008', v_m3, 'Which HTTP header helps prevent Clickjacking attacks?', 'hard', 8),
  ('13000000-0000-0000-0000-000000000009', v_m3, 'What is the purpose of Content Security Policy (CSP)?', 'hard', 9),
  ('13000000-0000-0000-0000-000000000010', v_m3, 'What is a session fixation attack?', 'hard', 10),
  ('13000000-0000-0000-0000-000000000011', v_m3, 'Which of the following prevents CSRF attacks?', 'medium', 11),
  ('13000000-0000-0000-0000-000000000012', v_m3, 'What does Broken Authentication typically lead to?', 'medium', 12),
  ('13000000-0000-0000-0000-000000000013', v_m3, 'What is security misconfiguration in web applications?', 'medium', 13),
  ('13000000-0000-0000-0000-000000000014', v_m3, 'What is the role of HTTPS in web security?', 'easy', 14),
  ('13000000-0000-0000-0000-000000000015', v_m3, 'What is the purpose of input validation in web security?', 'easy', 15);

INSERT INTO question_options VALUES
  ('13000000-0001-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','a','Crash the web server',FALSE),
  ('13000000-0001-0000-0000-000000000002','13000000-0000-0000-0000-000000000001','b','Manipulate or extract data from a database by injecting malicious SQL code',TRUE),
  ('13000000-0001-0000-0000-000000000003','13000000-0000-0000-0000-000000000001','c','Steal session cookies via scripts',FALSE),
  ('13000000-0001-0000-0000-000000000004','13000000-0000-0000-0000-000000000001','d','Intercept HTTPS traffic',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0002-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','a','Injecting malicious SQL into a database query',FALSE),
  ('13000000-0002-0000-0000-000000000002','13000000-0000-0000-0000-000000000002','b','Injecting malicious scripts into web pages viewed by other users',TRUE),
  ('13000000-0002-0000-0000-000000000003','13000000-0000-0000-0000-000000000002','c','Forging HTTP requests from a victim''s browser',FALSE),
  ('13000000-0002-0000-0000-000000000004','13000000-0000-0000-0000-000000000002','d','Intercepting web traffic between client and server',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0003-0000-0000-000000000001','13000000-0000-0000-0000-000000000003','a','Injecting JavaScript into a web page',FALSE),
  ('13000000-0003-0000-0000-000000000002','13000000-0000-0000-0000-000000000003','b','Tricking an authenticated user''s browser into making unwanted requests to a site',TRUE),
  ('13000000-0003-0000-0000-000000000003','13000000-0000-0000-0000-000000000003','c','Stealing SSL certificates',FALSE),
  ('13000000-0003-0000-0000-000000000004','13000000-0000-0000-0000-000000000003','d','Manipulating database queries',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0004-0000-0000-000000000001','13000000-0000-0000-0000-000000000004','a','Injection',FALSE),
  ('13000000-0004-0000-0000-000000000002','13000000-0000-0000-0000-000000000004','b','Security Misconfiguration',TRUE),
  ('13000000-0004-0000-0000-000000000003','13000000-0000-0000-0000-000000000004','c','Broken Access Control',FALSE),
  ('13000000-0004-0000-0000-000000000004','13000000-0000-0000-0000-000000000004','d','Cryptographic Failures',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0005-0000-0000-000000000001','13000000-0000-0000-0000-000000000005','a','Using strong passwords',FALSE),
  ('13000000-0005-0000-0000-000000000002','13000000-0000-0000-0000-000000000005','b','Using parameterised queries / prepared statements',TRUE),
  ('13000000-0005-0000-0000-000000000003','13000000-0000-0000-0000-000000000005','c','Encrypting the database',FALSE),
  ('13000000-0005-0000-0000-000000000004','13000000-0000-0000-0000-000000000005','d','Disabling all user inputs',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0006-0000-0000-000000000001','13000000-0000-0000-0000-000000000006','a','Accessing resources without proper authorisation using predictable object references',TRUE),
  ('13000000-0006-0000-0000-000000000002','13000000-0000-0000-0000-000000000006','b','Injecting code into object-oriented programs',FALSE),
  ('13000000-0006-0000-0000-000000000003','13000000-0000-0000-0000-000000000006','c','A reference counting vulnerability in C++ programs',FALSE),
  ('13000000-0006-0000-0000-000000000004','13000000-0000-0000-0000-000000000006','d','Exploiting JavaScript object prototypes',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0007-0000-0000-000000000001','13000000-0000-0000-0000-000000000007','a','Scripts that are executed immediately in the attacker''s browser',FALSE),
  ('13000000-0007-0000-0000-000000000002','13000000-0000-0000-0000-000000000007','b','Malicious scripts that are permanently stored on the server and served to all users',TRUE),
  ('13000000-0007-0000-0000-000000000003','13000000-0000-0000-0000-000000000007','c','Scripts delivered only via crafted URLs',FALSE),
  ('13000000-0007-0000-0000-000000000004','13000000-0000-0000-0000-000000000007','d','Scripts that run only in the browser developer console',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0008-0000-0000-000000000001','13000000-0000-0000-0000-000000000008','a','Content-Security-Policy',FALSE),
  ('13000000-0008-0000-0000-000000000002','13000000-0000-0000-0000-000000000008','b','X-Frame-Options',TRUE),
  ('13000000-0008-0000-0000-000000000003','13000000-0000-0000-0000-000000000008','c','Strict-Transport-Security',FALSE),
  ('13000000-0008-0000-0000-000000000004','13000000-0000-0000-0000-000000000008','d','X-Content-Type-Options',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0009-0000-0000-000000000001','13000000-0000-0000-0000-000000000009','a','To encrypt all web traffic',FALSE),
  ('13000000-0009-0000-0000-000000000002','13000000-0000-0000-0000-000000000009','b','To specify which content sources are allowed to be loaded, mitigating XSS and data injection',TRUE),
  ('13000000-0009-0000-0000-000000000003','13000000-0000-0000-0000-000000000009','c','To enforce HTTPS connections',FALSE),
  ('13000000-0009-0000-0000-000000000004','13000000-0000-0000-0000-000000000009','d','To validate user session tokens',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0010-0000-0000-000000000001','13000000-0000-0000-0000-000000000010','a','Guessing a user''s password',FALSE),
  ('13000000-0010-0000-0000-000000000002','13000000-0000-0000-0000-000000000010','b','Forcing a user to use a session ID known to the attacker, then hijacking the session after login',TRUE),
  ('13000000-0010-0000-0000-000000000003','13000000-0000-0000-0000-000000000010','c','Stealing a cookie from a victim''s browser',FALSE),
  ('13000000-0010-0000-0000-000000000004','13000000-0000-0000-0000-000000000010','d','Modifying a database record to change a session duration',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0011-0000-0000-000000000001','13000000-0000-0000-0000-000000000011','a','Using HTTPS',FALSE),
  ('13000000-0011-0000-0000-000000000002','13000000-0000-0000-0000-000000000011','b','Using anti-CSRF tokens in forms',TRUE),
  ('13000000-0011-0000-0000-000000000003','13000000-0000-0000-0000-000000000011','c','Disabling cookies entirely',FALSE),
  ('13000000-0011-0000-0000-000000000004','13000000-0000-0000-0000-000000000011','d','Using a firewall',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0012-0000-0000-000000000001','13000000-0000-0000-0000-000000000012','a','Slower page load times',FALSE),
  ('13000000-0012-0000-0000-000000000002','13000000-0000-0000-0000-000000000012','b','Attackers being able to compromise user accounts, steal data, or gain elevated privileges',TRUE),
  ('13000000-0012-0000-0000-000000000003','13000000-0000-0000-0000-000000000012','c','Server crashes due to memory errors',FALSE),
  ('13000000-0012-0000-0000-000000000004','13000000-0000-0000-0000-000000000012','d','Only denial of service attacks',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0013-0000-0000-000000000001','13000000-0000-0000-0000-000000000013','a','Using weak encryption algorithms',FALSE),
  ('13000000-0013-0000-0000-000000000002','13000000-0000-0000-0000-000000000013','b','Leaving default credentials, unnecessary features enabled, or improperly configured permissions',TRUE),
  ('13000000-0013-0000-0000-000000000003','13000000-0000-0000-0000-000000000013','c','Storing passwords in plain text',FALSE),
  ('13000000-0013-0000-0000-000000000004','13000000-0000-0000-0000-000000000013','d','Not using input validation',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0014-0000-0000-000000000001','13000000-0000-0000-0000-000000000014','a','It speeds up the website',FALSE),
  ('13000000-0014-0000-0000-000000000002','13000000-0000-0000-0000-000000000014','b','It encrypts data in transit between client and server, preventing eavesdropping',TRUE),
  ('13000000-0014-0000-0000-000000000003','13000000-0000-0000-0000-000000000014','c','It stores data securely on the server',FALSE),
  ('13000000-0014-0000-0000-000000000004','13000000-0000-0000-0000-000000000014','d','It validates all user inputs',FALSE);
INSERT INTO question_options VALUES
  ('13000000-0015-0000-0000-000000000001','13000000-0000-0000-0000-000000000015','a','To improve database query performance',FALSE),
  ('13000000-0015-0000-0000-000000000002','13000000-0000-0000-0000-000000000015','b','To ensure that only expected and safe data is accepted, preventing injection and malformed data attacks',TRUE),
  ('13000000-0015-0000-0000-000000000003','13000000-0000-0000-0000-000000000015','c','To encrypt form data before submission',FALSE),
  ('13000000-0015-0000-0000-000000000004','13000000-0000-0000-0000-000000000015','d','To authenticate users before allowing form access',FALSE);


-- =============================================================================
-- MODULE 4: Cryptography Essentials
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m4, v_course_id, v_admin_id,
  'Cryptography Essentials',
  'Master the fundamentals of cryptography: symmetric vs asymmetric encryption, hashing algorithms, digital signatures, certificates, and PKI. Understand how TLS/SSL, AES, RSA, and SHA work to protect data.',
  'core', TRUE, 4, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m4);
DELETE FROM questions WHERE module_id = v_m4;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('14000000-0000-0000-0000-000000000001', v_m4, 'What is the difference between symmetric and asymmetric encryption?', 'medium', 1),
  ('14000000-0000-0000-0000-000000000002', v_m4, 'Which algorithm is an example of symmetric encryption?', 'easy', 2),
  ('14000000-0000-0000-0000-000000000003', v_m4, 'What is a hash function used for in security?', 'easy', 3),
  ('14000000-0000-0000-0000-000000000004', v_m4, 'What makes MD5 unsuitable for password storage today?', 'medium', 4),
  ('14000000-0000-0000-0000-000000000005', v_m4, 'What is a digital signature?', 'medium', 5),
  ('14000000-0000-0000-0000-000000000006', v_m4, 'What does PKI (Public Key Infrastructure) provide?', 'hard', 6),
  ('14000000-0000-0000-0000-000000000007', v_m4, 'What is "salting" in password hashing?', 'medium', 7),
  ('14000000-0000-0000-0000-000000000008', v_m4, 'RSA encryption is based on which mathematical problem?', 'hard', 8),
  ('14000000-0000-0000-0000-000000000009', v_m4, 'What is end-to-end encryption (E2EE)?', 'medium', 9),
  ('14000000-0000-0000-0000-000000000010', v_m4, 'What does a Certificate Authority (CA) do?', 'medium', 10),
  ('14000000-0000-0000-0000-000000000011', v_m4, 'Which hashing algorithm is considered most secure among the options?', 'medium', 11),
  ('14000000-0000-0000-0000-000000000012', v_m4, 'What is a rainbow table attack?', 'hard', 12),
  ('14000000-0000-0000-0000-000000000013', v_m4, 'What is the purpose of a nonce in cryptography?', 'hard', 13),
  ('14000000-0000-0000-0000-000000000014', v_m4, 'What does "encryption at rest" mean?', 'easy', 14),
  ('14000000-0000-0000-0000-000000000015', v_m4, 'What is the Diffie-Hellman protocol used for?', 'hard', 15);

INSERT INTO question_options VALUES
  ('14000000-0001-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','a','Symmetric is slower; asymmetric is faster',FALSE),
  ('14000000-0001-0000-0000-000000000002','14000000-0000-0000-0000-000000000001','b','Symmetric uses the same key for encryption and decryption; asymmetric uses a public/private key pair',TRUE),
  ('14000000-0001-0000-0000-000000000003','14000000-0000-0000-0000-000000000001','c','Symmetric uses two keys; asymmetric uses one key',FALSE),
  ('14000000-0001-0000-0000-000000000004','14000000-0000-0000-0000-000000000001','d','They are the same with different names',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0002-0000-0000-000000000001','14000000-0000-0000-0000-000000000002','a','RSA',FALSE),
  ('14000000-0002-0000-0000-000000000002','14000000-0000-0000-0000-000000000002','b','AES (Advanced Encryption Standard)',TRUE),
  ('14000000-0002-0000-0000-000000000003','14000000-0000-0000-0000-000000000002','c','ECC (Elliptic Curve Cryptography)',FALSE),
  ('14000000-0002-0000-0000-000000000004','14000000-0000-0000-0000-000000000002','d','Diffie-Hellman',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0003-0000-0000-000000000001','14000000-0000-0000-0000-000000000003','a','Encrypting data for transmission',FALSE),
  ('14000000-0003-0000-0000-000000000002','14000000-0000-0000-0000-000000000003','b','Producing a fixed-size fingerprint of data that cannot be reversed to the original input',TRUE),
  ('14000000-0003-0000-0000-000000000003','14000000-0000-0000-0000-000000000003','c','Generating public/private key pairs',FALSE),
  ('14000000-0003-0000-0000-000000000004','14000000-0000-0000-0000-000000000003','d','Authenticating users',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0004-0000-0000-000000000001','14000000-0000-0000-0000-000000000004','a','It is too slow to compute',FALSE),
  ('14000000-0004-0000-0000-000000000002','14000000-0000-0000-0000-000000000004','b','It produces collision-prone and fast hashes, making brute-force attacks practical',TRUE),
  ('14000000-0004-0000-0000-000000000003','14000000-0000-0000-0000-000000000004','c','It uses too much memory',FALSE),
  ('14000000-0004-0000-0000-000000000004','14000000-0000-0000-0000-000000000004','d','It cannot hash strings longer than 128 characters',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0005-0000-0000-000000000001','14000000-0000-0000-0000-000000000005','a','A method of symmetric encryption',FALSE),
  ('14000000-0005-0000-0000-000000000002','14000000-0000-0000-0000-000000000005','b','A cryptographic mechanism that verifies the authenticity and integrity of a message using the sender''s private key',TRUE),
  ('14000000-0005-0000-0000-000000000003','14000000-0000-0000-0000-000000000005','c','A handwritten signature scanned into a computer',FALSE),
  ('14000000-0005-0000-0000-000000000004','14000000-0000-0000-0000-000000000005','d','A password hashing technique',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0006-0000-0000-000000000001','14000000-0000-0000-0000-000000000006','a','A key generation library',FALSE),
  ('14000000-0006-0000-0000-000000000002','14000000-0000-0000-0000-000000000006','b','A framework for managing digital certificates and public/private key pairs to enable trust',TRUE),
  ('14000000-0006-0000-0000-000000000003','14000000-0000-0000-0000-000000000006','c','A protocol for encrypting email',FALSE),
  ('14000000-0006-0000-0000-000000000004','14000000-0000-0000-0000-000000000006','d','A VPN tunnelling protocol',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0007-0000-0000-000000000001','14000000-0000-0000-0000-000000000007','a','Adding extra bits to extend password length',FALSE),
  ('14000000-0007-0000-0000-000000000002','14000000-0000-0000-0000-000000000007','b','Adding a random value to a password before hashing, making identical passwords produce different hashes',TRUE),
  ('14000000-0007-0000-0000-000000000003','14000000-0000-0000-0000-000000000007','c','Encrypting the hash with a second key',FALSE),
  ('14000000-0007-0000-0000-000000000004','14000000-0000-0000-0000-000000000007','d','Hashing the password multiple times',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0008-0000-0000-000000000001','14000000-0000-0000-0000-000000000008','a','The discrete logarithm problem',FALSE),
  ('14000000-0008-0000-0000-000000000002','14000000-0000-0000-0000-000000000008','b','The difficulty of factoring the product of two large prime numbers',TRUE),
  ('14000000-0008-0000-0000-000000000003','14000000-0000-0000-0000-000000000008','c','The elliptic curve discrete logarithm problem',FALSE),
  ('14000000-0008-0000-0000-000000000004','14000000-0000-0000-0000-000000000008','d','The knapsack problem',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0009-0000-0000-000000000001','14000000-0000-0000-0000-000000000009','a','Data encrypted only on the server side',FALSE),
  ('14000000-0009-0000-0000-000000000002','14000000-0000-0000-0000-000000000009','b','Encryption where only the communicating users can read the messages; intermediaries cannot decrypt',TRUE),
  ('14000000-0009-0000-0000-000000000003','14000000-0000-0000-0000-000000000009','c','Encryption that requires two endpoints to share the same key',FALSE),
  ('14000000-0009-0000-0000-000000000004','14000000-0000-0000-0000-000000000009','d','A protocol for encrypting database connections',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0010-0000-0000-000000000001','14000000-0000-0000-0000-000000000010','a','Generates encryption keys',FALSE),
  ('14000000-0010-0000-0000-000000000002','14000000-0000-0000-0000-000000000010','b','Issues and validates digital certificates, establishing trust between parties',TRUE),
  ('14000000-0010-0000-0000-000000000003','14000000-0000-0000-0000-000000000010','c','Monitors SSL/TLS traffic',FALSE),
  ('14000000-0010-0000-0000-000000000004','14000000-0000-0000-0000-000000000010','d','Revokes expired passwords',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0011-0000-0000-000000000001','14000000-0000-0000-0000-000000000011','a','MD5',FALSE),
  ('14000000-0011-0000-0000-000000000002','14000000-0000-0000-0000-000000000011','b','SHA-1',FALSE),
  ('14000000-0011-0000-0000-000000000003','14000000-0000-0000-0000-000000000011','c','SHA-256',TRUE),
  ('14000000-0011-0000-0000-000000000004','14000000-0000-0000-0000-000000000011','d','CRC32',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0012-0000-0000-000000000001','14000000-0000-0000-0000-000000000012','a','An attack using a table of pre-computed hash values to reverse hashes',TRUE),
  ('14000000-0012-0000-0000-000000000002','14000000-0000-0000-0000-000000000012','b','An attack that tries every possible password combination',FALSE),
  ('14000000-0012-0000-0000-000000000003','14000000-0000-0000-0000-000000000012','c','An attack on rainbow-coloured network packets',FALSE),
  ('14000000-0012-0000-0000-000000000004','14000000-0000-0000-0000-000000000012','d','A side-channel attack on AES encryption',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0013-0000-0000-000000000001','14000000-0000-0000-0000-000000000013','a','A temporary encryption key',FALSE),
  ('14000000-0013-0000-0000-000000000002','14000000-0000-0000-0000-000000000013','b','A random number used once to ensure uniqueness and prevent replay attacks',TRUE),
  ('14000000-0013-0000-0000-000000000003','14000000-0000-0000-0000-000000000013','c','A certificate serial number',FALSE),
  ('14000000-0013-0000-0000-000000000004','14000000-0000-0000-0000-000000000013','d','A type of hash function output',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0014-0000-0000-000000000001','14000000-0000-0000-0000-000000000014','a','Encrypting data while it is being transmitted over a network',FALSE),
  ('14000000-0014-0000-0000-000000000002','14000000-0000-0000-0000-000000000014','b','Encrypting data stored on disk or in a database when not actively being used',TRUE),
  ('14000000-0014-0000-0000-000000000003','14000000-0000-0000-0000-000000000014','c','Encrypting data in computer RAM',FALSE),
  ('14000000-0014-0000-0000-000000000004','14000000-0000-0000-0000-000000000014','d','Encrypting backup tapes only',FALSE);
INSERT INTO question_options VALUES
  ('14000000-0015-0000-0000-000000000001','14000000-0000-0000-0000-000000000015','a','Authenticating users with passwords',FALSE),
  ('14000000-0015-0000-0000-000000000002','14000000-0000-0000-0000-000000000015','b','Securely exchanging cryptographic keys over an insecure channel',TRUE),
  ('14000000-0015-0000-0000-000000000003','14000000-0000-0000-0000-000000000015','c','Generating digital signatures',FALSE),
  ('14000000-0015-0000-0000-000000000004','14000000-0000-0000-0000-000000000015','d','Compressing encrypted data',FALSE);


-- =============================================================================
-- MODULE 5: Social Engineering & Phishing
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m5, v_course_id, v_admin_id,
  'Social Engineering & Phishing',
  'Understand how attackers exploit human psychology rather than technical vulnerabilities. Learn to recognise phishing, spear phishing, vishing, smishing, pretexting, baiting, and tailgating, and how to defend against them.',
  'core', TRUE, 5, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m5);
DELETE FROM questions WHERE module_id = v_m5;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('15000000-0000-0000-0000-000000000001', v_m5, 'What is social engineering in cybersecurity?', 'easy', 1),
  ('15000000-0000-0000-0000-000000000002', v_m5, 'What is phishing?', 'easy', 2),
  ('15000000-0000-0000-0000-000000000003', v_m5, 'What distinguishes spear phishing from regular phishing?', 'medium', 3),
  ('15000000-0000-0000-0000-000000000004', v_m5, 'What is vishing?', 'easy', 4),
  ('15000000-0000-0000-0000-000000000005', v_m5, 'What is pretexting in a social engineering context?', 'medium', 5),
  ('15000000-0000-0000-0000-000000000006', v_m5, 'What is a baiting attack?', 'medium', 6),
  ('15000000-0000-0000-0000-000000000007', v_m5, 'What is tailgating (piggybacking) in physical security?', 'easy', 7),
  ('15000000-0000-0000-0000-000000000008', v_m5, 'Which of the following is a red flag indicator of a phishing email?', 'easy', 8),
  ('15000000-0000-0000-0000-000000000009', v_m5, 'What is a whaling attack?', 'medium', 9),
  ('15000000-0000-0000-0000-000000000010', v_m5, 'What psychological principle do social engineers most commonly exploit?', 'medium', 10),
  ('15000000-0000-0000-0000-000000000011', v_m5, 'What is smishing?', 'easy', 11),
  ('15000000-0000-0000-0000-000000000012', v_m5, 'An attacker calls claiming to be from IT support and asks for your password. This is an example of:', 'medium', 12),
  ('15000000-0000-0000-0000-000000000013', v_m5, 'Which defence is most effective against phishing attacks?', 'medium', 13),
  ('15000000-0000-0000-0000-000000000014', v_m5, 'What is a "watering hole" attack?', 'hard', 14),
  ('15000000-0000-0000-0000-000000000015', v_m5, 'What does "urgency" in a social engineering message typically aim to achieve?', 'medium', 15);

INSERT INTO question_options VALUES
  ('15000000-0001-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','a','Hacking using automated scripts',FALSE),
  ('15000000-0001-0000-0000-000000000002','15000000-0000-0000-0000-000000000001','b','Manipulating people into revealing confidential information or performing actions that compromise security',TRUE),
  ('15000000-0001-0000-0000-000000000003','15000000-0000-0000-0000-000000000001','c','Installing malware on a target computer',FALSE),
  ('15000000-0001-0000-0000-000000000004','15000000-0000-0000-0000-000000000001','d','Breaking encryption using social media data',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0002-0000-0000-000000000001','15000000-0000-0000-0000-000000000002','a','A type of malware that encrypts files',FALSE),
  ('15000000-0002-0000-0000-000000000002','15000000-0000-0000-0000-000000000002','b','Fraudulent attempts to trick users into providing sensitive information via deceptive emails or websites',TRUE),
  ('15000000-0002-0000-0000-000000000003','15000000-0000-0000-0000-000000000002','c','Network packet sniffing',FALSE),
  ('15000000-0002-0000-0000-000000000004','15000000-0000-0000-0000-000000000002','d','A port scanning technique',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0003-0000-0000-000000000001','15000000-0000-0000-0000-000000000003','a','Spear phishing uses email; regular phishing uses phone calls',FALSE),
  ('15000000-0003-0000-0000-000000000002','15000000-0000-0000-0000-000000000003','b','Spear phishing is targeted at a specific individual or organisation using personalised information',TRUE),
  ('15000000-0003-0000-0000-000000000003','15000000-0000-0000-0000-000000000003','c','Regular phishing is more effective than spear phishing',FALSE),
  ('15000000-0003-0000-0000-000000000004','15000000-0000-0000-0000-000000000003','d','Spear phishing only targets government agencies',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0004-0000-0000-000000000001','15000000-0000-0000-0000-000000000004','a','Phishing via SMS messages',FALSE),
  ('15000000-0004-0000-0000-000000000002','15000000-0000-0000-0000-000000000004','b','Phishing conducted over voice calls to manipulate victims into revealing information',TRUE),
  ('15000000-0004-0000-0000-000000000003','15000000-0000-0000-0000-000000000004','c','Phishing using email attachments',FALSE),
  ('15000000-0004-0000-0000-000000000004','15000000-0000-0000-0000-000000000004','d','Phishing targeting VPN users',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0005-0000-0000-000000000001','15000000-0000-0000-0000-000000000005','a','Sending fake bank emails',FALSE),
  ('15000000-0005-0000-0000-000000000002','15000000-0000-0000-0000-000000000005','b','Creating a fabricated scenario to extract information from a target (e.g. pretending to be IT support)',TRUE),
  ('15000000-0005-0000-0000-000000000003','15000000-0000-0000-0000-000000000005','c','Using malware to create a false system context',FALSE),
  ('15000000-0005-0000-0000-000000000004','15000000-0000-0000-0000-000000000005','d','Forging digital signatures',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0006-0000-0000-000000000001','15000000-0000-0000-0000-000000000006','a','Sending excessive amounts of data to crash a system',FALSE),
  ('15000000-0006-0000-0000-000000000002','15000000-0000-0000-0000-000000000006','b','Luring victims with something enticing (e.g. a free USB drive) that installs malware when used',TRUE),
  ('15000000-0006-0000-0000-000000000003','15000000-0000-0000-0000-000000000006','c','Offering fake job advertisements to steal personal data',FALSE),
  ('15000000-0006-0000-0000-000000000004','15000000-0000-0000-0000-000000000006','d','A type of ransomware that offers decryption for payment',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0007-0000-0000-000000000001','15000000-0000-0000-0000-000000000007','a','Phishing attacks via social media',FALSE),
  ('15000000-0007-0000-0000-000000000002','15000000-0000-0000-0000-000000000007','b','Gaining physical access to a restricted area by following an authorised person through a secure door',TRUE),
  ('15000000-0007-0000-0000-000000000003','15000000-0000-0000-0000-000000000007','c','Intercepting wireless network traffic',FALSE),
  ('15000000-0007-0000-0000-000000000004','15000000-0000-0000-0000-000000000007','d','Stealing a user''s credentials from behind their shoulder',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0008-0000-0000-000000000001','15000000-0000-0000-0000-000000000008','a','The email comes from your organisation''s CEO',FALSE),
  ('15000000-0008-0000-0000-000000000002','15000000-0000-0000-0000-000000000008','b','Urgent language demanding immediate action, mismatched URLs, and requests for credentials',TRUE),
  ('15000000-0008-0000-0000-000000000003','15000000-0000-0000-0000-000000000008','c','The email uses your full name in the greeting',FALSE),
  ('15000000-0008-0000-0000-000000000004','15000000-0000-0000-0000-000000000008','d','The email arrives during business hours',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0009-0000-0000-000000000001','15000000-0000-0000-0000-000000000009','a','A phishing attack targeting a large number of random users',FALSE),
  ('15000000-0009-0000-0000-000000000002','15000000-0000-0000-0000-000000000009','b','A highly targeted phishing attack directed at senior executives or high-value individuals',TRUE),
  ('15000000-0009-0000-0000-000000000003','15000000-0000-0000-0000-000000000009','c','An attack that floods a whale-watching company''s servers',FALSE),
  ('15000000-0009-0000-0000-000000000004','15000000-0000-0000-0000-000000000009','d','An attack using large data files to overwhelm email servers',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0010-0000-0000-000000000001','15000000-0000-0000-0000-000000000010','a','Technical complexity',FALSE),
  ('15000000-0010-0000-0000-000000000002','15000000-0000-0000-0000-000000000010','b','Human psychology — authority, urgency, fear, scarcity, and social proof',TRUE),
  ('15000000-0010-0000-0000-000000000003','15000000-0000-0000-0000-000000000010','c','Network vulnerabilities',FALSE),
  ('15000000-0010-0000-0000-000000000004','15000000-0000-0000-0000-000000000010','d','Password weaknesses',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0011-0000-0000-000000000001','15000000-0000-0000-0000-000000000011','a','Phishing via email',FALSE),
  ('15000000-0011-0000-0000-000000000002','15000000-0000-0000-0000-000000000011','b','Phishing conducted via SMS text messages',TRUE),
  ('15000000-0011-0000-0000-000000000003','15000000-0000-0000-0000-000000000011','c','Phishing via phone calls',FALSE),
  ('15000000-0011-0000-0000-000000000004','15000000-0000-0000-0000-000000000011','d','Phishing via social media direct messages',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0012-0000-0000-000000000001','15000000-0000-0000-0000-000000000012','a','Baiting',FALSE),
  ('15000000-0012-0000-0000-000000000002','15000000-0000-0000-0000-000000000012','b','Vishing with pretexting',TRUE),
  ('15000000-0012-0000-0000-000000000003','15000000-0000-0000-0000-000000000012','c','Tailgating',FALSE),
  ('15000000-0012-0000-0000-000000000004','15000000-0000-0000-0000-000000000012','d','Smishing',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0013-0000-0000-000000000001','15000000-0000-0000-0000-000000000013','a','Installing more antivirus software',FALSE),
  ('15000000-0013-0000-0000-000000000002','15000000-0000-0000-0000-000000000013','b','Regular user education and awareness training combined with multi-factor authentication',TRUE),
  ('15000000-0013-0000-0000-000000000003','15000000-0000-0000-0000-000000000013','c','Using stronger email encryption',FALSE),
  ('15000000-0013-0000-0000-000000000004','15000000-0000-0000-0000-000000000013','d','Blocking all external email',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0014-0000-0000-000000000001','15000000-0000-0000-0000-000000000014','a','Flooding a website with traffic',FALSE),
  ('15000000-0014-0000-0000-000000000002','15000000-0000-0000-0000-000000000014','b','Compromising a website frequently visited by the target group to deliver malware to visitors',TRUE),
  ('15000000-0014-0000-0000-000000000003','15000000-0000-0000-0000-000000000014','c','Poisoning a public water supply network',FALSE),
  ('15000000-0014-0000-0000-000000000004','15000000-0000-0000-0000-000000000014','d','An attack targeting IoT devices in smart homes',FALSE);
INSERT INTO question_options VALUES
  ('15000000-0015-0000-0000-000000000001','15000000-0000-0000-0000-000000000015','a','Make the victim more cautious',FALSE),
  ('15000000-0015-0000-0000-000000000002','15000000-0000-0000-0000-000000000015','b','Pressure the victim to act quickly without thinking critically',TRUE),
  ('15000000-0015-0000-0000-000000000003','15000000-0000-0000-0000-000000000015','c','Provide time for verification',FALSE),
  ('15000000-0015-0000-0000-000000000004','15000000-0000-0000-0000-000000000015','d','Allow the attacker more time to execute the attack',FALSE);


-- =============================================================================
-- MODULE 6: Malware & Threat Analysis
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m6, v_course_id, v_admin_id,
  'Malware & Threat Analysis',
  'Understand the different types of malware: viruses, worms, trojans, ransomware, spyware, rootkits, and botnets. Learn how malware spreads, how to analyse threats, and defensive strategies including antivirus, EDR, and sandboxing.',
  'core', TRUE, 6, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m6);
DELETE FROM questions WHERE module_id = v_m6;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('16000000-0000-0000-0000-000000000001', v_m6, 'What is a computer virus?', 'easy', 1),
  ('16000000-0000-0000-0000-000000000002', v_m6, 'What distinguishes a worm from a virus?', 'medium', 2),
  ('16000000-0000-0000-0000-000000000003', v_m6, 'What is a Trojan horse in cybersecurity?', 'easy', 3),
  ('16000000-0000-0000-0000-000000000004', v_m6, 'What does ransomware do?', 'easy', 4),
  ('16000000-0000-0000-0000-000000000005', v_m6, 'What is a rootkit?', 'medium', 5),
  ('16000000-0000-0000-0000-000000000006', v_m6, 'What is spyware?', 'easy', 6),
  ('16000000-0000-0000-0000-000000000007', v_m6, 'What is a botnet?', 'medium', 7),
  ('16000000-0000-0000-0000-000000000008', v_m6, 'What is a keylogger?', 'easy', 8),
  ('16000000-0000-0000-0000-000000000009', v_m6, 'What does an EDR (Endpoint Detection and Response) system do?', 'hard', 9),
  ('16000000-0000-0000-0000-000000000010', v_m6, 'What is sandboxing in malware analysis?', 'hard', 10),
  ('16000000-0000-0000-0000-000000000011', v_m6, 'What is a "fileless" malware attack?', 'hard', 11),
  ('16000000-0000-0000-0000-000000000012', v_m6, 'What is the primary goal of a Command and Control (C2) server in malware operations?', 'hard', 12),
  ('16000000-0000-0000-0000-000000000013', v_m6, 'What is adware?', 'easy', 13),
  ('16000000-0000-0000-0000-000000000014', v_m6, 'Which of the following is a common malware distribution vector?', 'medium', 14),
  ('16000000-0000-0000-0000-000000000015', v_m6, 'What is polymorphic malware?', 'hard', 15);

INSERT INTO question_options VALUES
  ('16000000-0001-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','a','Software that speeds up your computer',FALSE),
  ('16000000-0001-0000-0000-000000000002','16000000-0000-0000-0000-000000000001','b','Malicious code that attaches itself to legitimate programs and replicates when the host is executed',TRUE),
  ('16000000-0001-0000-0000-000000000003','16000000-0000-0000-0000-000000000001','c','A program that encrypts your files for ransom',FALSE),
  ('16000000-0001-0000-0000-000000000004','16000000-0000-0000-0000-000000000001','d','A network attack tool',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0002-0000-0000-000000000001','16000000-0000-0000-0000-000000000002','a','Worms require a host file; viruses self-replicate without one',FALSE),
  ('16000000-0002-0000-0000-000000000002','16000000-0000-0000-0000-000000000002','b','Worms self-replicate and spread across networks without needing a host program',TRUE),
  ('16000000-0002-0000-0000-000000000003','16000000-0000-0000-0000-000000000002','c','Viruses spread over networks; worms require manual copying',FALSE),
  ('16000000-0002-0000-0000-000000000004','16000000-0000-0000-0000-000000000002','d','Worms are less dangerous than viruses',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0003-0000-0000-000000000001','16000000-0000-0000-0000-000000000003','a','A program that replicates itself across networks',FALSE),
  ('16000000-0003-0000-0000-000000000002','16000000-0000-0000-0000-000000000003','b','Malware disguised as legitimate software that creates a backdoor once installed',TRUE),
  ('16000000-0003-0000-0000-000000000003','16000000-0000-0000-0000-000000000003','c','A program that scans for vulnerabilities',FALSE),
  ('16000000-0003-0000-0000-000000000004','16000000-0000-0000-0000-000000000003','d','A security tool for detecting malware',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0004-0000-0000-000000000001','16000000-0000-0000-0000-000000000004','a','Steals login credentials and sends them to attackers',FALSE),
  ('16000000-0004-0000-0000-000000000002','16000000-0000-0000-0000-000000000004','b','Encrypts the victim''s files and demands payment for the decryption key',TRUE),
  ('16000000-0004-0000-0000-000000000003','16000000-0000-0000-0000-000000000004','c','Deletes all files on the system permanently',FALSE),
  ('16000000-0004-0000-0000-000000000004','16000000-0000-0000-0000-000000000004','d','Slows down the computer to make it unusable',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0005-0000-0000-000000000001','16000000-0000-0000-0000-000000000005','a','A program that displays unwanted advertisements',FALSE),
  ('16000000-0005-0000-0000-000000000002','16000000-0000-0000-0000-000000000005','b','Malware designed to conceal itself and other malware from detection by the operating system',TRUE),
  ('16000000-0005-0000-0000-000000000003','16000000-0000-0000-0000-000000000005','c','A legitimate system tool for root access',FALSE),
  ('16000000-0005-0000-0000-000000000004','16000000-0000-0000-0000-000000000005','d','A type of encryption software',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0006-0000-0000-000000000001','16000000-0000-0000-0000-000000000006','a','Malware that replicates and spreads across networks',FALSE),
  ('16000000-0006-0000-0000-000000000002','16000000-0000-0000-0000-000000000006','b','Software that secretly monitors and collects information about a user without their knowledge',TRUE),
  ('16000000-0006-0000-0000-000000000003','16000000-0000-0000-0000-000000000006','c','Software that displays unwanted advertisements',FALSE),
  ('16000000-0006-0000-0000-000000000004','16000000-0000-0000-0000-000000000006','d','A type of firewall bypass tool',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0007-0000-0000-000000000001','16000000-0000-0000-0000-000000000007','a','A network of legitimate computers sharing resources',FALSE),
  ('16000000-0007-0000-0000-000000000002','16000000-0000-0000-0000-000000000007','b','A network of compromised computers (bots) controlled remotely by an attacker for malicious purposes',TRUE),
  ('16000000-0007-0000-0000-000000000003','16000000-0000-0000-0000-000000000007','c','A type of VPN for anonymous browsing',FALSE),
  ('16000000-0007-0000-0000-000000000004','16000000-0000-0000-0000-000000000007','d','A tool for distributing software updates',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0008-0000-0000-000000000001','16000000-0000-0000-0000-000000000008','a','A program that monitors network traffic',FALSE),
  ('16000000-0008-0000-0000-000000000002','16000000-0000-0000-0000-000000000008','b','Malware that secretly records keystrokes to capture passwords and sensitive data',TRUE),
  ('16000000-0008-0000-0000-000000000003','16000000-0000-0000-0000-000000000008','c','A hardware device for connecting keyboards',FALSE),
  ('16000000-0008-0000-0000-000000000004','16000000-0000-0000-0000-000000000008','d','Software for automating keyboard macros',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0009-0000-0000-000000000001','16000000-0000-0000-0000-000000000009','a','Prevents all malware from reaching endpoints',FALSE),
  ('16000000-0009-0000-0000-000000000002','16000000-0000-0000-0000-000000000009','b','Continuously monitors endpoints for suspicious activity and enables rapid investigation and response',TRUE),
  ('16000000-0009-0000-0000-000000000003','16000000-0000-0000-0000-000000000009','c','A cloud-based antivirus scanner',FALSE),
  ('16000000-0009-0000-0000-000000000004','16000000-0000-0000-0000-000000000009','d','An encrypted storage solution for endpoints',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0010-0000-0000-000000000001','16000000-0000-0000-0000-000000000010','a','Encrypting malware before analysis',FALSE),
  ('16000000-0010-0000-0000-000000000002','16000000-0000-0000-0000-000000000010','b','Running suspicious code in an isolated environment to observe its behaviour without risk to the host',TRUE),
  ('16000000-0010-0000-0000-000000000003','16000000-0000-0000-0000-000000000010','c','Storing malware samples in a secure database',FALSE),
  ('16000000-0010-0000-0000-000000000004','16000000-0000-0000-0000-000000000010','d','A physical container for storing malware samples',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0011-0000-0000-000000000001','16000000-0000-0000-0000-000000000011','a','Malware stored in hidden files on disk',FALSE),
  ('16000000-0011-0000-0000-000000000002','16000000-0000-0000-0000-000000000011','b','Malware that operates entirely in memory without writing files to disk, evading file-based detection',TRUE),
  ('16000000-0011-0000-0000-000000000003','16000000-0000-0000-0000-000000000011','c','Malware that deletes itself after execution',FALSE),
  ('16000000-0011-0000-0000-000000000004','16000000-0000-0000-0000-000000000011','d','A virus that infects the master boot record',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0012-0000-0000-000000000001','16000000-0000-0000-0000-000000000012','a','Hosting malware samples for download',FALSE),
  ('16000000-0012-0000-0000-000000000002','16000000-0000-0000-0000-000000000012','b','Receiving data from and issuing instructions to infected machines (bots)',TRUE),
  ('16000000-0012-0000-0000-000000000003','16000000-0000-0000-0000-000000000012','c','Encrypting malware communications',FALSE),
  ('16000000-0012-0000-0000-000000000004','16000000-0000-0000-0000-000000000012','d','Acting as an anonymous proxy for the attacker',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0013-0000-0000-000000000001','16000000-0000-0000-0000-000000000013','a','Software that encrypts user data',FALSE),
  ('16000000-0013-0000-0000-000000000002','16000000-0000-0000-0000-000000000013','b','Software that automatically displays or downloads advertising material, often without consent',TRUE),
  ('16000000-0013-0000-0000-000000000003','16000000-0000-0000-0000-000000000013','c','A type of keylogger',FALSE),
  ('16000000-0013-0000-0000-000000000004','16000000-0000-0000-0000-000000000013','d','A network worm that spreads via ads',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0014-0000-0000-000000000001','16000000-0000-0000-0000-000000000014','a','Only via network vulnerabilities',FALSE),
  ('16000000-0014-0000-0000-000000000002','16000000-0000-0000-0000-000000000014','b','Phishing emails with malicious attachments or links',TRUE),
  ('16000000-0014-0000-0000-000000000003','16000000-0000-0000-0000-000000000014','c','Only via USB drives',FALSE),
  ('16000000-0014-0000-0000-000000000004','16000000-0000-0000-0000-000000000014','d','Exclusively through software vulnerabilities',FALSE);
INSERT INTO question_options VALUES
  ('16000000-0015-0000-0000-000000000001','16000000-0000-0000-0000-000000000015','a','Malware that changes its name to avoid detection',FALSE),
  ('16000000-0015-0000-0000-000000000002','16000000-0000-0000-0000-000000000015','b','Malware that changes its code signature with each infection to evade signature-based detection',TRUE),
  ('16000000-0015-0000-0000-000000000003','16000000-0000-0000-0000-000000000015','c','Malware that only affects multiple platforms',FALSE),
  ('16000000-0015-0000-0000-000000000004','16000000-0000-0000-0000-000000000015','d','A type of ransomware that demands different amounts each time',FALSE);


-- =============================================================================
-- MODULE 7: Ethical Hacking & Penetration Testing
-- =============================================================================
INSERT INTO modules (module_id, course_id, created_by, title, description, module_type, is_locked, order_index, exp_bonus_pct)
VALUES (v_m7, v_course_id, v_admin_id,
  'Ethical Hacking & Penetration Testing',
  'Learn the legal and methodological foundations of ethical hacking. Understand penetration testing phases (reconnaissance, scanning, exploitation, post-exploitation, reporting), common tools (Nmap, Metasploit, Burp Suite), and responsible disclosure.',
  'core', TRUE, 7, 0)
ON CONFLICT (module_id) DO NOTHING;

DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_m7);
DELETE FROM questions WHERE module_id = v_m7;

INSERT INTO questions (question_id, module_id, question_text, difficulty, order_index) VALUES
  ('17000000-0000-0000-0000-000000000001', v_m7, 'What is ethical hacking?', 'easy', 1),
  ('17000000-0000-0000-0000-000000000002', v_m7, 'What is the first phase of a penetration test?', 'easy', 2),
  ('17000000-0000-0000-0000-000000000003', v_m7, 'What document must a penetration tester obtain before starting an engagement?', 'easy', 3),
  ('17000000-0000-0000-0000-000000000004', v_m7, 'What does Nmap primarily do?', 'easy', 4),
  ('17000000-0000-0000-0000-000000000005', v_m7, 'What is the difference between a black-box and white-box pentest?', 'medium', 5),
  ('17000000-0000-0000-0000-000000000006', v_m7, 'What is the purpose of the exploitation phase in a pentest?', 'medium', 6),
  ('17000000-0000-0000-0000-000000000007', v_m7, 'What is Metasploit?', 'medium', 7),
  ('17000000-0000-0000-0000-000000000008', v_m7, 'What is OSINT (Open Source Intelligence)?', 'medium', 8),
  ('17000000-0000-0000-0000-000000000009', v_m7, 'What is a "privilege escalation" attack?', 'hard', 9),
  ('17000000-0000-0000-0000-000000000010', v_m7, 'What does "lateral movement" mean during a pentest?', 'hard', 10),
  ('17000000-0000-0000-0000-000000000011', v_m7, 'What is responsible disclosure?', 'medium', 11),
  ('17000000-0000-0000-0000-000000000012', v_m7, 'What is a "proof of concept" (PoC) in penetration testing?', 'medium', 12),
  ('17000000-0000-0000-0000-000000000013', v_m7, 'What is Burp Suite used for?', 'medium', 13),
  ('17000000-0000-0000-0000-000000000014', v_m7, 'What does CVE stand for?', 'easy', 14),
  ('17000000-0000-0000-0000-000000000015', v_m7, 'What is the purpose of the post-exploitation phase?', 'hard', 15);

INSERT INTO question_options VALUES
  ('17000000-0001-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','a','Hacking for financial gain without permission',FALSE),
  ('17000000-0001-0000-0000-000000000002','17000000-0000-0000-0000-000000000001','b','Authorised testing of systems to find and fix security vulnerabilities before malicious hackers do',TRUE),
  ('17000000-0001-0000-0000-000000000003','17000000-0000-0000-0000-000000000001','c','Hacking only government systems for national security',FALSE),
  ('17000000-0001-0000-0000-000000000004','17000000-0000-0000-0000-000000000001','d','Teaching hacking techniques in a classroom',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0002-0000-0000-000000000001','17000000-0000-0000-0000-000000000002','a','Exploitation',FALSE),
  ('17000000-0002-0000-0000-000000000002','17000000-0000-0000-0000-000000000002','b','Reconnaissance (information gathering)',TRUE),
  ('17000000-0002-0000-0000-000000000003','17000000-0000-0000-0000-000000000002','c','Reporting',FALSE),
  ('17000000-0002-0000-0000-000000000004','17000000-0000-0000-0000-000000000002','d','Scanning',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0003-0000-0000-000000000001','17000000-0000-0000-0000-000000000003','a','A vulnerability disclosure form',FALSE),
  ('17000000-0003-0000-0000-000000000002','17000000-0000-0000-0000-000000000003','b','A written authorisation or "Rules of Engagement" from the system owner',TRUE),
  ('17000000-0003-0000-0000-000000000003','17000000-0000-0000-0000-000000000003','c','A government licence to hack',FALSE),
  ('17000000-0003-0000-0000-000000000004','17000000-0000-0000-0000-000000000003','d','A non-disclosure agreement (NDA) only',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0004-0000-0000-000000000001','17000000-0000-0000-0000-000000000004','a','Decrypts encrypted traffic',FALSE),
  ('17000000-0004-0000-0000-000000000002','17000000-0000-0000-0000-000000000004','b','Performs network discovery and port scanning to map hosts and services',TRUE),
  ('17000000-0004-0000-0000-000000000003','17000000-0000-0000-0000-000000000004','c','Exploits known vulnerabilities automatically',FALSE),
  ('17000000-0004-0000-0000-000000000004','17000000-0000-0000-0000-000000000004','d','Intercepts web application traffic',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0005-0000-0000-000000000001','17000000-0000-0000-0000-000000000005','a','Black-box is illegal; white-box is legal',FALSE),
  ('17000000-0005-0000-0000-000000000002','17000000-0000-0000-0000-000000000005','b','Black-box testers have no prior knowledge of the system; white-box testers have full internal knowledge',TRUE),
  ('17000000-0005-0000-0000-000000000003','17000000-0000-0000-0000-000000000005','c','White-box is done externally; black-box is done internally',FALSE),
  ('17000000-0005-0000-0000-000000000004','17000000-0000-0000-0000-000000000005','d','Black-box uses automated tools only; white-box uses manual techniques',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0006-0000-0000-000000000001','17000000-0000-0000-0000-000000000006','a','Documenting all findings',FALSE),
  ('17000000-0006-0000-0000-000000000002','17000000-0000-0000-0000-000000000006','b','Attempting to exploit identified vulnerabilities to demonstrate their real-world impact',TRUE),
  ('17000000-0006-0000-0000-000000000003','17000000-0000-0000-0000-000000000006','c','Scanning for open ports',FALSE),
  ('17000000-0006-0000-0000-000000000004','17000000-0000-0000-0000-000000000006','d','Gathering public information about the target',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0007-0000-0000-000000000001','17000000-0000-0000-0000-000000000007','a','A password cracking tool',FALSE),
  ('17000000-0007-0000-0000-000000000002','17000000-0000-0000-0000-000000000007','b','An open-source penetration testing framework with exploit modules, payloads, and auxiliary tools',TRUE),
  ('17000000-0007-0000-0000-000000000003','17000000-0000-0000-0000-000000000007','c','A network packet analyser',FALSE),
  ('17000000-0007-0000-0000-000000000004','17000000-0000-0000-0000-000000000007','d','A web application vulnerability scanner only',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0008-0000-0000-000000000001','17000000-0000-0000-0000-000000000008','a','Hacking into government databases',FALSE),
  ('17000000-0008-0000-0000-000000000002','17000000-0000-0000-0000-000000000008','b','Collecting and analysing publicly available information about a target for intelligence purposes',TRUE),
  ('17000000-0008-0000-0000-000000000003','17000000-0000-0000-0000-000000000008','c','Intercepting encrypted communications',FALSE),
  ('17000000-0008-0000-0000-000000000004','17000000-0000-0000-0000-000000000008','d','Deploying malware using open-source tools',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0009-0000-0000-000000000001','17000000-0000-0000-0000-000000000009','a','Moving between systems in a network',FALSE),
  ('17000000-0009-0000-0000-000000000002','17000000-0000-0000-0000-000000000009','b','Gaining higher system permissions than initially obtained by exploiting vulnerabilities or misconfigurations',TRUE),
  ('17000000-0009-0000-0000-000000000003','17000000-0000-0000-0000-000000000009','c','Escalating the scale of a DDoS attack',FALSE),
  ('17000000-0009-0000-0000-000000000004','17000000-0000-0000-0000-000000000009','d','Phishing high-level executives',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0010-0000-0000-000000000001','17000000-0000-0000-0000-000000000010','a','Conducting a second round of reconnaissance',FALSE),
  ('17000000-0010-0000-0000-000000000002','17000000-0000-0000-0000-000000000010','b','Moving through a network from one compromised system to others to expand access',TRUE),
  ('17000000-0010-0000-0000-000000000003','17000000-0000-0000-0000-000000000010','c','Transferring data from one server to another',FALSE),
  ('17000000-0010-0000-0000-000000000004','17000000-0000-0000-0000-000000000010','d','Pivoting from internal to external network attacks',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0011-0000-0000-000000000001','17000000-0000-0000-0000-000000000011','a','Immediately selling vulnerability details to the highest bidder',FALSE),
  ('17000000-0011-0000-0000-000000000002','17000000-0000-0000-0000-000000000011','b','Privately reporting a discovered vulnerability to the affected organisation before public disclosure to allow time for patching',TRUE),
  ('17000000-0011-0000-0000-000000000003','17000000-0000-0000-0000-000000000011','c','Publishing exploits publicly to pressure vendors to fix issues quickly',FALSE),
  ('17000000-0011-0000-0000-000000000004','17000000-0000-0000-0000-000000000011','d','Only disclosing vulnerabilities after they have been exploited',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0012-0000-0000-000000000001','17000000-0000-0000-0000-000000000012','a','A sample report of a completed pentest',FALSE),
  ('17000000-0012-0000-0000-000000000002','17000000-0000-0000-0000-000000000012','b','Demonstrable evidence that a vulnerability can be exploited, without causing harm',TRUE),
  ('17000000-0012-0000-0000-000000000003','17000000-0000-0000-0000-000000000012','c','A theoretical analysis of potential vulnerabilities',FALSE),
  ('17000000-0012-0000-0000-000000000004','17000000-0000-0000-0000-000000000012','d','A cryptographic proof of system integrity',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0013-0000-0000-000000000001','17000000-0000-0000-0000-000000000013','a','Port scanning and network mapping',FALSE),
  ('17000000-0013-0000-0000-000000000002','17000000-0000-0000-0000-000000000013','b','Intercepting, inspecting, and modifying web application traffic for security testing',TRUE),
  ('17000000-0013-0000-0000-000000000003','17000000-0000-0000-0000-000000000013','c','Password cracking via brute force',FALSE),
  ('17000000-0013-0000-0000-000000000004','17000000-0000-0000-0000-000000000013','d','Wireless network analysis',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0014-0000-0000-000000000001','17000000-0000-0000-0000-000000000014','a','Cyber Vulnerability Exploit',FALSE),
  ('17000000-0014-0000-0000-000000000002','17000000-0000-0000-0000-000000000014','b','Common Vulnerabilities and Exposures — a public list of standardised identifiers for known vulnerabilities',TRUE),
  ('17000000-0014-0000-0000-000000000003','17000000-0000-0000-0000-000000000014','c','Critical Vulnerability Enumeration',FALSE),
  ('17000000-0014-0000-0000-000000000004','17000000-0000-0000-0000-000000000014','d','Certified Vulnerability Expert',FALSE);
INSERT INTO question_options VALUES
  ('17000000-0015-0000-0000-000000000001','17000000-0000-0000-0000-000000000015','a','Cleaning up and removing all traces of the test',FALSE),
  ('17000000-0015-0000-0000-000000000002','17000000-0000-0000-0000-000000000015','b','Assessing the depth of compromise, maintaining access for analysis, and demonstrating business impact',TRUE),
  ('17000000-0015-0000-0000-000000000003','17000000-0000-0000-0000-000000000015','c','Writing the final penetration test report',FALSE),
  ('17000000-0015-0000-0000-000000000004','17000000-0000-0000-0000-000000000015','d','Performing additional reconnaissance',FALSE);

-- =============================================================================
-- Done
-- =============================================================================
RAISE NOTICE '7 core modules seeded successfully.';

END $$;
