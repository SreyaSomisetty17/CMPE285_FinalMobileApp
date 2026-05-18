import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMatches } from '../api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&h=180&fit=crop&auto=format';

const THRESHOLDS = [
  { value: 0.5,  label: '50%+' },
  { value: 0.6,  label: '60%+' },
  { value: 0.75, label: '75%+' },
  { value: 0.9,  label: '90%+' },
];

function MatchCard({ item, rank, isPending }) {
  const [imgSrc, setImgSrc] = useState(item.poster || FALLBACK_IMG);
  const pct = item.yes_rate !== null ? Math.round(item.yes_rate * 100) : null;

  return (
    <motion.div
      className={`match-card ${isPending ? 'match-pending' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: rank * 0.04, duration: 0.25 }}
    >
      <img
        className="match-poster"
        src={imgSrc}
        alt={item.title}
        onError={() => setImgSrc(FALLBACK_IMG)}
      />
      <div className="match-info">
        <div className="match-header">
          <span className="match-title">{item.title}</span>
          <span className="match-year">{item.year}</span>
        </div>
        <span className="match-genre">{item.genre}</span>

        {pct !== null ? (
          <div className="match-bar-row">
            <div className="match-bar">
              <div className="match-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="match-pct">{pct}% love it</span>
          </div>
        ) : (
          <span className="match-no-data">Not enough votes yet</span>
        )}
      </div>

      {!isPending && (
        <div className="match-badge">✓ Match</div>
      )}

      <style>{`
        .match-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .match-card.match-pending { opacity: 0.55; }
        .match-poster {
          width: 52px; height: 78px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
          background: var(--surface2);
        }
        .match-info {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .match-header {
          display: flex; align-items: baseline; gap: 6px;
        }
        .match-title {
          font-size: 0.9rem; font-weight: 700; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .match-year { font-size: 0.72rem; color: var(--text-muted); flex-shrink: 0; }
        .match-genre {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: var(--accent);
        }
        .match-bar-row { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
        .match-bar {
          flex: 1; height: 5px; background: var(--surface2);
          border-radius: 3px; overflow: hidden;
        }
        .match-bar-fill {
          height: 100%; background: var(--yes); border-radius: 3px;
          transition: width 0.5s ease;
        }
        .match-pct { font-size: 0.7rem; color: var(--yes); font-weight: 600; white-space: nowrap; }
        .match-no-data { font-size: 0.72rem; color: var(--text-muted); }
        .match-badge {
          position: absolute; right: 14px; top: 12px;
          font-size: 0.65rem; font-weight: 800;
          background: var(--yes-glow); color: var(--yes);
          padding: 3px 8px; border-radius: 20px;
        }
      `}</style>
    </motion.div>
  );
}

export default function MatchesView({ sessionId }) {
  const [threshold, setThreshold] = useState(0.60);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMatches(sessionId, t);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(threshold); }, [threshold, load]);

  const totalYes = data ? (data.matches.length + data.pending.length) : 0;

  return (
    <div className="matches-view">
      {/* Header */}
      <div className="matches-header">
        <div>
          <h1 className="matches-title">Your Matches</h1>
          <p className="matches-sub">
            {data
              ? `${data.meta.matchCount} match${data.meta.matchCount !== 1 ? 'es' : ''} · ${totalYes} films you'd watch`
              : 'Films you love that others love too'}
          </p>
        </div>
      </div>

      {/* Threshold selector */}
      <div className="threshold-bar">
        <span className="threshold-label">Global approval ≥</span>
        <div className="threshold-tabs">
          {THRESHOLDS.map(t => (
            <button
              key={t.value}
              className={`threshold-tab ${threshold === t.value ? 'active' : ''}`}
              onClick={() => setThreshold(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="matches-list scroll-y">
        {loading && (
          <div className="matches-loading">
            <div className="spinner" />
            <span>Loading matches…</span>
          </div>
        )}

        {error && (
          <div className="matches-error">
            {error}
            <button className="retry-btn" onClick={() => load(threshold)}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {data.matches.length === 0 && data.pending.length === 0 && (
              <div className="matches-empty">
                <span className="empty-icon">🎬</span>
                <p>No movies yet.</p>
                <p className="empty-sub">Go swipe some films first!</p>
              </div>
            )}

            {data.matches.length > 0 && (
              <>
                <div className="section-heading">
                  🎯 {data.matches.length} Confirmed Match{data.matches.length !== 1 ? 'es' : ''}
                </div>
                <AnimatePresence mode="popLayout">
                  {data.matches.map((item, i) => (
                    <MatchCard key={item.id} item={item} rank={i} isPending={false} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {data.pending.length > 0 && (
              <>
                <div className="section-heading pending-heading">
                  ⏳ {data.pending.length} Awaiting Consensus
                  <span className="pending-hint"> (below {Math.round(threshold * 100)}%)</span>
                </div>
                <AnimatePresence mode="popLayout">
                  {data.pending.map((item, i) => (
                    <MatchCard key={item.id} item={item} rank={i} isPending={true} />
                  ))}
                </AnimatePresence>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .matches-view {
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
        }
        .matches-header {
          padding: 20px 20px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .matches-title {
          font-size: 1.35rem; font-weight: 800; color: var(--text);
        }
        .matches-sub {
          font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;
        }
        .threshold-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
          flex-shrink: 0; overflow-x: auto; scrollbar-width: none;
        }
        .threshold-bar::-webkit-scrollbar { display: none; }
        .threshold-label {
          font-size: 0.75rem; color: var(--text-muted);
          white-space: nowrap; flex-shrink: 0;
        }
        .threshold-tabs { display: flex; gap: 6px; }
        .threshold-tab {
          flex-shrink: 0; padding: 5px 12px; border-radius: 20px;
          font-size: 0.78rem; font-weight: 600;
          color: var(--text-muted); background: var(--surface2);
          border: 1px solid var(--border); transition: all 0.18s;
        }
        .threshold-tab.active {
          background: var(--yes); color: #fff; border-color: transparent;
        }
        .matches-list { flex: 1; overflow-y: auto; padding-bottom: 20px; }
        .section-heading {
          padding: 12px 16px 6px;
          font-size: 0.78rem; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .pending-heading { opacity: 0.6; }
        .pending-hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
        .matches-loading, .matches-error {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 60px 20px;
          color: var(--text-muted); font-size: 0.9rem;
        }
        .matches-error { color: var(--no); text-align: center; }
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid var(--border); border-top-color: var(--yes);
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .retry-btn {
          padding: 8px 20px; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 10px;
          color: var(--text); font-size: 0.85rem; font-weight: 600;
        }
        .matches-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 60px 20px; text-align: center;
        }
        .empty-icon { font-size: 3rem; }
        .matches-empty p { color: var(--text); font-weight: 700; }
        .empty-sub { color: var(--text-muted) !important; font-weight: 400 !important; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
