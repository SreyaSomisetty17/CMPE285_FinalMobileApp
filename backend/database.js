const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'votes.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id        INTEGER PRIMARY KEY,
      title     TEXT    NOT NULL,
      year      INTEGER,
      genre     TEXT,
      tagline   TEXT,
      poster    TEXT,
      backdrop  TEXT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT    NOT NULL,
      item_id    INTEGER NOT NULL,
      choice     TEXT    NOT NULL CHECK (choice IN ('yes', 'no')),
      username   TEXT,
      voted_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (session_id, item_id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE INDEX IF NOT EXISTS idx_votes_item    ON votes(item_id);
    CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
  `);

  // Non-destructive migration: add username column if it doesn't exist yet.
  // Safe to run on a DB created before this column was introduced.
  const cols = db.pragma('table_info(votes)').map(r => r.name);
  if (!cols.includes('username')) {
    db.exec('ALTER TABLE votes ADD COLUMN username TEXT;');
    console.log('Migrated: added username column to votes');
  }

  console.log('Database ready at', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
