-- =============================================================================
-- CyberShield LMS — Age-Appropriate Questions Seed (v2 — safe upsert)
-- Target audience: Malaysian students aged 10–12
-- Language: Simple English, relatable examples (WhatsApp, WiFi, gaming, passwords)
--
-- SAFE TO RUN on a live DB:
--   - Uses INSERT ... ON CONFLICT DO UPDATE (upsert) for questions + options
--   - Never deletes questions that have attempt history (respects FK constraint)
--   - New questions use fixed UUIDs so re-runs are idempotent
--
-- How to run: Paste into Supabase SQL Editor → Run
-- =============================================================================

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  v_netsec   UUID;
  v_cyberfun UUID;

  -- Fixed UUIDs for Network Security questions (safe to re-run)
  q_ns_01 UUID := 'aa000000-0000-0000-0000-000000000001';
  q_ns_02 UUID := 'aa000000-0000-0000-0000-000000000002';
  q_ns_03 UUID := 'aa000000-0000-0000-0000-000000000003';
  q_ns_04 UUID := 'aa000000-0000-0000-0000-000000000004';
  q_ns_05 UUID := 'aa000000-0000-0000-0000-000000000005';
  q_ns_06 UUID := 'aa000000-0000-0000-0000-000000000006';
  q_ns_07 UUID := 'aa000000-0000-0000-0000-000000000007';
  q_ns_08 UUID := 'aa000000-0000-0000-0000-000000000008';
  q_ns_09 UUID := 'aa000000-0000-0000-0000-000000000009';
  q_ns_10 UUID := 'aa000000-0000-0000-0000-000000000010';
  q_ns_11 UUID := 'aa000000-0000-0000-0000-000000000011';
  q_ns_12 UUID := 'aa000000-0000-0000-0000-000000000012';

  -- Fixed UUIDs for Cybersecurity Fundamentals questions
  q_cf_01 UUID := 'bb000000-0000-0000-0000-000000000001';
  q_cf_02 UUID := 'bb000000-0000-0000-0000-000000000002';
  q_cf_03 UUID := 'bb000000-0000-0000-0000-000000000003';
  q_cf_04 UUID := 'bb000000-0000-0000-0000-000000000004';
  q_cf_05 UUID := 'bb000000-0000-0000-0000-000000000005';
  q_cf_06 UUID := 'bb000000-0000-0000-0000-000000000006';
  q_cf_07 UUID := 'bb000000-0000-0000-0000-000000000007';
  q_cf_08 UUID := 'bb000000-0000-0000-0000-000000000008';
  q_cf_09 UUID := 'bb000000-0000-0000-0000-000000000009';
  q_cf_10 UUID := 'bb000000-0000-0000-0000-000000000010';
  q_cf_11 UUID := 'bb000000-0000-0000-0000-000000000011';
  q_cf_12 UUID := 'bb000000-0000-0000-0000-000000000012';

BEGIN

-- Resolve module IDs by name
SELECT module_id INTO v_netsec   FROM modules WHERE module_name ILIKE '%network security%'   LIMIT 1;
SELECT module_id INTO v_cyberfun FROM modules WHERE module_name ILIKE '%cybersecurity fund%' LIMIT 1;

