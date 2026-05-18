import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchResults, fetchStats } from '../api';

const SORT_OPTIONS = [
  { key: 'loved',    label: '❤️ Most Loved'   },
  { key: 'divisive', label: '⚖️ Most Divisive' },
  { key: 'votes',    label: '🔥 Most Voted'    },
  { key: 'alpha',    label: '🔤 A–Z'            },
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=120&fit=crop&auto=format';

function YesBar({ yes, total }) {
  const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
  return (
    <div className="bar-wrap">
      <div
        className="bar-fill"
        style={{ width: `${pct}%`, background: pct >= 50 ? 'var(--yes)' : 'var(--no)' }}
      />
      <span className="bar-label">{pct}%</span>
    </div>
  );
}

function ResultRow({ item, rank }) {
  const [imgSrc, setImgSrc] = useState(item.poster || FALLBACK_IMG);
  const total = item.total_votes;
  const pct   = total > 0 ? Math.round((item.yes_count / total) * 100) : null;

  return (
    <motion.div
      className="result-row"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: rank * 0.03, duration: 0.25 }}
    >
      <span className="result-rank">#{rank + 1}</span>

      <img
        className="result-poster"
        src={imgSrc}
        alt={item.title}
        onError={() => setImgSrc(FALLBACK_IMG)}
      />

      <div className="result-details">
        <div className="result-header">
          <span className="result-title">{item.title}</span>
          <span className="result-year">{item.year}</span>
        </div>

        {total > 0 ? (
          <>
            <YesBar yes={item.yes_count} total={total} />
            <div className="result-counts">
              <span className="yes-badge">✓ {item.yes_count}</span>
              <span className="no-badge">✗ {item.no_count}</span>
              <span className="total-label">{total} vote{total !== 1 ? 's' : ''}</span>
            </div>
          </>
        ) : (
          <span className="no-votes">No votes yet</span>
        )}
      </div>

      {item.user_vote && (
        <div className={`user-vote-badge ${item.user_vote}`}>
          {item.user_vote === 'yes' ? '✓' : '✗'}
        </div>
      )}

      <style>{`
        .result-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          position: relative;
        }
        .result-rank {
          font-size: 0.72rem; color: var(--text-muted);
          min-width: 28px; text-align: center; font-weight: 600;
        }
        .result-poster {
          width: 44px; height: 66px; object-fit: cover;
          border-radius: 8px; flex-shrink: 0; background: var(--surface2);
        }
        .result-details {
          flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px;
        }
        .result-header { display: flex; align-items: baseline; gap: 6px; }
        .result-title {
          font-size: 0.88rem; font-weight: 700; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .result-year { font-size: 0.72rem; color: var(--text-muted); flex-shrink: 0; }
        .bar-wrap {
          position: relative; height: 6px; background: var(--surface2);
          border-radius: 3px; overflow: hidden;
        }
        .bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }
        .bar-label { position: absolute; right: 0; top: -16px; font-size: 0.68rem; color: var(--text-muted); }
        .result-counts { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
        .yes-badge  { font-size: 0.72rem; color: var(--yes); font-weight: 600; }
        .no-badge   { font-size: 0.72rem; color: var(--no);  font-weight: 600; }
        .total-label{ font-size: 0.68rem; color: var(--text-muted); margin-left: auto; }
        .no-votes   { font-size: 0.75rem; color: var(--text-muted); }
        .user-vote-badge {
          position: absolute; right: 14px; top: 12px;
          width: 20px; height: 20px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 800;
        }
        .user-vote-badge.yes { background: var(--yes-glow); color: var(--yes); }
        .user-vote-badge.no  { background: var(--no-glow);  color: var(--no);  }
      `}</style>
    </motion.div>
  );
}

export default function ResultsView({ sessionId }) {
  const [sort, setSort]       = useState('loved');
  const [results, setResults] = useState([]);
  const [meta, setMeta]       = useState(null);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async (sortKey) => {
    setLoading(true);
    setError(null);
    try {
      const [data, globalStats] = await Promise.all([
        fetchResults(sortKey, sessionId),
        fetchStats(),
      ]);
      setResults(data.results);
      setMeta(data.meta);
      setStats(globalStats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(sort); }, [sort, load]);

  return (
    <div className="results-view">
      {/* Header with live voter count */}
      <div className="results-header">
        <div>
          <h1 className="results-title">Global Results</h1>
          {meta && stats && (
            <p className="results-sub">
              {meta.totalVotes.toLocaleString()} votes · {stats.unique_users} voter{stats.unique_users !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Voter-count pill — makes multi-user story visible at a glance */}
        {stats && (
          <div className="voters-pill">
            <span className="voters-icon">👥</span>
            <span className="voters-num">{stats.unique_users}</span>
            <span className="voters-label">user{stats.unique_users !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Sort tabs */}
      <div className="sort-tabs">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`sort-tab ${sort === opt.key ? 'active' : ''}`}
            onClick={() => setSort(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="results-list scroll-y">
        {loading && (
          <div className="results-loading">
            <div className="spinner" />
            <span>Loading results…</span>
          </div>
        )}
        {error && (
          <div className="results-error">
            Failed to load: {error}
            <button onClick={() => load(sort)} className="retry-btn">Retry</button>
          </div>
        )}
        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            {results.map((item, i) => (
              <ResultRow key={item.id} item={item} rank={i} />
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        .results-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .results-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .results-title { font-size: 1.35rem; font-weight: 800; color: var(--text); }
        .results-sub   { font-size: 0.8rem;  color: var(--text-muted); margin-top: 2px; }

        .voters-pill {
          display: flex; align-items: center; gap: 4px;
          background: var(--surface2); border: 1px solid var(--border);
          padding: 6px 12px; border-radius: 20px; flex-shrink: 0;
        }
        .voters-icon  { font-size: 0.9rem; }
        .voters-num   { font-size: 1rem; font-weight: 800; color: var(--accent); }
        .voters-label { font-size: 0.72rem; color: var(--text-muted); }

        .sort-tabs {
          display: flex; gap: 6px; padding: 12px 16px; overflow-x: auto;
          flex-shrink: 0; border-bottom: 1px solid var(--border); scrollbar-width: none;
        }
        .sort-tabs::-webkit-scrollbar { display: none; }
        .sort-tab {
          flex-shrink: 0; padding: 6px 12px; border-radius: 20px;
          font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
          background: var(--surface2); border: 1px solid var(--border);
          transition: all 0.18s; white-space: nowrap;
        }
        .sort-tab.active { background: var(--accent); color: #fff; border-color: transparent; }
        .results-list { flex: 1; overflow-y: auto; padding-bottom: 20px; }
        .results-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 60px 20px; color: var(--text-muted); font-size: 0.9rem;
        }
        .spinner {
          width: 28px; height: 28px; border: 3px solid var(--border);
          border-top-color: var(--accent); border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .results-error {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 40px 20px; color: var(--no); font-size: 0.9rem; text-align: center;
        }
        .retry-btn {
          padding: 8px 20px; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 10px;
          color: var(--text); font-size: 0.85rem; font-weight: 600;
        }
      `}</style>
    </div>
  );
}
