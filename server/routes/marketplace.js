/**
 * Marketplace API — listings, upload, interest threads, sold status
 */

const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { auth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const CAMPUS_SPOTS = [
  'MacHall',
  'TFDL',
  'Science Theatres',
  'ICT Building',
  'Engineering Building',
  'Residence',
  'Foothills Campus'
];

/**
 * Configures Cloudinary when env credentials are present.
 */
function configureCloudinary() {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return true;
  }
  return false;
}

/**
 * Filters listings by query parameters from the browse UI.
 */
function filterListings(listings, query) {
  let result = listings.slice();
  const q = (query.q || '').toLowerCase();
  if (q) {
    result = result.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(q));
  }
  if (query.category) result = result.filter((item) => item.category === query.category);
  if (query.condition) result = result.filter((item) => item.condition === query.condition);
  if (query.meetup) result = result.filter((item) => item.meetupSpot === query.meetup);
  if (query.minPrice) result = result.filter((item) => Number(item.price) >= Number(query.minPrice));
  if (query.maxPrice) result = result.filter((item) => Number(item.price) <= Number(query.maxPrice));
  if (query.campusOnly === 'true') {
    result = result.filter((item) => CAMPUS_SPOTS.includes(item.meetupSpot));
  }
  return result;
}

/**
 * Returns demo seed listings for first-run memory store.
 */
function getSeedListings() {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-1',
      sellerId: 'seed-sarah',
      sellerName: 'Sarah C.',
      title: 'CPSC 331 — Algorithm Design Textbook',
      description: '4th edition, light highlighting.',
      price: 85,
      condition: 'Good',
      category: 'Textbooks',
      meetupSpot: 'TFDL',
      photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop'],
      courseTags: ['CPSC 331'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-2',
      sellerId: 'seed-marcus',
      sellerName: 'Marcus T.',
      title: 'MATH 271 — Calculus II Bundle',
      description: 'Textbook + solution manual.',
      price: 60,
      condition: 'Like New',
      category: 'Textbooks',
      meetupSpot: 'Science Theatres',
      photos: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop'],
      courseTags: ['MATH 271'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-3',
      sellerId: 'seed-priya',
      sellerName: 'Priya K.',
      title: 'USB-C Laptop Charger 65W',
      description: 'Works with most laptops.',
      price: 25,
      condition: 'Like New',
      category: 'Electronics',
      meetupSpot: 'MacHall',
      photos: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-4',
      sellerId: 'seed-alex',
      sellerName: 'Alex M.',
      title: 'IKEA Desk + Chair',
      description: 'Moving out of residence.',
      price: 120,
      condition: 'Good',
      category: 'Furniture',
      meetupSpot: 'Residence',
      photos: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-5',
      sellerId: 'seed-jordan',
      sellerName: 'Jordan L.',
      title: 'Intermediate Hockey Stick',
      description: 'Right-handed, intramurals.',
      price: 45,
      condition: 'Good',
      category: 'Sports',
      meetupSpot: 'ICT Building',
      photos: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-6',
      sellerId: 'seed-taylor',
      sellerName: 'Taylor R.',
      title: 'Winter Parka — Men\'s M',
      description: 'Warm, clean.',
      price: 55,
      condition: 'Good',
      category: 'Clothing',
      meetupSpot: 'Engineering Building',
      photos: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    }
  ];
}

db.seedMemoryIfEmpty(getSeedListings);
configureCloudinary();

router.get('/listings', auth, async (req, res) => {
  try {
    const all = await db.getAllListings();
    const listings = filterListings(all, req.query);
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/listings', auth, async (req, res) => {
  try {
    const { title, description, price, condition, category, meetupSpot, meetupOther, photos } = req.body;
    if (!title || price == null || !meetupSpot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const listing = await db.insertListing({
      sellerId: req.user.id,
      sellerName: req.user.name,
      title,
      description: description || '',
      price,
      condition,
      category,
      meetupSpot,
      meetupOther,
      photos: photos || [],
      courseTags: []
    });
    res.status(201).json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/listings/:id/sold', auth, async (req, res) => {
  try {
    await db.markListingSold(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/listings/:id/interest', auth, async (req, res) => {
  try {
    const all = await db.getAllListings();
    const listing = all.find((l) => String(l.id) === String(req.params.id));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const meetup = listing.meetupSpot === 'Other' && listing.meetupOther ? listing.meetupOther : listing.meetupSpot;
    const prefilled =
      req.body.message ||
      `Hey! I am interested in your ${listing.title}. When can we meet at ${meetup}?`;
    const thread = await db.getOrCreateThread(listing.id, req.user, listing.sellerId, prefilled);
    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/threads/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message required' });
    const thread = await db.appendThreadMessage(req.params.id, req.user.id, text);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!configureCloudinary()) {
      return res.status(503).json({ error: 'Cloudinary not configured' });
    }
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'unite-marketplace' }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
