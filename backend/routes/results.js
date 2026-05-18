const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// GET /api/results?sort=loved|divisive|votes&session_id=xxx
// Returns aggregate yes/no counts per item
router.get('/', (req, res) => {
  const db = getDB();
  const { sort = 'loved', session_id } = req.query;

  // Aggregate votes per item, optionally include user's vote
  const sessionClause = (session_id && typeof session_id === 'string' && session_id.length <= 128)
    ? `MAX(CASE WHEN v.session_id = '${session_id.replace(/'/g, "''")}' THEN v.choice END) AS user_vote`
    : `NULL AS user_vote`;

  const rows = db.prepare(`
    SELECT
      i.id,
      i.title,
      i.year,
      i.genre,
      i.tagline,
      i.poster,
      COUNT(CASE WHEN v.choice = 'yes' THEN 1 END) AS yes_count,
      COUNT(CASE WHEN v.choice = 'no'  THEN 1 END) AS no_count,
      COUNT(v.id) AS total_votes,
      ${sessionClause}
    FROM  items i
    LEFT JOIN votes v ON v.item_id = i.id
    GROUP BY i.id
  `).all();

  // Sort results
  let sorted;
  switch (sort) {
    case 'loved':
      // Highest yes-rate, prioritize items with votes, then by total votes as tiebreaker
      sorted = [...rows].sort((a, b) => {
        const rateA = a.total_votes ? a.yes_count / a.total_votes : 0;
        const rateB = b.total_votes ? b.yes_count / b.total_votes : 0;
        
        // First, compare by yes-rate (descending)
        if (Math.abs(rateB - rateA) > 0.0001) {
          return rateB - rateA;
        }
        
        // Tiebreaker: more votes first
        if (b.total_votes !== a.total_votes) {
          return b.total_votes - a.total_votes;
        }
        
        // Final tiebreaker: alphabetical
        return a.title.localeCompare(b.title);
      });
      break;

    case 'divisive': {
      // Closest to 50/50 split, must have at least 2 votes
      sorted = [...rows].sort((a, b) => {
        const distA = a.total_votes >= 2
          ? Math.abs(a.yes_count / a.total_votes - 0.5)
          : 1;
        const distB = b.total_votes >= 2
          ? Math.abs(b.yes_count / b.total_votes - 0.5)
          : 1;
        return distA - distB || b.total_votes - a.total_votes;
      });
      break;
    }

    case 'votes':
      // Most total votes first
      sorted = [...rows].sort((a, b) => b.total_votes - a.total_votes || a.title.localeCompare(b.title));
      break;

    case 'alpha':
      sorted = [...rows].sort((a, b) => a.title.localeCompare(b.title));
      break;

    default:
      sorted = rows;
  }

  // Compute totals for summary stats
  const totalVotes = rows.reduce((s, r) => s + r.total_votes, 0);
  const totalYes   = rows.reduce((s, r) => s + r.yes_count,   0);

  res.json({
    results: sorted,
    meta: { totalItems: rows.length, totalVotes, totalYes, sort }
  });
});

module.exports = router;
