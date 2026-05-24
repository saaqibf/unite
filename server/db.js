const { Pool } = require('pg');

// Creates a connection pool to PostgreSQL using the DATABASE_URL from .env
// Railway provides this URL automatically when PostgreSQL is provisioned
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// Runs a SQL query and returns the result rows — use this everywhere instead of pool directly
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// Creates all database tables if they don't already exist — run once on startup
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      name        VARCHAR(100),
      program     VARCHAR(100),
      year        VARCHAR(20),
      has_car     BOOLEAN DEFAULT false,
      living      VARCHAR(50),
      challenge   VARCHAR(100),
      personality VARCHAR(50),
      interests   TEXT[],
      primary_intent VARCHAR(50),
      needed_courses TEXT[],
      verified    BOOLEAN DEFAULT false,
      verify_token VARCHAR(255),
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(512) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Database tables ready');
}

module.exports = { query, initDB, pool };
