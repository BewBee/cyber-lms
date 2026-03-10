-- sql/seeds/seed_demo.sql
-- CyberShield LMS — Demo seed data for development and lecturer demonstration.
-- Creates: 1 admin, 1 teacher, 2 students, 1 course, 1 core module, 1 teacher module,
--          2 questions (with 4 options each, 1 correct), 1 class, 2 enrollments, 3 badges.
-- To run: psql $DATABASE_URL -f sql/seeds/seed_demo.sql
--         OR paste into Supabase SQL Editor.
-- WARNING: Do NOT run in production — uses fixed UUIDs and no auth.uid() binding.

-- ─── Fixed UUIDs for reproducible demo ───────────────────────────────────────
-- Admin
\set admin_id    '00000000-0000-0000-0000-000000000001'
-- Teacher
\set teacher_id  '00000000-0000-0000-0000-000000000002'
-- Students
\set student1_id '00000000-0000-0000-0000-000000000003'
\set student2_id '00000000-0000-0000-0000-000000000004'
-- Course
\set course_id   '10000000-0000-0000-0000-000000000001'
-- Modules
\set core_mod_id '20000000-0000-0000-0000-000000000001'
\set tchr_mod_id '20000000-0000-0000-0000-000000000002'
-- Questions
\set q1_id       '30000000-0000-0000-0000-000000000001'
\set q2_id       '30000000-0000-0000-0000-000000000002'
-- Class
\set class_id    '40000000-0000-0000-0000-000000000001'
-- Badges
\set badge1_id   '50000000-0000-0000-0000-000000000001'
\set badge2_id   '50000000-0000-0000-0000-000000000002'
\set badge3_id   '50000000-0000-0000-0000-000000000003'

-- ─── Users ────────────────────────────────────────────────────────────────────
-- Note: password_hash is NULL because auth is handled by Supabase Auth in production.
-- In dev, create matching Supabase Auth users with these emails, or use the mock login.
INSERT INTO users (id, email, name, role, total_exp, level) VALUES
  (:'admin_id',    'admin@cybershield.dev',    'Admin User',    'admin',   0,   1),
  (:'teacher_id',  'teacher@cybershield.dev',  'Dr. Ada Lovelace', 'teacher', 0, 1),
  (:'student1_id', 'alice@cybershield.dev',    'Alice Chen',    'student', 450, 2),
  (:'student2_id', 'bob@cybershield.dev',      'Bob Martinez',  'student', 120, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Course ───────────────────────────────────────────────────────────────────
INSERT INTO courses (course_id, course_name, description, created_by, is_active) VALUES
  (:'course_id', 'Fundamentals of Cybersecurity',
   'Core concepts in network security, cryptography, and ethical hacking.',
   :'admin_id', TRUE)
ON CONFLICT (course_id) DO NOTHING;

-- ─── Modules ──────────────────────────────────────────────────────────────────
-- Core module (admin-controlled, locked for editing by teachers)
INSERT INTO modules (module_id, course_id, module_name, description, created_by, module_type, is_locked, exp_bonus_percent) VALUES
  (:'core_mod_id', :'course_id',
   'Network Security Basics',
   'Covers OSI model, firewalls, intrusion detection, and common attack vectors.',
   :'admin_id', 'core', TRUE, 0)
ON CONFLICT (module_id) DO NOTHING;

-- Teacher-created module (editable, bonus EXP)
INSERT INTO modules (module_id, course_id, module_name, description, created_by, module_type, is_locked, exp_bonus_percent) VALUES
  (:'tchr_mod_id', :'course_id',
   'Cryptography Fundamentals',
   'Public/private key cryptography, hashing algorithms, and TLS basics.',
   :'teacher_id', 'teacher', FALSE, 20)
ON CONFLICT (module_id) DO NOTHING;

-- ─── Questions & Options ──────────────────────────────────────────────────────
-- Q1: Core module question
INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
  (:'q1_id', :'core_mod_id',
   'Which layer of the OSI model is responsible for end-to-end communication and error recovery?',
   2,
   'The Transport layer (Layer 4) manages end-to-end communication, segmentation, and error recovery via protocols like TCP.',
   :'admin_id')
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO question_options (option_id, question_id, option_key, option_text, is_correct) VALUES
  (gen_random_uuid(), :'q1_id', 'A', 'Network Layer',    FALSE),
  (gen_random_uuid(), :'q1_id', 'B', 'Transport Layer',  TRUE),   -- correct
  (gen_random_uuid(), :'q1_id', 'C', 'Session Layer',    FALSE),
  (gen_random_uuid(), :'q1_id', 'D', 'Application Layer', FALSE)
ON CONFLICT (question_id, option_key) DO NOTHING;

-- Q2: Teacher module question
INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
  (:'q2_id', :'tchr_mod_id',
   'What is the primary purpose of a digital certificate in a PKI (Public Key Infrastructure)?',
   3,
   'A digital certificate binds a public key to an entity''s identity, verified by a Certificate Authority (CA), enabling trust in encrypted communications.',
   :'teacher_id')
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO question_options (option_id, question_id, option_key, option_text, is_correct) VALUES
  (gen_random_uuid(), :'q2_id', 'A', 'To encrypt data using symmetric keys',  FALSE),
  (gen_random_uuid(), :'q2_id', 'B', 'To compress network traffic',            FALSE),
  (gen_random_uuid(), :'q2_id', 'C', 'To bind a public key to an identity and establish trust', TRUE),  -- correct
  (gen_random_uuid(), :'q2_id', 'D', 'To replace passwords in authentication', FALSE)
ON CONFLICT (question_id, option_key) DO NOTHING;

-- ─── Class & Enrollments ──────────────────────────────────────────────────────
INSERT INTO classes (class_id, class_name, teacher_id) VALUES
  (:'class_id', 'CS301 — Applied Network Security', :'teacher_id')
ON CONFLICT (class_id) DO NOTHING;

INSERT INTO enrollments (enrollment_id, class_id, student_id, status) VALUES
  (gen_random_uuid(), :'class_id', :'student1_id', 'approved'),
  (gen_random_uuid(), :'class_id', :'student2_id', 'approved')
ON CONFLICT (class_id, student_id) DO NOTHING;

-- ─── Badges ───────────────────────────────────────────────────────────────────
INSERT INTO badges (badge_id, badge_key, badge_display_name, badge_icon) VALUES
  (:'badge1_id', 'first_mission',     'First Mission',     '/assets/badge-first-mission.svg'),
  (:'badge2_id', 'perfect_strike',    'Perfect Strike',    '/assets/badge-perfect-strike.svg'),
  (:'badge3_id', 'hot_streak',        'Hot Streak',        '/assets/badge-hot-streak.svg')
ON CONFLICT (badge_id) DO NOTHING;

-- Award 'first_mission' badge to Alice (she has completed sessions)
INSERT INTO student_badges (student_id, badge_id) VALUES
  (:'student1_id', :'badge1_id')
ON CONFLICT (student_id, badge_id) DO NOTHING;

-- ─── Verification query ───────────────────────────────────────────────────────
-- Run this after seeding to confirm data integrity:
-- SELECT u.name, u.role, u.total_exp FROM users u ORDER BY u.role, u.name;
-- SELECT m.module_name, m.module_type, COUNT(q.question_id) AS questions
--   FROM modules m LEFT JOIN questions q ON m.module_id = q.module_id GROUP BY m.module_id;
