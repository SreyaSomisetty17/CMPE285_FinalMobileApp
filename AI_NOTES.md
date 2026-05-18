# AI Collaboration Notes

## Which parts did Claude write end-to-end?

Claude scaffolded the entire project structure, wrote the initial Express routes, SQLite schema, and React component shells in one pass. Specifically:

- **`backend/database.js`** — The WAL-mode SQLite setup and `initDB()` function were written entirely by Claude, including the decision to use `better-sqlite3` (synchronous, no callback hell, great for Express).
- **`backend/routes/votes.js`** — The idempotency strategy (`ON CONFLICT DO UPDATE`) and input validation (checking choice is strictly `'yes'|'no'`, validating sessionId length) came from Claude's first draft with no revision needed.
- **`backend/routes/results.js`** — Initial implementation with sorting logic. Later refined by Claude to improve "Most Loved" sorting with proper yes-rate percentage ranking and tiebreakers.
- **`backend/routes/matches.js`** — Implemented by Claude to provide personalized matches filtered by global approval threshold. Later enhanced to properly sort and filter by threshold value.
- **`frontend/src/components/SwipeCard.jsx`** — The Framer Motion drag-to-vote logic, including deriving `yesOpacity`, `noOpacity`, and `rotate` from `useMotionValue`/`useTransform`, was Claude's design. Reviewed and kept because the physics felt right.
- **`frontend/src/components/ResultsView.jsx`** — Implemented by Claude with four sort options and real-time result display.
- **`frontend/src/components/MatchesView.jsx`** — Implemented by Claude to show personalized matches with dynamic threshold filtering (50%, 60%, 75%, 90%).
- **`backend/data/movies.json`** — The 100-movie dataset including titles, years, genres, taglines, and TMDB poster paths was compiled by Claude.

## Where did I push back or fix Claude's output?

**Concrete example — the results SQL query.** Claude's initial `GET /api/results` query embedded the `session_id` directly into the SQL string using template literals:

```javascript
// Claude's first attempt (unsafe)
const rows = db.prepare(`
  SELECT ..., MAX(CASE WHEN v.session_id = '${session_id}' THEN v.choice END) AS user_vote
  ...
`).all();
```

This is a SQL injection vulnerability — a crafted session ID with a `'` could break the query. I pushed back and asked Claude to fix it. Its second solution parameterized the session_id properly using a separate `JOIN` clause with a bound parameter, which is what ended up in the final code.

**Sorting improvements.** Claude's initial "Most Loved" sorting used a `-1` placeholder for items with zero votes, which created inconsistent ordering. User feedback indicated the sorting wasn't correct. Claude refined it to:
- Rank by yes-rate percentage (highest first)
- Use total vote count as a tiebreaker (more votes = higher rank for same percentage)
- Apply alphabetical ordering as final tiebreaker

Similarly, Claude improved the `MatchesView` to properly sort matches and pending items by yes-rate, ensuring deterministic ranking when threshold changes.

**CardStack optimization.** I also had to review and simplify the `CardStack.jsx` — Claude's first version rendered all 100 cards in the DOM at once (stacked with `display: none`). I redirected it to render only the top 3 cards, which is far better for mobile performance.

## One thing Claude did better than expected

The Framer Motion gesture physics were excellent out of the box. I was prepared to spend an hour tuning the swipe-to-vote threshold, spring-back animation, and card tilt — but Claude's parameterization (`SWIPE_THRESHOLD = 100px`, `dragElastic = 0.9`, spring `stiffness: 300, damping: 25`) produced a card feel that's genuinely satisfying on first try. It also correctly identified that `useTransform` (not `useState`) was the right tool for deriving visual effects from drag position, avoiding unnecessary re-renders.

## One thing Claude did worse than expected

The "tap button triggers swipe" feature. I asked Claude to wire the ✕/♥ buttons to trigger the same `flyOut()` animation on the top card. Claude's first three attempts tried to use `document.querySelector` and DOM events, refs that were incorrect, and finally `useImperativeHandle` — each had bugs. This ended up being the most iterated-on part of the session. The final implementation in `App.jsx` fires a custom DOM event as a pragmatic workaround; a clean solution would require lifting `flyOut` via `useImperativeHandle` on the `SwipeCard` ref, which I noted as a known issue in the README rather than ship broken code.

## Other AI tools used

Only Claude was used for this project. Web search was used independently (not via AI) to verify TMDB image URL format and confirm `better-sqlite3` compatibility with Node 18.
