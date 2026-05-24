/**
 * UNite Express server — static files, auth, AI, and marketplace APIs
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const marketplaceRoutes = require('./routes/marketplace');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const root = path.join(__dirname, '..');

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

app.use(express.static(root));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'unite', status: 'ok' });
});

/**
 * Starts the HTTP server after optional database init.
 */
async function start() {
  try {
    if (db.initDB) {
      await db.initDB();
    }
    if (db.initDb) {
      await db.initDb();
    }
  } catch (err) {
    console.warn('DB init skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`UNite server running on port ${PORT}`);
  });
}

start();

module.exports = app;
