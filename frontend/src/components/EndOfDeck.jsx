import { motion } from 'framer-motion';

export default function EndOfDeck({ votes, onViewResults }) {
  const yesCount = votes.filter(v => v.choice === 'yes').length;
  const noCount  = votes.filter(v => v.choice === 'no').length;

  return (
    <motion.div
      className="end-of-deck"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="end-emoji">🎬</div>
      <h2 className="end-title">You've seen them all!</h2>
      <p className="end-sub">
        You'd watch <strong>{yesCount}</strong> and skip <strong>{noCount}</strong> of the 100 films.
      </p>

      <div className="end-stats">
        <div className="end-stat">
          <span className="stat-num yes-num">{yesCount}</span>
          <span className="stat-label">Would Watch</span>
        </div>
        <div className="end-divider" />
        <div className="end-stat">
          <span className="stat-num no-num">{noCount}</span>
          <span className="stat-label">Would Skip</span>
        </div>
      </div>

      <button className="btn-results" onClick={onViewResults}>
        See How Everyone Voted →
      </button>

      <style>{`
        .end-of-deck {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          text-align: center;
          height: 100%;
          gap: 16px;
        }
        .end-emoji {
          font-size: 4rem;
          line-height: 1;
        }
        .end-title {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--text);
        }
        .end-sub {
          font-size: 0.95rem;
          color: var(--text-muted);
          max-width: 260px;
          line-height: 1.5;
        }
        .end-sub strong {
          color: var(--text);
          font-weight: 700;
        }
        .end-stats {
          display: flex;
          align-items: center;
          gap: 28px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 32px;
          margin: 8px 0;
        }
        .end-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-num {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1;
        }
        .yes-num { color: var(--yes); }
        .no-num  { color: var(--no); }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .end-divider {
          width: 1px;
          height: 48px;
          background: var(--border);
        }
        .btn-results {
          margin-top: 8px;
          background: var(--accent);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 14px 28px;
          border-radius: 14px;
          transition: opacity 0.2s, transform 0.1s;
        }
        .btn-results:active {
          opacity: 0.85;
          transform: scale(0.97);
        }
      `}</style>
    </motion.div>
  );
}
