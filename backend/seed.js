/**
 * seed.js — Populates the items table with 100 movies.
 * Run with: node seed.js
 *
 * Safe to re-run: uses INSERT OR IGNORE so existing rows are not duplicated.
 */

const { initDB } = require('./database');
const movies = require('./data/movies.json');

function seed() {
  const db = initDB();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO items (id, title, year, genre, tagline, poster)
    VALUES (@id, @title, @year, @genre, @tagline, @poster)
  `);

  const seedMany = db.transaction((items) => {
    let inserted = 0;
    let skipped  = 0;
    for (const item of items) {
      const result = insert.run(item);
      if (result.changes > 0) inserted++;
      else skipped++;
    }
    return { inserted, skipped };
  });

  const { inserted, skipped } = seedMany(movies);

  console.log(`Seeding complete: ${inserted} inserted, ${skipped} already existed.`);
  console.log(`Database now contains ${db.prepare('SELECT COUNT(*) AS c FROM items').get().c} items.`);
  process.exit(0);
}

seed();
