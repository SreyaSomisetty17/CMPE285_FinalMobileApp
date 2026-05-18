import { useState } from 'react';

const USERNAME_KEY = 'cineswipe_username';

/**
 * Manages the user's display name.
 * - Returns the current username (null if not yet set).
 * - `setUsername(name)` persists to localStorage.
 * - `clearUsername()` resets it (for testing/demo).
 *
 * The username is purely cosmetic / display — the sessionId is the actual
 * identity key used for vote dedup on the server.
 */
export function useUsername() {
  const [username, setUsernameState] = useState(() => {
    try {
      return localStorage.getItem(USERNAME_KEY) || null;
    } catch {
      return null;
    }
  });

  function setUsername(name) {
    const trimmed = (name || '').trim().slice(0, 64);
    try {
      if (trimmed) {
        localStorage.setItem(USERNAME_KEY, trimmed);
      } else {
        localStorage.removeItem(USERNAME_KEY);
      }
    } catch { /* localStorage blocked */ }
    setUsernameState(trimmed || null);
  }

  function clearUsername() {
    setUsername('');
  }

  return { username, setUsername, clearUsername };
}
