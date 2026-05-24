const { Pool } = require('pg');

let pool = null;

// In-memory fallback stores for when DATABASE_URL is not configured
let memoryListings = [];
let memoryThreads = [];

function useDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!pool && useDatabase()) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 10
    });
  }
  return pool;
}

// General-purpose query helper — used by auth and AI routes
async function query(text, params) {
  const result = await getPool().query(text, params);
  return result;
}

// Creates all tables on first boot — user tables (Pair A) + marketplace tables (Pair B)
async function initDB() {
  if (!useDatabase()) {
    console.log('No DATABASE_URL — running with in-memory store');
    return;
  }
  const p = getPool();

  await p.query(`
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

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      seller_id VARCHAR(64) NOT NULL,
      seller_name VARCHAR(120) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      condition VARCHAR(32),
      category VARCHAR(64),
      meetup_spot VARCHAR(64),
      meetup_other TEXT,
      photos JSONB DEFAULT '[]',
      course_tags JSONB DEFAULT '[]',
      status VARCHAR(16) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marketplace_threads (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_id VARCHAR(64) NOT NULL,
      buyer_name VARCHAR(120),
      seller_id VARCHAR(64) NOT NULL,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database tables ready');
}

// ─── Marketplace helpers (Pair B) ───────────────────────────────────────

function rowToListing(row) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    condition: row.condition,
    category: row.category,
    meetupSpot: row.meetup_spot,
    meetupOther: row.meetup_other,
    photos: row.photos || [],
    courseTags: row.course_tags || [],
    status: row.status,
    createdAt: row.created_at
  };
}

async function getAllListings() {
  if (useDatabase()) {
    const { rows } = await getPool().query('SELECT * FROM marketplace_listings ORDER BY created_at DESC');
    return rows.map(rowToListing);
  }
  return memoryListings;
}

async function insertListing(data) {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `INSERT INTO marketplace_listings
        (seller_id, seller_name, title, description, price, condition, category, meetup_spot, meetup_other, photos, course_tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active') RETURNING *`,
      [data.sellerId, data.sellerName, data.title, data.description, data.price,
       data.condition, data.category, data.meetupSpot, data.meetupOther || null,
       data.photos || [], data.courseTags || []]
    );
    return rowToListing(rows[0]);
  }
  const item = { id: `mem-${Date.now()}`, status: 'active', createdAt: new Date().toISOString(), ...data };
  memoryListings.unshift(item);
  return item;
}

async function markListingSold(id) {
  if (useDatabase()) {
    await getPool().query(`UPDATE marketplace_listings SET status = 'sold' WHERE id = $1`, [id]);
    return;
  }
  memoryListings = memoryListings.map(l => String(l.id) === String(id) ? { ...l, status: 'sold' } : l);
}

function seedMemoryIfEmpty(seedFn) {
  if (!useDatabase() && memoryListings.length === 0) {
    memoryListings = seedFn();
  }
}

async function getOrCreateThread(listingId, buyer, sellerId, prefilled) {
  if (useDatabase()) {
    const existing = await getPool().query(
      'SELECT * FROM marketplace_threads WHERE listing_id = $1 AND buyer_id = $2',
      [listingId, buyer.id]
    );
    if (existing.rows[0]) return formatThread(existing.rows[0]);
    const messages = [{ from: buyer.id, text: prefilled, at: new Date().toISOString() }];
    const { rows } = await getPool().query(
      `INSERT INTO marketplace_threads (listing_id, buyer_id, buyer_name, seller_id, messages)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [listingId, buyer.id, buyer.name, sellerId, JSON.stringify(messages)]
    );
    return formatThread(rows[0]);
  }
  let thread = memoryThreads.find(t => String(t.listingId) === String(listingId) && String(t.buyerId) === String(buyer.id));
  if (!thread) {
    thread = {
      id: `mem-thread-${Date.now()}`, listingId, buyerId: buyer.id,
      buyerName: buyer.name, sellerId,
      messages: [{ from: buyer.id, text: prefilled, at: new Date().toISOString() }]
    };
    memoryThreads.push(thread);
  }
  return thread;
}

async function appendThreadMessage(threadId, fromId, text) {
  const msg = { from: fromId, text, at: new Date().toISOString() };
  if (useDatabase()) {
    const { rows } = await getPool().query('SELECT * FROM marketplace_threads WHERE id = $1', [threadId]);
    if (!rows[0]) return null;
    const messages = rows[0].messages || [];
    messages.push(msg);
    await getPool().query('UPDATE marketplace_threads SET messages = $1 WHERE id = $2', [JSON.stringify(messages), threadId]);
    return formatThread({ ...rows[0], messages });
  }
  const thread = memoryThreads.find(t => String(t.id) === String(threadId));
  if (!thread) return null;
  thread.messages.push(msg);
  return thread;
}

function formatThread(row) {
  return {
    id: row.id,
    listingId: row.listing_id || row.listingId,
    buyerId: row.buyer_id || row.buyerId,
    buyerName: row.buyer_name || row.buyerName,
    sellerId: row.seller_id || row.sellerId,
    messages: row.messages || []
  };
}

module.exports = {
  query, initDB, getPool,
  useDatabase, getAllListings, insertListing, markListingSold,
  seedMemoryIfEmpty, getOrCreateThread, appendThreadMessage
};
