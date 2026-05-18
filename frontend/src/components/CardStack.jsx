import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { postVote, deleteVote } from '../api';

/**
 * CardStack — manages the deck of movie cards.
 * Renders up to 3 cards stacked visually; the top card is draggable.
 *
 * Exposes via ref:
 *   vote(choice)   — programmatically swipe the top card
 *   undoVote()     — reverse the last swipe (deletes the vote server-side,
 *                    restores the card to the top of the deck)
 *   canUndo        — boolean, whether undo is currently possible
 */
const CardStack = forwardRef(function CardStack(
  { movies, sessionId, username, onVoteCast, onUndoVote },
  ref
) {
  const [index,       setIndex]       = useState(0);
  const [voting,      setVoting]      = useState(false);
  // Internal history: [{movieId, choice}] — tracks what this deck instance voted
  const [localHistory, setLocalHistory] = useState([]);

  const current = movies[index];
  const next1   = movies[index + 1];
  const next2   = movies[index + 2];

  // ── Vote ────────────────────────────────────────────────────────────────
  const handleVote = useCallback(async (choice) => {
    if (voting || !current) return;
    setVoting(true);

    const votedMovie = current;

    // Optimistically advance — update UI before the network round-trip
    setIndex(i => i + 1);
    setLocalHistory(h => [...h, { movieId: votedMovie.id, choice }]);
    onVoteCast?.({ movie: votedMovie, choice });

    try {
      await postVote({ itemId: votedMovie.id, choice, sessionId, username });
    } catch (err) {
      console.error('Vote failed:', err);
      // Non-blocking; the card has moved on. A retry could be added here.
    } finally {
      setVoting(false);
    }
  }, [current, sessionId, username, voting, onVoteCast]);

  // ── Undo ─────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (voting || localHistory.length === 0) return;
    setVoting(true);

    const last = localHistory[localHistory.length - 1];

    // Optimistically rewind — restore the card before the network call
    setIndex(i => i - 1);
    setLocalHistory(h => h.slice(0, -1));
    onUndoVote?.({ movieId: last.movieId, choice: last.choice });

    try {
      await deleteVote({ itemId: last.movieId, sessionId });
    } catch (err) {
      console.error('Undo failed:', err);
      // Non-blocking; the card is already back on top
    } finally {
      setVoting(false);
    }
  }, [voting, localHistory, sessionId, onUndoVote]);

  // Expose both vote() and undoVote() to the parent via ref
  useImperativeHandle(ref, () => ({
    vote:    handleVote,
    undo:    handleUndo,
    canUndo: localHistory.length > 0,
  }), [handleVote, handleUndo, localHistory.length]);

  // All cards consumed → parent renders <EndOfDeck>
  if (index >= movies.length) return null;

  const stackedCards = [next2, next1, current].filter(Boolean);

  return (
    <div className="card-stack">
      {stackedCards.map((movie) => {
        const isTop      = movie === current;
        const stackDepth = stackedCards.length - 1 - stackedCards.indexOf(movie);

        return (
          <div
            key={movie.id}
            className="card-layer"
            style={{
              transform: `scale(${1 - stackDepth * 0.04}) translateY(${stackDepth * 12}px)`,
              zIndex:    stackedCards.length - stackDepth,
              opacity:   stackDepth === 2 ? 0.6 : 1,
              transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}
          >
            <AnimatePresence mode="popLayout">
              {isTop && (
                <SwipeCard
                  key={movie.id}
                  movie={movie}
                  isTop={isTop}
                  onVote={handleVote}
                />
              )}
            </AnimatePresence>

            {/* Ghost cards behind the top card */}
            {!isTop && (
              <div className="ghost-card">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="ghost-img"
                  onError={e => {
                    e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop&auto=format';
                  }}
                  draggable={false}
                />
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .card-stack {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .card-layer {
          position: absolute;
          inset: 0;
          border-radius: 24px;
        }
        .ghost-card {
          width: 100%;
          height: 100%;
          border-radius: 24px;
          overflow: hidden;
          background: var(--surface);
        }
        .ghost-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
});

export default CardStack;
