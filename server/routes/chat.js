/**
 * Pusher chat API — broadcasts messages AND persists them to PostgreSQL
 * so chat history survives page refreshes and new sessions.
 */

const express = require('express');
const Pusher = require('pusher');
const { saveChatMessage, getChatHistory } = require('../db');

const router = express.Router();

function getPusher() {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return null;
  }
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || 'mt1',
    useTLS: true
  });
}

/**
 * Returns the public Pusher key so the frontend can connect without
 * embedding keys in HTML.
 */
router.get('/config', (req, res) => {
  res.json({
    key: process.env.PUSHER_KEY || '',
    cluster: process.env.PUSHER_CLUSTER || 'mt1'
  });
});

/**
 * Returns up to 50 recent community chat messages in chronological order.
 * Called on page load so returning students see prior conversation.
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const messages = await getChatHistory(limit);
    res.json({ messages });
  } catch (err) {
    console.error('Chat history error:', err);
    res.json({ messages: [] });
  }
});

/**
 * Receives a new chat message, saves it to PostgreSQL, then broadcasts it
 * via Pusher to all connected clients in real time.
 * Messages are persisted so they survive page reloads.
 */
router.post('/message', async (req, res) => {
  try {
    const { text, user, program, year } = req.body;
    if (!text || !user) return res.status(400).json({ error: 'Missing text or user' });

    // 1. Persist to DB (falls back to in-memory if DB unavailable)
    await saveChatMessage({ user_name: user, program: program || '', year: year || '', text });

    // 2. Broadcast via Pusher for real-time delivery
    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger('unite-global-chat', 'new-message', {
        user,
        program: program || 'UCalgary',
        year: year || '',
        text,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

module.exports = router;
