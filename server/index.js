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
const { initDB, initDb } = require('./db');

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'UNite', version: '0.5.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/**
 * Initialises DB tables and starts the HTTP server.
 */
async function start() {
  try {
    if (typeof initDB === 'function') await initDB();
    if (typeof initDb === 'function') await initDb();
  } catch (err) {
    console.warn('DB init skipped:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`UNite server running on port ${PORT}`);
  });
}

start();
module.exports = app;
