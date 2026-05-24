require('dotenv').config(); // v2 — profile dropdown, email verification, onboarding guard
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const marketplaceRoutes = require('./routes/marketplace');
const chatRoutes = require('./routes/chat');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'UNite', version: '0.3.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

async function start() {
  try {
    await db.initDB();
  } catch (err) {
    console.error('Database init failed:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`UNite server running on port ${PORT}`);
  });
}

start();
module.exports = app;
