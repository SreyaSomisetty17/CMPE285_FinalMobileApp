# CineSwipe 🎬

A mobile-first swipe-to-vote web app where users decide: **watch** or **skip** 100 iconic films. Swipe right to add a film to your watchlist, left to skip it. Pull down (or tap Results) to see how the world voted.

**[🎥 Watch the Demo on YouTube](https://youtu.be/YKYe8Vpz0Vk)**

**[AI Collaboration Notes](AI_NOTES.md)** — placeholder for AI-assisted decisions, review notes, and handoff context.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install & seed the backend

```bash
cd backend
npm install
npm run seed        # Populates the SQLite database with 100 movies
npm start           # Starts API server on http://localhost:3001
```

### 2. Start the frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev         # Opens http://localhost:5173
```

Open **http://localhost:5173** in a mobile browser or use DevTools → responsive mode at 390×844 (iPhone 14).

---

## Architecture

**Backend** — `backend/server.js` is a small Express.js server (Node 18) with the main voting API plus health/stat helper endpoints:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/items?session_id=` | List all 100 movies; optionally annotates each with the user's prior vote |
| GET | `/api/items/:id` | Fetch one movie by ID |
| POST | `/api/vote` | Record `{ itemId, choice, sessionId }` |
| DELETE | `/api/vote?itemId=&sessionId=` | Undo a vote (pull-down gesture on card) |
| GET | `/api/results?sort=&session_id=` | Aggregate yes/no counts per film, four sort orders: `loved`, `divisive`, `votes`, `alpha` |
| GET | `/api/matches?session_id=&threshold=` | Personalized matches: films user voted yes on with global approval ≥ threshold (0.5–0.9) |
| GET | `/api/stats` | Global totals used by the Results header |
| GET | `/api/health` | Basic API health check |

Persistence uses **SQLite** via `better-sqlite3`. SQLite was chosen because it requires zero infrastructure, is embedded in the process, has WAL mode for concurrent reads, and is more than sufficient for a local demo with hundreds of users. The database file lives at `backend/data/votes.db` and is gitignored.

**Idempotency / dedup:** The `votes` table has a `UNIQUE(session_id, item_id)` constraint. Inserts use `ON CONFLICT DO UPDATE`, so re-voting on the same item replaces rather than double-counts the vote. The last vote wins, which is the expected UX (undo via re-swipe).

**Frontend** — Vite + React 18. State is managed with `useState`/`useEffect`; no external state manager is needed at this scale. Card animations use **Framer Motion** `useMotionValue` / `useTransform` to derive rotation, tint overlays, and WATCH/SKIP stamp opacity directly from the drag position — all GPU-composited transforms with no layout thrash. A `sessionId` UUID is generated on first visit and stored in `localStorage`; it is sent with every vote request so the server can track per-user state. Three main views:
  - **CardStack** — Swipeable deck of movies with drag physics and undo
  - **ResultsView** — Global aggregate results with four sort orders (Most Loved, Most Divisive, Most Voted, A–Z)
  - **MatchesView** — Personal recommendations filtered by global approval threshold

**Vite proxy** (`/api → http://localhost:3001`) means the frontend never needs CORS headers during development; both `fetch('/api/items')` and the server live on different ports but behave as same-origin.

---

## AI Notes

Use [`AI_NOTES.md`](AI_NOTES.md) as the visible placeholder for AI contribution notes, review decisions, prompts worth remembering, and future cleanup ideas.

---

## Requirements Checklist

### Core (Section 3.1)
- [x] **Theme documented** — 100 best/most-popular films (see `backend/data/movies.json`)
- [x] **100+ items** — exactly 100 movies with TMDB poster images, title, year, genre, and tagline
- [x] **Swipe card interface** — drag right → yes (WATCH), drag left → no (SKIP)
- [x] **Visual feedback** — card tilt, green/red tint overlay, WATCH/SKIP stamps that appear proportionally to drag distance
- [x] **Yes/No buttons** — tap ✕ or ♥ buttons below the deck
- [x] **Results view** — global aggregate yes/no counts, accessible via tab or pull-down swipe
- [x] **Sort/filter** — 4 sort modes: Most Loved, Most Divisive, Most Voted, A–Z
- [x] **Backend persistence** — votes stored in SQLite, aggregate across all users
- [x] **Dedup** — UNIQUE constraint + ON CONFLICT UPDATE (last-vote-wins)
- [x] **End-of-deck state** — "You've seen them all" screen with personal stats + link to global results

### Stretch (Section 3.2)
- [x] **User identity** — anonymous session ID (UUID) stored in localStorage, persists across reloads
- [x] **Undo last swipe** — pull down on card or use mobile pull-down gesture to undo
- [x] **Matches view** — personal matches with dynamic threshold filtering (50%, 60%, 75%, 90%)
- [x] **Fresh results on demand** — results/stats reload when the Results view opens or sort changes; matches refilter on threshold change
- [x] **Admin/seed script** — seed.js populates SQLite with 100 movies; adding items requires editing movies.json + re-running seed
- [ ] Analytics — not implemented

---

## Data Sources

Movie metadata (titles, years, genres, taglines) compiled from public knowledge of widely-known films. Poster images served from the TMDB image CDN (`image.tmdb.org/t/p/w500/`) — publicly accessible, no API key required for image retrieval. Fallback images from Unsplash for any broken URLs.

---

## Latest Updates (May 2026)

- **Improved "Most Loved" sorting** — Movies now ranked by yes-rate percentage first, with total vote count as tiebreaker for proper consensus ranking
- **Enhanced "Matches" view** — Personal matches now properly filter and sort by global approval threshold; movies reorder correctly when threshold changes
- **Better sorting stability** — All four sort modes (loved, divisive, votes, alpha) now include consistent tiebreakers to ensure deterministic ranking

---

## Known Issues / Trade-offs

- **No auth beyond session ID** — a user can clear localStorage to reset their deck. For a real product, you'd want server-side session expiry or account login.
- **TMDB image CDN** — if a poster URL is slightly wrong, the `onError` handler shows a cinema-themed Unsplash fallback seamlessly.
- **Tap buttons don't trigger swipe animation** — the ✕/♥ buttons call `flyOut()` on the card component ideally via a `ref`; the current implementation fires a custom DOM event as a workaround. A cleaner approach would lift the `flyOut` callback via `useImperativeHandle`.
- **No pagination on results** — all 100 rows render at once. Fine at this scale; for 1000+ items, add virtual scrolling.
- **SQLite in-process** — concurrent write contention is not an issue for a local demo, but in production you'd use Postgres.
