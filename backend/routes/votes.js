const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// ─── POST /api/vote ────────────────────────────────────────────────────────
// Body: { itemId, choice, sessionId, username? }
//
// Idempotency: UNIQUE(session_id, item_id) + ON CONFLICT DO UPDATE.
// Re-voting updates the existing row; the last vote wins. No double-counting.
router.post('/', (req, res) => {
  const db = getDB();
  const { itemId, choice, sessionId, username } = req.body;

  // Input validation
  if (!itemId || !choice || !sessionId) {
    return res.status(400).json({ error: 'itemId, choice, and sessionId are required' });
  }
  if (!['yes', 'no'].includes(choice)) {
    return res.status(400).json({ error: 'choice must be "yes" or "no"' });
  }
  const id = parseInt(itemId, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'itemId must be a positive integer' });
  }
  if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128) {
    return res.status(400).json({ error: 'sessionId must be a string between 1–128 chars' });
  }
  // username is optional; sanitise if provided
  const safeUsername = (typeof username === 'string' && username.trim().length > 0)
    ? username.trim().slice(0, 64)
    : null;

  // Verify item exists
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare(`
    INSERT INTO votes (session_id, item_id, choice, username, voted_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_id, item_id)
    DO UPDATE SET
      choice   = excluded.choice,
      username = excluded.username,
      voted_at = CURRENT_TIMESTAMP
  `).run(sessionId, id, choice, safeUsername);

  res.json({ success: true, itemId: id, choice, sessionId });
});

// ─── DELETE /api/vote ──────────────────────────────────────────────────────
// Query params: itemId, sessionId
// Removes a single vote — used by the "Undo last swipe" feature.
router.delete('/', (req, res) => {
  const db = getDB();
  const { itemId, sessionId } = req.query;

  if (!itemId || !sessionId) {
    return res.status(400).json({ error: 'itemId and sessionId are required' });
  }
  const id = parseInt(itemId, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'itemId must be a positive integer' });
  }
  if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128) {
    return res.status(400).json({ error: 'sessionId must be a string between 1–128 chars' });
  }

  const result = db.prepare(
    'DELETE FROM votes WHERE session_id = ? AND item_id = ?'
  ).run(sessionId, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Vote not found' });
  }

  res.json({ success: true, itemId: id, sessionId });
});

module.exports = router;