-- ============================================================================
-- MODULE: Network Security Basics
-- ============================================================================
IF v_netsec IS NOT NULL THEN

  UPDATE modules SET
    description = 'Learn how the internet and WiFi work, how to stay safe online, and what hackers actually do. You will understand passwords, networks, and how to protect yourself.'
  WHERE module_id = v_netsec;

  -- Upsert questions (update text/difficulty/explanation if already exists)
  INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
    (q_ns_01, v_netsec, 'What is a password used for?', 1,
     'A password is like a secret key that only you know. It stops other people from getting into your account.', v_admin_id),
    (q_ns_02, v_netsec, 'You get a WhatsApp message from a stranger saying "Click this link to win a free phone!" What should you do?', 1,
     'Never click links from strangers! This is called a phishing trick — hackers use it to steal your information.', v_admin_id),
    (q_ns_03, v_netsec, 'Which of these is the STRONGEST password?', 2,
     'A strong password mixes capital letters, small letters, numbers, and symbols. "abc123" is very easy to guess!', v_admin_id),
    (q_ns_04, v_netsec, 'Your friend wants to use your school WiFi password. What is the SAFEST thing to do?', 2,
     'Sharing passwords is risky. Ask an adult or teacher instead of sharing your own password.', v_admin_id),
    (q_ns_05, v_netsec, 'What does WiFi let you do?', 1,
     'WiFi lets your device connect to the internet without using a wire. It sends data through the air using radio waves.', v_admin_id),
    (q_ns_06, v_netsec, 'A hacker wants to read your messages. What can STOP them?', 2,
     'Encryption scrambles your messages so only the right person can read them. WhatsApp uses end-to-end encryption.', v_admin_id),
    (q_ns_07, v_netsec, 'Which of these is a sign that a website is SAFE to use?', 2,
     'A website that starts with "https://" has a padlock icon, meaning your data is encrypted and protected.', v_admin_id),
    (q_ns_08, v_netsec, 'You use the same password for your game account AND your email. Why is this risky?', 3,
     'If a hacker gets one password, they can get into ALL your accounts. Always use different passwords!', v_admin_id),
    (q_ns_09, v_netsec, 'What is a firewall?', 3,
     'A firewall is like a guard at a door — it checks what is allowed to enter or leave your computer network.', v_admin_id),
    (q_ns_10, v_netsec, 'A game app asks for your home address and phone number to "verify your account." What should you do?', 2,
     'Legitimate games never need your home address. This is a red flag — tell a parent or teacher immediately.', v_admin_id),
    (q_ns_11, v_netsec, 'What does it mean when a hacker "phishes" someone?', 2,
     'Phishing is when a hacker pretends to be someone you trust (like a friend or a bank) to trick you into giving your password.', v_admin_id),
    (q_ns_12, v_netsec, 'Two-Factor Authentication (2FA) means you need to:', 3,
     '2FA adds a second step when logging in — like a code sent to your phone. Even if someone has your password, they still cannot log in!', v_admin_id)
  ON CONFLICT (question_id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    difficulty    = EXCLUDED.difficulty,
    explanation   = EXCLUDED.explanation;

  -- Upsert options for Network Security questions
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_ns_01,'A','To make your screen look nice',FALSE),
    (q_ns_01,'B','To let only YOU into your account',TRUE),
    (q_ns_01,'C','To make your internet faster',FALSE),
    (q_ns_01,'D','To turn off your phone',FALSE),

    (q_ns_02,'A','Click the link right away!',FALSE),
    (q_ns_02,'B','Share it with all your friends',FALSE),
    (q_ns_02,'C','Ignore it and tell a trusted adult',TRUE),
    (q_ns_02,'D','Reply asking for more details',FALSE),

    (q_ns_03,'A','abc123',FALSE),
    (q_ns_03,'B','myname',FALSE),
    (q_ns_03,'C','12345678',FALSE),
    (q_ns_03,'D','Cy@b3r$h13ld!',TRUE),

    (q_ns_04,'A','Give them the password immediately',FALSE),
    (q_ns_04,'B','Ask a teacher or admin to help your friend',TRUE),
    (q_ns_04,'C','Post the password in the class group chat',FALSE),
    (q_ns_04,'D','Write the password on a piece of paper',FALSE),

    (q_ns_05,'A','Charge your phone battery',FALSE),
    (q_ns_05,'B','Connect your device to the internet without wires',TRUE),
    (q_ns_05,'C','Make your screen brighter',FALSE),
    (q_ns_05,'D','Print documents from your computer',FALSE),

    (q_ns_06,'A','Using a colourful wallpaper',FALSE),
    (q_ns_06,'B','Turning off your screen',FALSE),
    (q_ns_06,'C','Encryption — it scrambles the message',TRUE),
    (q_ns_06,'D','Sending shorter messages',FALSE),

    (q_ns_07,'A','The website has lots of pictures',FALSE),
    (q_ns_07,'B','The website loads very fast',FALSE),
    (q_ns_07,'C','The website has a padlock and starts with https://',TRUE),
    (q_ns_07,'D','The website has bright colours',FALSE),

    (q_ns_08,'A','It is not risky at all',FALSE),
    (q_ns_08,'B','If one account is hacked, all your accounts become unsafe too',TRUE),
    (q_ns_08,'C','It makes logging in faster',FALSE),
    (q_ns_08,'D','It helps you remember your password',FALSE),

    (q_ns_09,'A','A type of antivirus that deletes files',FALSE),
    (q_ns_09,'B','A wall in a server room to prevent fires',FALSE),
    (q_ns_09,'C','A security system that controls what enters or leaves a network',TRUE),
    (q_ns_09,'D','A program that speeds up your internet',FALSE),

    (q_ns_10,'A','Fill in the information — the game needs it',FALSE),
    (q_ns_10,'B','Ask your friend to fill it in for you',FALSE),
    (q_ns_10,'C','Stop and tell a parent or teacher immediately',TRUE),
    (q_ns_10,'D','Give a fake address so it is safe',FALSE),

    (q_ns_11,'A','When a hacker tries to catch real fish using a computer',FALSE),
    (q_ns_11,'B','When someone pretends to be trustworthy to steal your password or data',TRUE),
    (q_ns_11,'C','When your internet connection is very slow',FALSE),
    (q_ns_11,'D','When you forget your password',FALSE),

    (q_ns_12,'A','Have two different email accounts',FALSE),
    (q_ns_12,'B','Log in with two passwords at the same time',FALSE),
    (q_ns_12,'C','Verify with a second step like a phone code after your password',TRUE),
    (q_ns_12,'D','Use two fingers to unlock your phone',FALSE)
  ON CONFLICT (question_id, option_key) DO UPDATE SET
    option_text = EXCLUDED.option_text,
    is_correct  = EXCLUDED.is_correct;

