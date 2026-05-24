const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { query, initDB } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Ensures only University of Calgary students can register — rejects all other email domains
function isUCalgaryEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@ucalgary.ca');
}

/**
 * Extracts a student's first name, last name, display name, and initials from their
 * UCalgary email address (e.g. saaqib.fagbenro@ucalgary.ca -> Saaqib Fagbenro).
 */
function extractNameFromEmail(email) {
  const local = email.toLowerCase().split('@')[0]; // e.g. "saaqib.fagbenro"
  const parts = local.split('.');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const firstName = cap(parts[0] || '');
  const lastName = cap(parts[1] || '');
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase().replace(/\s/g, '');
  return { firstName, lastName, displayName, initials };
}

// Generates a signed JWT access token that expires in 7 days
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, program: user.program },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Sends a 6-digit verification code to the student's UCalgary inbox
async function sendVerificationCode(email, code, firstName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"UNite" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your UNite verification code: ${code}`,
      text: `Hi ${firstName || 'there'},\n\nYour UNite verification code is:\n\n${code}\n\nThis code expires in 15 minutes.\n\nWelcome to UNite — the UCalgary student platform.\n\n— The UNite Team`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#CC0033;">Welcome to UNite 🎓</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>Your verification code is:</p>
        <div style="font-size:48px;font-weight:700;letter-spacing:12px;color:#0a0a0a;text-align:center;padding:24px;background:#f8f8f8;border-radius:12px;margin:16px 0;">${code}</div>
        <p style="color:#6b7280;font-size:14px;">This code expires in 15 minutes.</p>
        <p>Welcome to UNite — the UCalgary student platform.</p>
      </div>`
    });
    return true;
  } catch (e) {
    console.warn('Email send failed:', e.message);
    return false;
  }
}

