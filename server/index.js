/**
 * UNite Express server — static files and marketplace API
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const marketplaceRoutes = require('./routes/marketplace');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;
const root = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(root));

app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'unite' });
});

/**
 * Starts the HTTP server after optional database init.
 */
async function start() {
  try {
    await db.initDb();
  } catch (err) {
    console.warn('DB init skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`UNite server running on port ${PORT}`);
  });
}

start();
