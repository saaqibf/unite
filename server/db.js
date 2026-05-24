/**
 * Database pool and in-memory fallback for marketplace listings.
 */

const { Pool } = require('pg');

let pool = null;
let memoryListings = [];
let memoryThreads = [];

/**
 * Returns true when PostgreSQL DATABASE_URL is configured.
 */
function useDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Initializes PostgreSQL tables when a database is available.
 */
async function initDb() {
  if (!useDatabase()) return;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_threads (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_id VARCHAR(64) NOT NULL,
      buyer_name VARCHAR(120),
      seller_id VARCHAR(64) NOT NULL,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Maps a database row to a listing object for the API.
 */
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

/**
 * Returns all listings from DB or memory store.
 */
async function getAllListings() {
  if (useDatabase()) {
    const { rows } = await pool.query('SELECT * FROM marketplace_listings ORDER BY created_at DESC');
    return rows.map(rowToListing);
  }
  return memoryListings;
}

/**
 * Inserts a listing into DB or memory store.
 */
async function insertListing(data) {
  if (useDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO marketplace_listings
        (seller_id, seller_name, title, description, price, condition, category, meetup_spot, meetup_other, photos, course_tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active') RETURNING *`,
      [
        data.sellerId,
        data.sellerName,
        data.title,
        data.description,
        data.price,
        data.condition,
        data.category,
        data.meetupSpot,
        data.meetupOther || null,
        data.photos || [],
        data.courseTags || []
      ]
    );
    return rowToListing(rows[0]);
  }
  const item = { id: `mem-${Date.now()}`, status: 'active', createdAt: new Date().toISOString(), ...data };
  memoryListings.unshift(item);
  return item;
}

/**
 * Updates listing status to sold.
 */
async function markListingSold(id) {
  if (useDatabase()) {
    await pool.query(`UPDATE marketplace_listings SET status = 'sold' WHERE id = $1`, [id]);
    return;
  }
  memoryListings = memoryListings.map((l) => (String(l.id) === String(id) ? { ...l, status: 'sold' } : l));
}

/**
 * Seeds memory store when empty (no DB).
 */
function seedMemoryIfEmpty(seedFn) {
  if (!useDatabase() && memoryListings.length === 0) {
    memoryListings = seedFn();
  }
}

/**
 * Gets or creates a DM thread for a listing interest.
 */
async function getOrCreateThread(listingId, buyer, sellerId, prefilled) {
  if (useDatabase()) {
    const existing = await pool.query(
      'SELECT * FROM marketplace_threads WHERE listing_id = $1 AND buyer_id = $2',
      [listingId, buyer.id]
    );
    if (existing.rows[0]) {
      return formatThread(existing.rows[0]);
    }
    const messages = [{ from: buyer.id, text: prefilled, at: new Date().toISOString() }];
    const { rows } = await pool.query(
      `INSERT INTO marketplace_threads (listing_id, buyer_id, buyer_name, seller_id, messages)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [listingId, buyer.id, buyer.name, sellerId, JSON.stringify(messages)]
    );
    return formatThread(rows[0]);
  }

  let thread = memoryThreads.find(
    (t) => String(t.listingId) === String(listingId) && String(t.buyerId) === String(buyer.id)
  );
  if (!thread) {
    thread = {
      id: `mem-thread-${Date.now()}`,
      listingId,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId,
      messages: [{ from: buyer.id, text: prefilled, at: new Date().toISOString() }]
    };
    memoryThreads.push(thread);
  }
  return thread;
}

/**
 * Appends a message to a thread by id.
 */
async function appendThreadMessage(threadId, fromId, text) {
  const msg = { from: fromId, text, at: new Date().toISOString() };
  if (useDatabase()) {
    const { rows } = await pool.query('SELECT * FROM marketplace_threads WHERE id = $1', [threadId]);
    if (!rows[0]) return null;
    const messages = rows[0].messages || [];
    messages.push(msg);
    await pool.query('UPDATE marketplace_threads SET messages = $1 WHERE id = $2', [JSON.stringify(messages), threadId]);
    return formatThread({ ...rows[0], messages });
  }
  const thread = memoryThreads.find((t) => String(t.id) === String(threadId));
  if (!thread) return null;
  thread.messages.push(msg);
  return thread;
}

/**
 * Formats a thread database row for JSON responses.
 */
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
  initDb,
  useDatabase,
  getAllListings,
  insertListing,
  markListingSold,
  seedMemoryIfEmpty,
  getOrCreateThread,
  appendThreadMessage
};
