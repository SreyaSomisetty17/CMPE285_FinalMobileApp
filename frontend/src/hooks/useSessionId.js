import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY  = 'cineswipe_session_id';
const USERNAME_KEY = 'cineswipe_username';

/**
 * Returns a stable session ID for this browser plus a `signOut` helper.
 *
 * The session ID is stored in localStorage so it persists across reloads.
 * Votes are keyed by this ID on the server — it is the real identity token.
 *
 * `signOut()` wipes both the session ID and username from localStorage then
 * reloads the page. On reload a brand-new UUID is generated → the UsernameModal
 * fires → the user starts a fresh deck. Their old votes remain on the server
 * under the previous session ID and still count in the global aggregate.
 */
export function useSessionId() {
  const [sessionId] = useState(() => {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const fresh = uuidv4();
      localStorage.setItem(SESSION_KEY, fresh);
      return fresh;
    } catch {
      return uuidv4();   // localStorage blocked (private/incognito) — in-memory fallback
    }
  });

  function signOut() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USERNAME_KEY);
    } catch { /* ignore */ }
    window.location.reload();
  }

  return { sessionId, signOut };
}
