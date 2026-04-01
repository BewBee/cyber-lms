-- =============================================================================
-- CyberShield LMS — Age-Appropriate Questions Seed
-- Target audience: Malaysian students aged 10–12
-- Language: Simple English, relatable examples (WhatsApp, WiFi, gaming, passwords)
--
-- This seed REPLACES all questions in core modules with kid-friendly versions.
-- Run AFTER 001_schema.sql, seed_demo.sql, and campaign_seed.sql.
-- Safe to re-run — deletes existing questions first, then reinserts.
--
-- How to run: Paste into Supabase SQL Editor → Run
-- =============================================================================

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';

  -- Look up module IDs by name (works even if UUIDs differ between environments)
  v_netsec   UUID;
  v_cyberfun UUID;
  v_social   UUID;
  v_malware  UUID;
BEGIN

-- Resolve module IDs by name
SELECT module_id INTO v_netsec   FROM modules WHERE module_name ILIKE '%network security%'   LIMIT 1;
SELECT module_id INTO v_cyberfun FROM modules WHERE module_name ILIKE '%cybersecurity fund%' LIMIT 1;
SELECT module_id INTO v_social   FROM modules WHERE module_name ILIKE '%social%'              LIMIT 1;
SELECT module_id INTO v_malware  FROM modules WHERE module_name ILIKE '%malware%'             LIMIT 1;

