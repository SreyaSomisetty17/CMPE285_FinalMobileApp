const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// GET /api/items
// Returns all movies, optionally filtered by session_id to show which ones the user has voted on
router.get('/', (req, res) => {
  const db = getDB();
  const { session_id } = req.query;

  let items;
  if (session_id && typeof session_id === 'string' && session_id.length <= 128) {
    // Include the user's vote status for each item
    items = db.prepare(`
      SELECT i.*,
             v.choice AS user_vote
      FROM   items i
      LEFT JOIN votes v ON v.item_id = i.id AND v.session_id = ?
      ORDER BY i.id
    `).all(session_id);
  } else {
    items = db.prepare('SELECT * FROM items ORDER BY id').all();
  }

  res.json({ items, total: items.length });
});

// GET /api/items/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  res.json(item);
});

module.exports = router;