END IF;

-- ============================================================================
-- MODULE: Cybersecurity Fundamentals (if exists)
-- ============================================================================
IF v_cyberfun IS NOT NULL THEN

  UPDATE modules SET
    description = 'Discover what cybersecurity means, why it matters, and how to protect yourself online. Learn simple rules to stay safe when using the internet, apps, and games.'
  WHERE module_id = v_cyberfun;

  INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
    (q_cf_01, v_cyberfun, 'What does "cybersecurity" mean?', 1,
     'Cybersecurity means protecting computers, phones, and the internet from people who want to steal or damage things.', v_admin_id),
    (q_cf_02, v_cyberfun, 'Someone you do not know sends you a friend request on Instagram. What should you do?', 1,
     'Never accept friend requests from strangers. They might be trying to access your personal information.', v_admin_id),
    (q_cf_03, v_cyberfun, 'Which of the following is personal information you should NEVER share online?', 1,
     'Your home address, phone number, school name, and IC number are private. Only share these with trusted adults.', v_admin_id),
    (q_cf_04, v_cyberfun, 'What is the CIA Triad in cybersecurity? (Hint: not the spy agency!)', 3,
     'CIA stands for Confidentiality (keeping secrets), Integrity (keeping things accurate), and Availability (making sure things work when needed).', v_admin_id),
    (q_cf_05, v_cyberfun, 'You downloaded a free game from an unknown website and now your phone is slow with weird ads. What probably happened?', 2,
     'You likely downloaded malware — a bad program hidden inside the game. Always download apps from official stores like Google Play or App Store.', v_admin_id),
    (q_cf_06, v_cyberfun, 'How often should you update your apps and phone software?', 2,
     'Updates fix security problems called vulnerabilities. Always update when you can!', v_admin_id),
    (q_cf_07, v_cyberfun, 'Your email says "Your Grab account is locked! Click here NOW!" but your Grab app is working fine. This is probably:', 2,
     'This is a phishing email — it creates panic so you click without thinking. Always check the real app first.', v_admin_id),
    (q_cf_08, v_cyberfun, 'What is the MAIN reason hackers steal personal data?', 2,
     'Most hackers steal data for money — they sell it, use it to steal money from accounts, or hold it for ransom.', v_admin_id),
    (q_cf_09, v_cyberfun, 'What should you do if you think someone has hacked your account?', 2,
     'Change your password immediately and tell a trusted adult. If it is a school account, tell your teacher.', v_admin_id),
    (q_cf_10, v_cyberfun, 'Which of these habits keeps you SAFEST online?', 1,
     'Using strong unique passwords, not clicking unknown links, and updating software are the best habits for staying safe.', v_admin_id),
    (q_cf_11, v_cyberfun, 'A computer virus is similar to a human virus because:', 3,
     'Just like a human virus spreads from person to person, a computer virus copies itself and spreads to other devices.', v_admin_id),
    (q_cf_12, v_cyberfun, 'What does it mean to "back up" your files?', 2,
     'Backing up means saving a copy of your files somewhere safe (like Google Drive or a USB). If your phone is lost or hacked, you still have your files!', v_admin_id)
  ON CONFLICT (question_id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    difficulty    = EXCLUDED.difficulty,
    explanation   = EXCLUDED.explanation;

  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_cf_01,'A','Learning how to build robots',FALSE),
    (q_cf_01,'B','Protecting computers and the internet from hackers and damage',TRUE),
    (q_cf_01,'C','Writing code for games and apps',FALSE),
    (q_cf_01,'D','Fixing broken computers and phones',FALSE),

    (q_cf_02,'A','Accept it — the more friends the better!',FALSE),
    (q_cf_02,'B','Accept it only if they have a profile picture',FALSE),
    (q_cf_02,'C','Ignore or decline it, and tell a trusted adult',TRUE),
    (q_cf_02,'D','Ask them to send you a voice message first',FALSE),

    (q_cf_03,'A','Your favourite colour',FALSE),
    (q_cf_03,'B','Your favourite food',FALSE),
    (q_cf_03,'C','Your home address and IC number',TRUE),
    (q_cf_03,'D','Your favourite cartoon character',FALSE),

    (q_cf_04,'A','Computers, Internet, Antivirus',FALSE),
    (q_cf_04,'B','Confidentiality, Integrity, Availability',TRUE),
    (q_cf_04,'C','Cybersecurity, Information, Access',FALSE),
    (q_cf_04,'D','Copy, Install, Apply',FALSE),

    (q_cf_05,'A','Your phone needs charging',FALSE),
    (q_cf_05,'B','The WiFi is too slow',FALSE),
    (q_cf_05,'C','You likely have malware from the unknown download',TRUE),
    (q_cf_05,'D','The game has too many graphics',FALSE),

    (q_cf_06,'A','Never — updates can break things',FALSE),
    (q_cf_06,'B','Only when your phone is very old',FALSE),
    (q_cf_06,'C','Regularly — updates fix security problems',TRUE),
    (q_cf_06,'D','Only when a friend tells you to',FALSE),

    (q_cf_07,'A','A real emergency — click the link quickly!',FALSE),
    (q_cf_07,'B','A phishing scam trying to trick you',TRUE),
    (q_cf_07,'C','A Grab promotion for free food',FALSE),
    (q_cf_07,'D','A normal security notification',FALSE),

    (q_cf_08,'A','They are bored and want to cause trouble',FALSE),
    (q_cf_08,'B','To make your computer faster',FALSE),
    (q_cf_08,'C','For money — selling data or stealing from accounts',TRUE),
    (q_cf_08,'D','To help improve security systems',FALSE),

    (q_cf_09,'A','Wait and see if anything bad happens',FALSE),
    (q_cf_09,'B','Delete the app immediately',FALSE),
    (q_cf_09,'C','Change your password and tell a trusted adult',TRUE),
    (q_cf_09,'D','Create a new account with the same password',FALSE),

    (q_cf_10,'A','Only using your phone at night',FALSE),
    (q_cf_10,'B','Using strong passwords, avoiding unknown links, and updating software',TRUE),
    (q_cf_10,'C','Never using social media',FALSE),
    (q_cf_10,'D','Using the same password everywhere so you remember it',FALSE),

    (q_cf_11,'A','Both make you feel sick',FALSE),
    (q_cf_11,'B','Both can only be stopped by a doctor',FALSE),
    (q_cf_11,'C','Both spread and copy themselves to infect more things',TRUE),
    (q_cf_11,'D','Both only attack old computers and old people',FALSE),

    (q_cf_12,'A','Deleting old files to free up space',FALSE),
    (q_cf_12,'B','Saving a copy of your files in a separate safe place',TRUE),
    (q_cf_12,'C','Sharing your files with friends for safekeeping',FALSE),
    (q_cf_12,'D','Printing out all your files on paper',FALSE)
  ON CONFLICT (question_id, option_key) DO UPDATE SET
    option_text = EXCLUDED.option_text,
    is_correct  = EXCLUDED.is_correct;

END IF;

RAISE NOTICE 'Kid-friendly questions seed complete — all upserted safely.';
END $$;
