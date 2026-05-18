import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const SWIPE_THRESHOLD = 100;   // px of drag needed to register a vote
const SWIPE_VELOCITY  = 500;   // px/s velocity shortcut

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop&auto=format';

export default function SwipeCard({ movie, onVote, isTop }) {
  const [imgSrc, setImgSrc] = useState(movie.poster || FALLBACK_IMG);
  const [dragging, setDragging] = useState(false);
  const cardRef = useRef(null);

  // Motion values for drag position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Derived visual effects from horizontal drag
  const rotate     = useTransform(x, [-200, 200], [-18, 18]);
  const yesOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const noOpacity  = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const yesScale   = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1.1]);
  const noScale    = useTransform(x, [-SWIPE_THRESHOLD, 0], [1.1, 0.8]);

  // Slight card scale + bg tint as you drag
  const cardScale  = useTransform(x, [-200, 0, 200], [0.97, 1, 0.97]);
  const greenTint  = useTransform(x, [0, SWIPE_THRESHOLD * 1.5], [0, 0.45]);
  const redTint    = useTransform(x, [-SWIPE_THRESHOLD * 1.5, 0], [0.45, 0]);

  function flyOut(direction) {
    const targetX = direction === 'yes' ? 600 : -600;
    animate(x, targetX, { duration: 0.35, ease: 'easeIn' });
    animate(y, 80,       { duration: 0.35, ease: 'easeIn' });
    setTimeout(() => onVote(direction), 300);
  }

  function handleDragEnd(_, info) {
    setDragging(false);
    const { offset, velocity } = info;

    if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
      flyOut('yes');
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
      flyOut('no');
    } else {
      // Snap back to center
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 25 });
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className="swipe-card"
      style={{ x, y, rotate, scale: cardScale }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1,    opacity: 1, y: 0  }}
      transition={{ duration: 0.3 }}
    >
      {/* Poster image */}
      <div className="card-image-wrap">
        <img
          src={imgSrc}
          alt={movie.title}
          className="card-image"
          onError={() => setImgSrc(FALLBACK_IMG)}
          draggable={false}
        />
        {/* Colour tint overlays */}
        <motion.div
          className="tint tint-yes"
          style={{ opacity: greenTint }}
        />
        <motion.div
          className="tint tint-no"
          style={{ opacity: redTint }}
        />
      </div>

      {/* YES stamp */}
      <motion.div
        className="stamp stamp-yes"
        style={{ opacity: yesOpacity, scale: yesScale }}
      >
        WATCH
      </motion.div>

      {/* NO stamp */}
      <motion.div
        className="stamp stamp-no"
        style={{ opacity: noOpacity, scale: noScale }}
      >
        SKIP
      </motion.div>

      {/* Info panel */}
      <div className="card-info">
        <div className="card-meta">
          <span className="card-genre">{movie.genre}</span>
          <span className="card-year">{movie.year}</span>
        </div>
        <h2 className="card-title">{movie.title}</h2>
        <p className="card-tagline">{movie.tagline}</p>
      </div>

      <style>{`
        .swipe-card {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          overflow: hidden;
          touch-action: none;
          cursor: grab;
          user-select: none;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          background: var(--surface);
        }
        .swipe-card:active { cursor: grabbing; }

        .card-image-wrap {
          position: absolute;
          inset: 0;
        }
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .tint {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .tint-yes { background: rgba(34,197,94,1); }
        .tint-no  { background: rgba(239,68,68,1);  }

        /* Gradient overlay for readability */
        .card-image-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 30%,
            rgba(0,0,0,0.4) 60%,
            rgba(0,0,0,0.92) 100%
          );
        }

        .stamp {
          position: absolute;
          top: 40px;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 8px 18px;
          border-radius: 10px;
          border-width: 3px;
          border-style: solid;
          z-index: 10;
          pointer-events: none;
        }
        .stamp-yes {
          right: 30px;
          color: var(--yes);
          border-color: var(--yes);
          transform: rotate(15deg);
        }
        .stamp-no {
          left: 30px;
          color: var(--no);
          border-color: var(--no);
          transform: rotate(-15deg);
        }

        .card-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 24px 32px;
          z-index: 5;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .card-genre {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          background: var(--accent);
          color: #fff;
          padding: 3px 10px;
          border-radius: 100px;
        }
        .card-year {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
        }
        .card-title {
          font-size: clamp(1.2rem, 5vw, 1.6rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 6px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        .card-tagline {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
}
