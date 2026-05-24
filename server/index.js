require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Allows the server to accept JSON request bodies up to 10MB (needed for transcript text)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sets secure HTTP headers to protect against common web vulnerabilities
app.use(helmet({
  contentSecurityPolicy: false
}));

// Allows frontend (on any origin in dev, restricted in prod) to call the API
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Limits auth endpoints to 20 requests per 15 minutes per IP to block brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});

// Serves all static frontend files (HTML, CSS, JS) from the repo root
app.use(express.static(path.join(__dirname, '..')));

// Mounts API route groups
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', aiRoutes);

// Health check — Railway uses this to confirm the app is alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'UNite', version: '0.1.0' });
});

// Catches any route not matched above and serves index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`UNite server running on port ${PORT}`);
});

module.exports = app;
