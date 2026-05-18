const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');

const itemsRouter   = require('./routes/items');
const votesRouter   = require('./routes/votes');
const resultsRouter = require('./routes/results');
const matchesRouter = require('./routes/matches');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/items',   itemsRouter);
app.use('/api/vote',    votesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/matches', matchesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global stats — used by the Results header to show "X users voted"
app.get('/api/stats', (req, res) => {
  const { getDB } = require('./database');
  const db = getDB();
  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT session_id) AS unique_users,
      COUNT(*)                   AS total_votes,
      COUNT(CASE WHEN choice = 'yes' THEN 1 END) AS yes_votes
    FROM votes
  `).get();
  res.json(row);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB then start server
initDB();

app.listen(PORT, () => {
  console.log(`🎬 Movie Swipe API running on http://localhost:${PORT}`);
});
