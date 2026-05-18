/**
 * api.js — Thin wrapper around the backend REST API.
 * Base URL uses Vite's proxy (/api → http://localhost:3001/api).
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Fetch all movies, optionally tagged with the session's vote status. */
export function fetchItems(sessionId) {
  const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return request(`/items${qs}`);
}

/** Submit a vote (username is optional). */
export function postVote({ itemId, choice, sessionId, username }) {
  return request('/vote', {
    method: 'POST',
    body: JSON.stringify({ itemId, choice, sessionId, username }),
  });
}

/**
 * Delete (undo) a vote.
 * Uses query params because HTTP DELETE bodies are technically valid
 * but some proxies/servers strip them.
 */
export function deleteVote({ itemId, sessionId }) {
  const qs = new URLSearchParams({
    itemId:    String(itemId),
    sessionId: String(sessionId),
  });
  return request(`/vote?${qs}`, { method: 'DELETE' });
}

/** Fetch aggregate results, sorted by the given key. */
export function fetchResults(sort = 'loved', sessionId) {
  const qs = new URLSearchParams({ sort });
  if (sessionId) qs.set('session_id', sessionId);
  return request(`/results?${qs}`);
}

/**
 * Fetch the user's personal "matches" — films they said yes to
 * where the global yes-rate meets the threshold.
 */
export function fetchMatches(sessionId, threshold = 0.60) {
  const qs = new URLSearchParams({
    session_id: sessionId,
    threshold:  String(threshold),
  });
  return request(`/matches?${qs}`);
}

/** Fetch global stats: unique_users, total_votes, yes_votes. */
export function fetchStats() {
  return request('/stats');
}
