/**
 * Lightweight runtime auth state for current session.
 * - Exposes a mutable live binding for the current user's role so non-React
 *   modules (e.g., WebSocket handlers) can synchronously read it.
 */

export type UserRole = 'parent' | 'child' | null;

// live binding
export let CURRENT_USER_ROLE: UserRole = null;

export function setCurrentUserRole(role: UserRole) {
  CURRENT_USER_ROLE = role;
}

export function getCurrentUserRole(): UserRole {
  return CURRENT_USER_ROLE;
}
