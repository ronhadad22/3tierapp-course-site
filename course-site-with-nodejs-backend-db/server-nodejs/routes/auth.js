const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email');

// Feature flag: control email verification via environment
// Set EMAIL_VERIFICATION_ENABLED=true to enable email verification flow
// Default: disabled (users are verified immediately, no email is sent)
const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED === 'true';


// Signup
router.post('/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing fields' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already exists' });
  const hash = await bcrypt.hash(password, 10);
  let user;
  if (EMAIL_VERIFICATION_ENABLED) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role,
        verified: false,
        verificationToken
      }
    });
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }
    return res.json({ message: 'Signup successful! Please check your email to verify your account.' });
  }
  // Email verification disabled: mark as verified immediately
  user = await prisma.user.create({
    data: {
      email,
      password: hash,
      name,
      role,
      verified: true,
      verificationToken: null,
    }
  });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid verification link.');
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) return res.status(400).send('Invalid or expired verification token.');
  await prisma.user.update({ where: { id: user.id }, data: { verified: true, verificationToken: null } });
  res.send('Email verified! You can now log in.');
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  if (EMAIL_VERIFICATION_ENABLED && !user.verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in.' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;
