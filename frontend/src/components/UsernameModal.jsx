import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * UsernameModal — shown on first visit if no username is stored.
 * Asks for a display name so votes are attributed to a recognisable handle.
 * The user can skip to remain anonymous (session ID is still the real key).
 */
export default function UsernameModal({ onConfirm }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(value.trim() || 'Anonymous');
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-card"
        initial={{ scale: 0.88, y: 40, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{ scale: 0.88, y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      >
        <div className="modal-icon">🎬</div>
        <h2 className="modal-title">Welcome to CineSwipe</h2>
        <p className="modal-sub">
          Swipe right on movies you'd watch, left on ones you'd skip.
          Pick a name so we remember your votes across sessions.
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            className="modal-input"
            type="text"
            placeholder="Your name (e.g. FilmFanatic)"
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={64}
            autoFocus
          />
          <button type="submit" className="modal-btn-primary">
            Let's go →
          </button>
          <button
            type="button"
            className="modal-btn-skip"
            onClick={() => onConfirm('Anonymous')}
          >
            Skip (stay anonymous)
          </button>
        </form>
      </motion.div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 100;
          padding: 0 0 env(safe-area-inset-bottom, 0);
        }
        .modal-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px 28px 0 0;
          padding: 32px 28px 40px;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        .modal-icon  { font-size: 3rem; line-height: 1; }
        .modal-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text);
        }
        .modal-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          max-width: 300px;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          margin-top: 8px;
        }
        .modal-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px solid var(--border);
          background: var(--surface2);
          color: var(--text);
          font-size: 1rem;
          font-family: var(--font);
          outline: none;
          transition: border-color 0.18s;
        }
        .modal-input:focus { border-color: var(--accent); }
        .modal-input::placeholder { color: var(--text-muted); }
        .modal-btn-primary {
          padding: 14px;
          background: var(--accent);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          border-radius: 14px;
          transition: opacity 0.18s;
        }
        .modal-btn-primary:active { opacity: 0.85; }
        .modal-btn-skip {
          font-size: 0.8rem;
          color: var(--text-muted);
          padding: 6px;
        }
      `}</style>
    </motion.div>
  );
}