-- ============================================================================
-- MODULE: Network Security Basics  (kid-friendly rewrite)
-- ============================================================================
IF v_netsec IS NOT NULL THEN

  -- Update module description to kid-friendly language
  UPDATE modules SET
    description = 'Learn how the internet and WiFi work, how to stay safe online, and what hackers actually do. You will understand passwords, networks, and how to protect yourself.'
  WHERE module_id = v_netsec;

  -- Wipe old questions
  DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_netsec);
  DELETE FROM questions WHERE module_id = v_netsec;

  -- Insert 12 kid-friendly questions
  INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
    (gen_random_uuid(), v_netsec, 'What is a password used for?', 1,
     'A password is like a secret key that only you know. It stops other people from getting into your account.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'You get a WhatsApp message from a stranger saying "Click this link to win a free phone!" What should you do?', 1,
     'Never click links from strangers! This is called a phishing trick — hackers use it to steal your information.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'Which of these is the STRONGEST password?', 2,
     'A strong password mixes capital letters, small letters, numbers, and symbols. "abc123" is very easy to guess!', v_admin_id),
    (gen_random_uuid(), v_netsec, 'Your friend wants to use your school WiFi password. What is the SAFEST thing to do?', 2,
     'Sharing passwords is risky. Ask an adult or teacher instead of sharing your own password.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'What does "WiFi" let you do?', 1,
     'WiFi lets your device connect to the internet without using a wire. It sends data through the air using radio waves.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'A hacker wants to read your messages. What can STOP them?', 2,
     'Encryption scrambles your messages so only the right person can read them. WhatsApp uses end-to-end encryption.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'Which of these is a sign that a website might be SAFE?', 2,
     'A website that starts with "https://" has a padlock icon, meaning your data is encrypted and protected.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'You use the same password for your game account AND your email. Why is this RISKY?', 3,
     'If a hacker gets one password, they can get into ALL your accounts. Always use different passwords!', v_admin_id),
    (gen_random_uuid(), v_netsec, 'What is a firewall?', 3,
     'A firewall is like a guard at a door — it checks what is allowed to enter or leave your computer network.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'Your game asks for your home address and phone number to "verify your account." What should you do?', 2,
     'Legitimate games never need your home address. This is a red flag — tell a parent or teacher immediately.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'What does it mean when a hacker "phishes" someone?', 2,
     'Phishing is when a hacker pretends to be someone you trust (like a friend or a bank) to trick you into giving your password.', v_admin_id),
    (gen_random_uuid(), v_netsec, 'Two-Factor Authentication (2FA) means:', 3,
     '2FA adds a second step when logging in — like a code sent to your phone. Even if someone has your password, they still cannot log in!', v_admin_id);

  -- Now insert options for each question (we need the question IDs)
  -- Q1: What is a password used for?
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE 'What is a password%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'To make your screen look nice', FALSE),
    ((SELECT question_id FROM q), 'B', 'To let only YOU into your account', TRUE),
    ((SELECT question_id FROM q), 'C', 'To make your internet faster', FALSE),
    ((SELECT question_id FROM q), 'D', 'To turn off your phone', FALSE);

  -- Q2: WhatsApp phishing
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%free phone%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Click the link right away!', FALSE),
    ((SELECT question_id FROM q), 'B', 'Share it with all your friends', FALSE),
    ((SELECT question_id FROM q), 'C', 'Ignore it and tell a trusted adult', TRUE),
    ((SELECT question_id FROM q), 'D', 'Reply asking for more details', FALSE);

  -- Q3: Strongest password
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%STRONGEST password%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'abc123', FALSE),
    ((SELECT question_id FROM q), 'B', 'myname', FALSE),
    ((SELECT question_id FROM q), 'C', '12345678', FALSE),
    ((SELECT question_id FROM q), 'D', 'Cy@b3r$h13ld!', TRUE);

  -- Q4: WiFi password sharing
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%school WiFi password%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Give them the password immediately', FALSE),
    ((SELECT question_id FROM q), 'B', 'Ask a teacher or admin to help your friend', TRUE),
    ((SELECT question_id FROM q), 'C', 'Post the password in the class group chat', FALSE),
    ((SELECT question_id FROM q), 'D', 'Write the password on a piece of paper', FALSE);

  -- Q5: What does WiFi do
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%What does%WiFi%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Charge your phone battery', FALSE),
    ((SELECT question_id FROM q), 'B', 'Connect your device to the internet without wires', TRUE),
    ((SELECT question_id FROM q), 'C', 'Make your screen brighter', FALSE),
    ((SELECT question_id FROM q), 'D', 'Print documents from your computer', FALSE);

  -- Q6: What can stop a hacker reading messages
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%hacker wants to read%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Using a colourful wallpaper', FALSE),
    ((SELECT question_id FROM q), 'B', 'Turning off your screen', FALSE),
    ((SELECT question_id FROM q), 'C', 'Encryption — it scrambles the message', TRUE),
    ((SELECT question_id FROM q), 'D', 'Sending shorter messages', FALSE);

  -- Q7: Safe website sign
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%website might be SAFE%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'The website has lots of pictures', FALSE),
    ((SELECT question_id FROM q), 'B', 'The website loads very fast', FALSE),
    ((SELECT question_id FROM q), 'C', 'The website has a padlock and starts with https://', TRUE),
    ((SELECT question_id FROM q), 'D', 'The website has bright colours', FALSE);

  -- Q8: Same password risk
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%same password%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'It is not risky at all', FALSE),
    ((SELECT question_id FROM q), 'B', 'If one account is hacked, all your accounts become unsafe too', TRUE),
    ((SELECT question_id FROM q), 'C', 'It makes logging in faster', FALSE),
    ((SELECT question_id FROM q), 'D', 'It helps you remember your password', FALSE);

  -- Q9: What is a firewall
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%What is a firewall%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'A type of antivirus software that deletes files', FALSE),
    ((SELECT question_id FROM q), 'B', 'A wall in a server room to prevent fires', FALSE),
    ((SELECT question_id FROM q), 'C', 'A security system that controls what enters or leaves a network', TRUE),
    ((SELECT question_id FROM q), 'D', 'A program that speeds up your internet', FALSE);

  -- Q10: Game asking for address
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%home address and phone%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Fill in the information — the game needs it', FALSE),
    ((SELECT question_id FROM q), 'B', 'Ask your friend to fill it in for you', FALSE),
    ((SELECT question_id FROM q), 'C', 'Stop and tell a parent or teacher immediately', TRUE),
    ((SELECT question_id FROM q), 'D', 'Give a fake address so it is safe', FALSE);

  -- Q11: Phishing meaning
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%phishes%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'When a hacker tries to catch real fish using a computer', FALSE),
    ((SELECT question_id FROM q), 'B', 'When someone pretends to be trustworthy to steal your password or data', TRUE),
    ((SELECT question_id FROM q), 'C', 'When your internet connection is very slow', FALSE),
    ((SELECT question_id FROM q), 'D', 'When you forget your password', FALSE);

  -- Q12: 2FA meaning
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_netsec AND question_text LIKE '%Two-Factor%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Having two different email accounts', FALSE),
    ((SELECT question_id FROM q), 'B', 'Logging in with two passwords at the same time', FALSE),
    ((SELECT question_id FROM q), 'C', 'A second security check (like a phone code) after your password', TRUE),
    ((SELECT question_id FROM q), 'D', 'Using two fingers to unlock your phone', FALSE);