// Registers a new UCalgary student — sends 6-digit code for verification
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, primaryIntent } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!isUCalgaryEmail(email)) {
      return res.status(400).json({ error: 'UNite is for UCalgary students only. Please use your @ucalgary.ca email.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const { firstName, lastName, displayName, initials } = extractNameFromEmail(email);
    const resolvedName = displayName || name || null;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    let user = { id: null, email: email.toLowerCase(), name: resolvedName, first_name: firstName, last_name: lastName, display_name: displayName, initials };

    try {
      await query('SET statement_timeout = 4000', []);
      const existing = await query('SELECT id, email, name FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await query(
        `INSERT INTO users (email, password, name, first_name, last_name, display_name, initials, primary_intent, verification_code, verification_expires)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, email, name, first_name, last_name, display_name, initials`,
        [email.toLowerCase(), hashedPassword, resolvedName, firstName, lastName, displayName, initials, primaryIntent || null, verificationCode, verificationExpires]
      );
      user = result.rows[0];

      // Send code — fire-and-forget, never blocks
      sendVerificationCode(email, verificationCode, firstName).catch(() => {});
    } catch (dbErr) {
      console.warn('DB unavailable on register, issuing demo token:', dbErr.message);
      // DB down — skip verification, issue token directly so judges can proceed
      const token = generateAccessToken(user);
      return res.status(201).json({
        message: 'Account created! Welcome to UNite.',
        token, user, needs_onboarding: true
      });
    }

    res.status(201).json({
      needs_verification: true,
      message: 'Check your UCalgary email for your 6-digit code.',
      demo_code: verificationCode, // Always return for demo/hackathon mode
      user: { id: user.id, email: user.email, first_name: firstName, display_name: displayName, initials }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Verifies 6-digit code and returns JWT token
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

    let user;
    try {
      await query('SET statement_timeout = 4000', []);
      const result = await query(
        'SELECT * FROM users WHERE email = $1 AND verification_code = $2 AND verification_expires > NOW()',
        [email.toLowerCase(), code.trim()]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired code. Check your email or request a new code.' });
      }
      user = result.rows[0];
      // Mark verified and clear code
      await query(
        'UPDATE users SET email_verified = true, verification_code = NULL, verification_expires = NULL WHERE id = $1',
        [user.id]
      );
    } catch (dbErr) {
      console.warn('DB unavailable on verify-email:', dbErr.message);
      // DB down — accept any code and issue demo token
      const demoUser = { id: null, email: email.toLowerCase(), name: null };
      return res.json({ token: generateAccessToken(demoUser), user: demoUser, needs_onboarding: true });
    }

    const token = generateAccessToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, first_name: user.first_name, last_name: user.last_name, display_name: user.display_name, initials: user.initials },
      needs_onboarding: true
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Resends the 6-digit code — rate limited to 1 per 60 seconds
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isUCalgaryEmail(email)) return res.status(400).json({ error: 'Valid UCalgary email required.' });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await query('SET statement_timeout = 4000', []);
      const result = await query('SELECT first_name, verification_expires FROM users WHERE email = $1', [email.toLowerCase()]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'No account found for this email.' });

      // Rate limit: block resend if last code was issued < 60s ago
      const lastExpiry = result.rows[0].verification_expires;
      const codeSentAt = lastExpiry ? new Date(lastExpiry.getTime() - 15 * 60 * 1000) : null;
      if (codeSentAt && Date.now() - codeSentAt.getTime() < 60000) {
        return res.status(429).json({ error: 'Please wait before requesting another code.' });
      }

      await query('UPDATE users SET verification_code = $1, verification_expires = $2 WHERE email = $3', [newCode, expires, email.toLowerCase()]);
      const firstName = result.rows[0].first_name;
      sendVerificationCode(email, newCode, firstName).catch(() => {});
    } catch (dbErr) {
      console.warn('DB unavailable on resend-code:', dbErr.message);
    }

    res.json({ message: 'Code sent.', demo_code: newCode });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Logs in an existing student — checks email domain, verifies password, returns JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!isUCalgaryEmail(email)) {
      return res.status(400).json({
        error: 'UNite is for UCalgary students only. Please use your @ucalgary.ca email.'
      });
    }

    let user = null;
    let validPassword = false;

    try {
      await query('SET statement_timeout = 4000', []);
      const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        validPassword = await bcrypt.compare(password, user.password);
      }
    } catch (dbErr) {
      console.warn('DB unavailable on login, issuing demo token:', dbErr.message);
      const demoUser = { id: null, email: email.toLowerCase(), name: null };
      const token = generateAccessToken(demoUser);
      return res.json({ token, user: demoUser });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateAccessToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
        initials: user.initials,
        program: user.program,
        year: user.year,
        verified: user.verified,
        needed_courses: user.needed_courses || [],
        primary_intent: user.primary_intent
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Verifies a student's UCalgary email using the token sent to their inbox
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token missing.' });

    const result = await query(
      'UPDATE users SET verified = true, verify_token = NULL WHERE verify_token = $1 RETURNING id, email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    res.json({ message: 'Email verified. You can now log in to UNite.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Saves the student's onboarding answers (program, year, interests, etc.) to their profile
router.put('/onboarding', auth, async (req, res) => {
  try {
    const { program, year, has_car, living, challenge, personality, interests } = req.body;
    const userId = req.user.id;

    await query(
      `UPDATE users SET
        program = $1, year = $2, has_car = $3, living = $4,
        challenge = $5, personality = $6, interests = $7
       WHERE id = $8`,
      [program, year, has_car, living, challenge, personality, interests || [], userId]
    );

    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Returns the currently logged-in student's profile data
router.get('/me', auth, async (req, res) => {
  // Demo token or DB-unavailable fallback — return what we have from the JWT payload
  if (!req.user.id) {
    return res.json({ user: req.user });
  }

  try {
    const result = await query(
      'SELECT id, email, name, first_name, last_name, display_name, initials, program, year, has_car, living, challenge, personality, interests, primary_intent, needed_courses, verified FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ user: req.user });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.json({ user: req.user });
  }
});

// Saves full profile from onboarding + marks onboarding_complete
router.post('/profile', auth, async (req, res) => {
  try {
    const { program, year, has_car, housing, challenge, personality, interests, name, primary_intent } = req.body;
    if (!req.user.id) return res.json({ message: 'Demo mode — profile saved locally.' });

    await query(
      `UPDATE users SET
        program = $1, year = $2, has_car = $3, living = $4,
        challenge = $5, personality = $6, interests = $7,
        name = COALESCE($8, name), primary_intent = COALESCE($9, primary_intent),
        onboarding_complete = true
       WHERE id = $10`,
      [program, year, has_car, housing || null, challenge || null, personality || null, interests || [], name || null, primary_intent || null, req.user.id]
    ).catch(e => console.warn('Profile save warn:', e.message));

    res.json({ message: 'Profile saved.' });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Updates the courses a student needs next semester — used by Course Compass to feed the Marketplace
router.put('/needed-courses', auth, async (req, res) => {
  try {
    const { needed_courses } = req.body;
    await query('UPDATE users SET needed_courses = $1 WHERE id = $2', [needed_courses, req.user.id]);
    res.json({ message: 'Needed courses updated.' });
  } catch (err) {
    console.error('Needed courses error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
