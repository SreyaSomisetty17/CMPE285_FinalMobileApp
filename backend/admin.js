#!/usr/bin/env node
/**
 * admin.js — CineSwipe admin CLI
 * Add, list, and import movies without touching any source code.
 *
 * Usage:
 *   node admin.js add                      # interactive prompt
 *   node admin.js add --title "..." --year 2024 --genre "Sci-Fi" \
 *                     --tagline "..." --poster "https://..."
 *   node admin.js import <path/to/file.json>   # bulk import from JSON array
 *   node admin.js list                     # print all movies in the DB
 *   node admin.js delete <id>              # remove a movie by ID
 *   node admin.js stats                    # vote statistics summary
 */

const readline = require('readline');
const path     = require('path');
const fs       = require('fs');
const { initDB, getDB } = require('./database');

// ─── Helpers ────────────────────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return args;
}

function printTable(rows) {
  if (rows.length === 0) { console.log('  (no rows)'); return; }
  const cols = Object.keys(rows[0]);
  const widths = cols.map(c =>
    Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length))
  );
  const line = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const header = cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join('│');
  console.log('┌' + line.replace(/┼/g, '┬') + '┐');
  console.log('│' + header + '│');
  console.log('├' + line + '┤');
  for (const row of rows) {
    const cells = cols.map((c, i) => ` ${String(row[c] ?? '').padEnd(widths[i])} `).join('│');
    console.log('│' + cells + '│');
  }
  console.log('└' + line.replace(/┼/g, '┴') + '┘');
}

function nextId(db) {
  const row = db.prepare('SELECT MAX(id) AS m FROM items').get();
  return (row.m ?? 0) + 1;
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdAdd(flags) {
  const db = getDB();
  let { title, year, genre, tagline, poster } = flags;

  // If any required field is missing, fall into interactive mode
  const needsPrompt = !title || !year || !genre || !tagline || !poster;

  if (needsPrompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n🎬  Add a new movie\n');
    title   = title   || await prompt(rl, '  Title        : ');
    year    = year    || await prompt(rl, '  Year         : ');
    genre   = genre   || await prompt(rl, '  Genre        : ');
    tagline = tagline || await prompt(rl, '  Tagline      : ');
    poster  = poster  || await prompt(rl, '  Poster URL   : ');
    rl.close();
  }

  // Validate
  const yearInt = parseInt(year, 10);
  if (!title || !title.trim())         { console.error('Error: title is required');       process.exit(1); }
  if (isNaN(yearInt))                  { console.error('Error: year must be a number');   process.exit(1); }
  if (!genre || !genre.trim())         { console.error('Error: genre is required');       process.exit(1); }

  const id = nextId(db);

  db.prepare(`
    INSERT INTO items (id, title, year, genre, tagline, poster)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title.trim(), yearInt, genre.trim(), (tagline || '').trim(), (poster || '').trim());

  console.log(`\n✓ Added: [${id}] ${title.trim()} (${yearInt})`);
}

function cmdList() {
  const db = getDB();
  const rows = db.prepare(
    'SELECT id, title, year, genre FROM items ORDER BY id'
  ).all();
  console.log(`\n🎬  Movies in database (${rows.length} total)\n`);
  printTable(rows);
}

function cmdImport(filePath) {
  const db = getDB();

  if (!filePath) {
    console.error('Usage: node admin.js import <path/to/movies.json>');
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  let movies;
  try {
    movies = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (e) {
    console.error(`Could not parse JSON: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(movies)) {
    console.error('JSON file must contain an array of movie objects');
    process.exit(1);
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO items (id, title, year, genre, tagline, poster)
    VALUES (@id, @title, @year, @genre, @tagline, @poster)
  `);

  const importMany = db.transaction(items => {
    let inserted = 0, skipped = 0;
    let autoId = nextId(db);
    for (const item of items) {
      // Auto-assign ID if not provided
      const row = {
        id:      item.id      ?? autoId++,
        title:   item.title   ?? '(untitled)',
        year:    item.year    ?? null,
        genre:   item.genre   ?? null,
        tagline: item.tagline ?? null,
        poster:  item.poster  ?? null,
      };
      const r = insert.run(row);
      r.changes > 0 ? inserted++ : skipped++;
    }
    return { inserted, skipped };
  });

  const { inserted, skipped } = importMany(movies);
  console.log(`\n✓ Import complete: ${inserted} added, ${skipped} already existed.`);
  console.log(`  Database now has ${db.prepare('SELECT COUNT(*) AS c FROM items').get().c} movies.`);
}

function cmdDelete(id) {
  const db = getDB();
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) { console.error('Usage: node admin.js delete <id>'); process.exit(1); }

  const item = db.prepare('SELECT title FROM items WHERE id = ?').get(itemId);
  if (!item) { console.error(`No movie found with id ${itemId}`); process.exit(1); }

  // Also delete its votes (cascaded manually since PRAGMA foreign_keys is ON but
  // the child table references items; we delete votes first to avoid FK violation)
  db.prepare('DELETE FROM votes WHERE item_id = ?').run(itemId);
  db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
  console.log(`✓ Deleted: [${itemId}] ${item.title}`);
}

function cmdStats() {
  const db = getDB();

  const totals = db.prepare(`
    SELECT
      COUNT(DISTINCT session_id) AS unique_users,
      COUNT(*)                   AS total_votes,
      COUNT(CASE WHEN choice = 'yes' THEN 1 END) AS yes_votes,
      COUNT(CASE WHEN choice = 'no'  THEN 1 END) AS no_votes
    FROM votes
  `).get();

  const topYes = db.prepare(`
    SELECT i.title,
           COUNT(*) AS votes,
           ROUND(COUNT(CASE WHEN v.choice='yes' THEN 1 END) * 100.0 / COUNT(*), 1) AS yes_pct
    FROM votes v JOIN items i ON i.id = v.item_id
    GROUP BY v.item_id
    HAVING votes >= 1
    ORDER BY yes_pct DESC
    LIMIT 5
  `).all();

  console.log('\n📊  CineSwipe Stats\n');
  printTable([totals]);
  console.log('\n  🏆 Top 5 Most Loved:\n');
  printTable(topYes);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  initDB();

  const [,, cmd, ...rest] = process.argv;
  const flags = parseArgs(rest);

  switch (cmd) {
    case 'add':
      await cmdAdd(flags);
      break;
    case 'list':
      cmdList();
      break;
    case 'import':
      cmdImport(rest[0]);
      break;
    case 'delete':
      cmdDelete(rest[0]);
      break;
    case 'stats':
      cmdStats();
      break;
    default:
      console.log(`
CineSwipe Admin CLI

  Commands:
    node admin.js add                         Interactive add
    node admin.js add --title "..." --year 2024 --genre "Drama" \\
                      --tagline "..." --poster "https://..."
    node admin.js import <file.json>          Bulk import from JSON array
    node admin.js list                        List all movies
    node admin.js delete <id>                 Remove a movie by ID
    node admin.js stats                       Vote statistics
      `);
  }
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