END IF;

-- ============================================================================
-- MODULE: Cybersecurity Fundamentals (if exists)
-- ============================================================================
IF v_cyberfun IS NOT NULL THEN

  UPDATE modules SET
    description = 'Discover what cybersecurity means, why it matters, and how to protect yourself online. Learn simple rules to stay safe when using the internet, apps, and games.'
  WHERE module_id = v_cyberfun;

  DELETE FROM question_options WHERE question_id IN (SELECT question_id FROM questions WHERE module_id = v_cyberfun);
  DELETE FROM questions WHERE module_id = v_cyberfun;

  INSERT INTO questions (question_id, module_id, question_text, difficulty, explanation, created_by) VALUES
    (gen_random_uuid(), v_cyberfun, 'What does "cybersecurity" mean?', 1,
     'Cybersecurity means protecting computers, phones, and the internet from people who want to steal or damage things.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'Someone you do not know sends you a friend request on Instagram. What should you do?', 1,
     'Never accept friend requests from strangers. They might be trying to access your personal information.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'Which of the following is personal information you should NEVER share online?', 1,
     'Your home address, phone number, school name, and IC number are private. Only share these with trusted adults.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'What is the CIA Triad in cybersecurity? (Hint: not the spy agency!)', 3,
     'CIA stands for Confidentiality (keeping secrets), Integrity (keeping things accurate), and Availability (making sure things work when needed).', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'You downloaded a free game from an unknown website and now your phone is slow and showing weird ads. What probably happened?', 2,
     'You likely downloaded malware — a bad program hidden inside the game. Always download apps from official stores like Google Play or App Store.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'How often should you update your apps and phone software?', 2,
     'Updates fix security problems (called vulnerabilities). Always update when you can!', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'Your email says "Your Grab account is locked! Click here NOW!" but you check and your Grab app is fine. This is probably:', 2,
     'This is a phishing email — it creates panic so you click without thinking. Always check the real app first.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'What is the MAIN reason hackers steal personal data?', 2,
     'Most hackers steal data for money — they sell it, use it to steal money from accounts, or hold it for ransom.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'What should you do if you think someone has hacked your account?', 2,
     'Change your password immediately and tell a trusted adult. If it is a school account, tell your teacher.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'Which of these habits helps keep you SAFEST online?', 1,
     'Using strong unique passwords, not clicking unknown links, and updating software regularly are the best habits for staying safe.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'A "virus" on a computer is similar to a virus that makes humans sick because:', 3,
     'Just like a human virus spreads from person to person, a computer virus copies itself and spreads to other devices.', v_admin_id),
    (gen_random_uuid(), v_cyberfun, 'What does it mean to "back up" your files?', 2,
     'Backing up means saving a copy of your files somewhere else (like Google Drive or a USB). If your phone is lost or hacked, you still have your files!', v_admin_id);

  -- Options for Cybersecurity Fundamentals questions
  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%What does "cybersecurity" mean%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Learning how to build robots', FALSE),
    ((SELECT question_id FROM q), 'B', 'Protecting computers and the internet from hackers and damage', TRUE),
    ((SELECT question_id FROM q), 'C', 'Writing code for games and apps', FALSE),
    ((SELECT question_id FROM q), 'D', 'Fixing broken computers and phones', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%friend request on Instagram%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Accept it — the more friends the better!', FALSE),
    ((SELECT question_id FROM q), 'B', 'Accept it only if they have a profile picture', FALSE),
    ((SELECT question_id FROM q), 'C', 'Ignore or decline it, and tell a trusted adult', TRUE),
    ((SELECT question_id FROM q), 'D', 'Ask them to send you a voice message first', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%NEVER share online%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Your favourite colour', FALSE),
    ((SELECT question_id FROM q), 'B', 'Your favourite food', FALSE),
    ((SELECT question_id FROM q), 'C', 'Your home address and IC number', TRUE),
    ((SELECT question_id FROM q), 'D', 'Your favourite cartoon character', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%CIA Triad%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Computers, Internet, Antivirus', FALSE),
    ((SELECT question_id FROM q), 'B', 'Confidentiality, Integrity, Availability', TRUE),
    ((SELECT question_id FROM q), 'C', 'Cybersecurity, Information, Access', FALSE),
    ((SELECT question_id FROM q), 'D', 'Copy, Install, Apply', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%slow and showing weird ads%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Your phone needs charging', FALSE),
    ((SELECT question_id FROM q), 'B', 'The WiFi is too slow', FALSE),
    ((SELECT question_id FROM q), 'C', 'You likely have malware from the unknown download', TRUE),
    ((SELECT question_id FROM q), 'D', 'The game has too many graphics', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%How often should you update%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Never — updates can break things', FALSE),
    ((SELECT question_id FROM q), 'B', 'Only when your phone is very old', FALSE),
    ((SELECT question_id FROM q), 'C', 'Regularly — updates fix security problems', TRUE),
    ((SELECT question_id FROM q), 'D', 'Only when a friend tells you to', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%Grab account is locked%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'A real emergency — click the link quickly!', FALSE),
    ((SELECT question_id FROM q), 'B', 'A phishing scam trying to trick you', TRUE),
    ((SELECT question_id FROM q), 'C', 'A Grab promotion for free food', FALSE),
    ((SELECT question_id FROM q), 'D', 'A normal security notification', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%MAIN reason hackers steal%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'They are bored and want to cause trouble', FALSE),
    ((SELECT question_id FROM q), 'B', 'To make your computer faster', FALSE),
    ((SELECT question_id FROM q), 'C', 'For money — selling data or stealing from accounts', TRUE),
    ((SELECT question_id FROM q), 'D', 'To help improve security systems', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%someone has hacked your account%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Wait and see if anything bad happens', FALSE),
    ((SELECT question_id FROM q), 'B', 'Delete the app immediately', FALSE),
    ((SELECT question_id FROM q), 'C', 'Change your password and tell a trusted adult', TRUE),
    ((SELECT question_id FROM q), 'D', 'Create a new account with the same password', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%habits helps keep you SAFEST%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Only using your phone at night', FALSE),
    ((SELECT question_id FROM q), 'B', 'Using strong passwords, avoiding unknown links, and updating software', TRUE),
    ((SELECT question_id FROM q), 'C', 'Never using social media', FALSE),
    ((SELECT question_id FROM q), 'D', 'Using the same password everywhere so you remember it', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%virus%similar to a virus that makes humans%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Both make you feel sick', FALSE),
    ((SELECT question_id FROM q), 'B', 'Both can only be stopped by a doctor', FALSE),
    ((SELECT question_id FROM q), 'C', 'Both spread and copy themselves to infect more things', TRUE),
    ((SELECT question_id FROM q), 'D', 'Both only attack old computers and old people', FALSE);

  WITH q AS (SELECT question_id FROM questions WHERE module_id = v_cyberfun AND question_text LIKE '%back up%your files%' LIMIT 1)
  INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES
    ((SELECT question_id FROM q), 'A', 'Deleting old files to free up space', FALSE),
    ((SELECT question_id FROM q), 'B', 'Saving a copy of your files in a separate safe place', TRUE),
    ((SELECT question_id FROM q), 'C', 'Sharing your files with friends for safekeeping', FALSE),
    ((SELECT question_id FROM q), 'D', 'Printing out all your files on paper', FALSE);

END IF;

RAISE NOTICE 'Kid-friendly questions seed complete.';
END $$;
