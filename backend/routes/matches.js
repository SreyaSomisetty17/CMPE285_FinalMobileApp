const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// ─── GET /api/matches ──────────────────────────────────────────────────────
// Query params:
//   session_id  — required, identifies the user
//   threshold   — optional float 0–1, default 0.60 (60% global yes-rate)
//
// Returns items where:
//   1. The current user voted 'yes'
//   2. The global yes-rate is >= threshold  (needs at least 2 total votes)
//
// Items the user said yes to but that haven't reached the threshold yet are
// returned in a separate "pending" list so the UI can show them differently.
router.get('/', (req, res) => {
  const db = getDB();
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string' || session_id.length > 128) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  const rawThreshold = parseFloat(req.query.threshold);
  const threshold = (!isNaN(rawThreshold) && rawThreshold >= 0 && rawThreshold <= 1)
    ? rawThreshold
    : 0.60;

  // Aggregate yes/no counts per item, keep only the user's yes-votes
  const rows = db.prepare(`
    SELECT
      i.id,
      i.title,
      i.year,
      i.genre,
      i.tagline,
      i.poster,
      COUNT(v.id)                                   AS total_votes,
      COUNT(CASE WHEN v.choice = 'yes' THEN 1 END)  AS yes_count,
      COUNT(CASE WHEN v.choice = 'no'  THEN 1 END)  AS no_count,
      MAX(CASE WHEN v.session_id = ? THEN v.choice END) AS user_vote
    FROM  items i
    LEFT JOIN votes v ON v.item_id = i.id
    GROUP BY i.id
    HAVING user_vote = 'yes'
  `).all(session_id);

  const matches = [];
  const pending = [];

  for (const row of rows) {
    const rate = row.total_votes >= 2
      ? row.yes_count / row.total_votes
      : null;

    const item = { ...row, yes_rate: rate };

    if (rate !== null && rate >= threshold) {
      matches.push(item);
    } else {
      pending.push(item);
    }
  }

  // Sort matches and pending by yes_rate descending
  const sortByYesRate = (a, b) => {
    if (a.yes_rate === null && b.yes_rate === null) return 0;
    if (a.yes_rate === null) return 1;
    if (b.yes_rate === null) return -1;
    return b.yes_rate - a.yes_rate;
  };

  matches.sort(sortByYesRate);
  pending.sort(sortByYesRate);

  res.json({
    matches,
    pending,
    threshold,
    meta: {
      matchCount:   matches.length,
      pendingCount: pending.length,
      totalYesVotes: rows.length,
    },
  });
});

module.exports = router;
