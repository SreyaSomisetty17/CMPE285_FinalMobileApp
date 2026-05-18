import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionId }  from './hooks/useSessionId';
import { useUsername }   from './hooks/useUsername';
import { fetchItems }    from './api';
import CardStack         from './components/CardStack';
import EndOfDeck         from './components/EndOfDeck';
import ResultsView       from './components/ResultsView';
import MatchesView       from './components/MatchesView';
import UsernameModal     from './components/UsernameModal';

const TAB_SWIPE   = 'swipe';
const TAB_RESULTS = 'results';
const TAB_MATCHES = 'matches';

export default function App() {
  const { sessionId, signOut }          = useSessionId();
  const { username, setUsername }       = useUsername();

  const [tab, setTab]                   = useState(TAB_SWIPE);
  const [movies, setMovies]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [voteHistory, setVoteHistory]   = useState([]);   // [{movie, choice}]
  const [deckComplete, setDeckComplete] = useState(false);
  const [canUndo, setCanUndo]           = useState(false);

  const touchStartY  = useRef(null);
  const cardStackRef = useRef(null);  // exposes .vote() / .undo() / .canUndo

  // ── Load movies ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchItems(sessionId);
        const unvoted = data.items.filter(m => !m.user_vote);
        // Start from unvoted films; fall back to full list if all done
        setMovies(unvoted.length > 0 ? unvoted : data.items);
        if (unvoted.length === 0 && data.items.length > 0) setDeckComplete(true);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const votedCount  = voteHistory.length;
  const totalMovies = movies.length;
  const progressPct = totalMovies > 0 ? (votedCount / totalMovies) * 100 : 0;

  // ── Vote / Undo handlers ───────────────────────────────────────────────────
  const handleVoteCast = useCallback(({ movie, choice }) => {
    setVoteHistory(h => [...h, { movie, choice }]);
    // Sync canUndo with ref after state settle
    setTimeout(() => setCanUndo(!!cardStackRef.current?.canUndo), 0);
  }, []);

  const handleUndoVote = useCallback(() => {
    setVoteHistory(h => h.slice(0, -1));
    setTimeout(() => setCanUndo(!!cardStackRef.current?.canUndo), 0);
  }, []);

  const handleDeckComplete = useCallback(() => setDeckComplete(true), []);

  // Pull-down gesture: swipe down on deck → open Results
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 80 && tab === TAB_SWIPE) setTab(TAB_RESULTS);
    touchStartY.current = null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Username modal — shown once on first visit */}
      <AnimatePresence>
        {username === null && (
          <UsernameModal onConfirm={setUsername} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">CineSwipe</span>
        </div>

        <div className="header-right">
          {tab === TAB_SWIPE && !deckComplete && (
            <div className="progress-wrap">
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className="progress-label">{votedCount} / {totalMovies}</span>
            </div>
          )}
          {username && (
            <UserMenu username={username} onSignOut={signOut} />
          )}
        </div>
      </header>

      {/* ── Tab bar (3 tabs) ── */}
      <nav className="tab-bar">
        {[
          { id: TAB_SWIPE,   icon: '🃏', label: 'Swipe'   },
          { id: TAB_RESULTS, icon: '📊', label: 'Results' },
          { id: TAB_MATCHES, icon: '❤️', label: 'Matches' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="app-main">
        <AnimatePresence mode="wait">

          {/* ── Swipe tab ── */}
          {tab === TAB_SWIPE && (
            <motion.div key="swipe" className="tab-panel"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            >
              {loading && <LoadingState />}
              {error   && <ErrorState message={error} />}

              {!loading && !error && (
                deckComplete ? (
                  <EndOfDeck
                    votes={voteHistory}
                    onViewResults={() => setTab(TAB_RESULTS)}
                  />
                ) : (
                  <>
                    <div className="deck-area">
                      <CardStack
                        ref={cardStackRef}
                        movies={movies}
                        sessionId={sessionId}
                        username={username}
                        onVoteCast={handleVoteCast}
                        onUndoVote={handleUndoVote}
                        onComplete={handleDeckComplete}
                      />
                      <DeckWatcher
                        votedCount={votedCount}
                        total={totalMovies}
                        onComplete={handleDeckComplete}
                      />
                    </div>

                    {/* Action bar: Undo · Skip/Watch buttons */}
                    {movies.length > 0 && votedCount < totalMovies && (
                      <div className="action-buttons">
                        {/* Undo */}
                        <motion.button
                          className={`action-btn btn-undo ${!canUndo ? 'btn-disabled' : ''}`}
                          onClick={() => {
                            cardStackRef.current?.undo();
                          }}
                          whileTap={canUndo ? { scale: 0.88 } : {}}
                          aria-label="Undo last swipe"
                          disabled={!canUndo}
                        >
                          ↩
                        </motion.button>

                        {/* Skip */}
                        <ActionBtn
                          label="Skip"
                          icon="✕"
                          className="btn-no"
                          onClick={() => cardStackRef.current?.vote('no')}
                        />

                        <div className="btn-hint">
                          <span>← skip</span>
                          <span>watch →</span>
                        </div>

                        {/* Watch */}
                        <ActionBtn
                          label="Watch"
                          icon="♥"
                          className="btn-yes"
                          onClick={() => cardStackRef.current?.vote('yes')}
                        />
                      </div>
                    )}
                  </>
                )
              )}
            </motion.div>
          )}

          {/* ── Results tab ── */}
          {tab === TAB_RESULTS && (
            <motion.div key="results" className="tab-panel"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
            >
              <ResultsView sessionId={sessionId} />
            </motion.div>
          )}

          {/* ── Matches tab ── */}
          {tab === TAB_MATCHES && (
            <motion.div key="matches" className="tab-panel"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
            >
              <MatchesView sessionId={sessionId} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <style>{`
        .app {
          display: flex; flex-direction: column;
          height: 100dvh; max-width: 480px;
          margin: 0 auto; background: var(--bg); overflow: hidden;
        }

        /* ─── Header ─── */
        .app-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px 10px; flex-shrink: 0;
          border-bottom: 1px solid var(--border);
        }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { font-size: 1.3rem; }
        .logo-text {
          font-size: 1.1rem; font-weight: 800;
          color: var(--text); letter-spacing: -0.02em;
        }
        .header-right {
          display: flex; align-items: center; gap: 10px; flex: 1;
          justify-content: flex-end; min-width: 0;
        }
        .progress-wrap {
          display: flex; align-items: center; gap: 8px;
          flex: 1; max-width: 150px;
        }
        .progress-bar {
          flex: 1; height: 5px; background: var(--surface2);
          border-radius: 3px; overflow: hidden;
        }
        .progress-fill {
          height: 100%; background: var(--accent);
          border-radius: 3px; min-width: 2px;
        }
        .progress-label {
          font-size: 0.72rem; color: var(--text-muted);
          white-space: nowrap; font-weight: 600;
        }
        /* username-chip styles live inside UserMenu component */

        /* ─── Tab bar ─── */
        .tab-bar {
          display: flex; flex-shrink: 0;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .tab-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 5px; padding: 10px; font-size: 0.78rem; font-weight: 600;
          color: var(--text-muted); border-bottom: 2px solid transparent;
          transition: color 0.18s, border-color 0.18s;
        }
        .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-icon { font-size: 0.95rem; }

        /* ─── Main ─── */
        .app-main { flex: 1; overflow: hidden; position: relative; }
        .tab-panel {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; overflow: hidden;
        }

        /* ─── Deck area ─── */
        .deck-area {
          flex: 1; position: relative;
          margin: 14px 16px 6px; min-height: 0;
        }

        /* ─── Action buttons ─── */
        .action-buttons {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 10px 20px 18px; flex-shrink: 0;
        }
        .action-btn {
          width: 54px; height: 54px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; font-weight: 700; border: 2px solid;
        }
        .btn-no  { background: var(--no-glow);  border-color: var(--no);  color: var(--no);  }
        .btn-yes { background: var(--yes-glow); border-color: var(--yes); color: var(--yes); }
        .btn-undo {
          width: 40px; height: 40px; font-size: 1.1rem;
          background: var(--surface2); border-color: var(--border);
          color: var(--text-muted); transition: opacity 0.2s;
        }
        .btn-disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-hint {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; font-size: 0.62rem; color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

/* ── Reusable animated action button ── */
function ActionBtn({ label, icon, className, onClick }) {
  return (
    <motion.button
      className={`action-btn ${className}`}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}

/* ── Spinner while movies load ── */
function LoadingState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      color: 'var(--text-muted)',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: '0.9rem' }}>Loading films…</span>
    </div>
  );
}

/* ── Error state ── */
function ErrorState({ message }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '0 32px', textAlign: 'center',
    }}>
      <span style={{ fontSize: '2.5rem' }}>⚠️</span>
      <p style={{ color: 'var(--text)', fontWeight: 700 }}>Couldn't load films</p>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {message || 'Is the backend running? Try: cd backend && npm start'}
      </p>
    </div>
  );
}

/* ── Fires onComplete when deck is exhausted ── */
function DeckWatcher({ votedCount, total, onComplete }) {
  useEffect(() => {
    if (total > 0 && votedCount >= total) onComplete();
  }, [votedCount, total, onComplete]);
  return null;
}

/**
 * UserMenu — tappable chip that shows a sign-out sheet.
 * Tapping the chip toggles a small dropdown with:
 *   • The current username (read-only display)
 *   • "Switch User" — signs out so someone else can log in fresh
 */
function UserMenu({ username, onSignOut }) {
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    setOpen(false);
    if (window.confirm(
      `Sign out as "${username}"?\n\nYour votes are saved. A new user can log in and vote independently — their votes will combine with yours in the Results.`
    )) {
      onSignOut();
    }
  }

  return (
    <div className="user-menu-wrap">
      <button
        className="username-chip"
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
      >
        <span className="chip-avatar">{username.charAt(0).toUpperCase()}</span>
        <span className="chip-name">{username.slice(0, 10)}</span>
        <span className="chip-arrow">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop to close on outside tap */}
            <motion.div
              className="menu-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="user-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="dropdown-user">
                <span className="dropdown-avatar">{username.charAt(0).toUpperCase()}</span>
                <div>
                  <div className="dropdown-name">{username}</div>
                  <div className="dropdown-hint">Logged in this session</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-signout" onClick={handleSignOut}>
                <span>🔄</span> Switch User
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .user-menu-wrap { position: relative; flex-shrink: 0; }
        .username-chip {
          display: flex; align-items: center; gap: 5px;
          background: var(--surface2); border: 1px solid var(--border);
          padding: 5px 10px 5px 5px; border-radius: 20px;
          transition: border-color 0.18s; max-width: 130px;
        }
        .username-chip:hover { border-color: var(--accent); }
        .chip-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800; flex-shrink: 0;
        }
        .chip-name {
          font-size: 0.75rem; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .chip-arrow { font-size: 0.55rem; color: var(--text-muted); flex-shrink: 0; }

        .menu-backdrop {
          position: fixed; inset: 0; z-index: 49;
        }
        .user-dropdown {
          position: absolute; right: 0; top: calc(100% + 8px);
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 8px; min-width: 200px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5); z-index: 50;
        }
        .dropdown-user {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 8px 10px;
        }
        .dropdown-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; font-weight: 800; flex-shrink: 0;
        }
        .dropdown-name  { font-size: 0.88rem; font-weight: 700; color: var(--text); }
        .dropdown-hint  { font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; }
        .dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .dropdown-signout {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 10px 10px;
          font-size: 0.85rem; font-weight: 600;
          color: var(--text); border-radius: 10px;
          transition: background 0.15s;
        }
        .dropdown-signout:hover { background: var(--surface2); }
      `}</style>
    </div>
  );
}
