/**
 * Pusher chat API — broadcasts messages to unite-global-chat channel
 */

const express = require('express');
const Pusher = require('pusher');

const router = express.Router();

/**
 * Creates a Pusher client when env credentials are configured.
 */
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
 * Returns the public Pusher key for the frontend (key is safe to expose).
 */
router.get('/config', (req, res) => {
  res.json({
    key: process.env.PUSHER_KEY || '',
    cluster: process.env.PUSHER_CLUSTER || 'mt1'
  });
});

/**
 * Receives a new chat message and broadcasts it to all connected students.
 */
router.post('/message', async (req, res) => {
  try {
    const { text, user, program } = req.body;
    if (!text || !user) return res.status(400).json({ error: 'Missing text or user' });

    const pusher = getPusher();
    if (!pusher) {
      return res.status(503).json({ error: 'Pusher not configured' });
    }

    await pusher.trigger('unite-global-chat', 'new-message', {
      user,
      program: program || 'UCalgary',
      text,
      timestamp: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Pusher error:', err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

module.exports = router;
