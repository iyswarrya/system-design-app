/**
 * Client-side app session (localStorage).
 * `guest_access` cookie is set alongside guest mode so Edge middleware can allow /requirements/* (localStorage is not available there).
 */

export const APP_SESSION_STORAGE_KEY = "app_session";
export const GUEST_INTERVIEW_HISTORY_KEY = "guest_interview_history";

/** Must match middleware check. */
export const GUEST_ACCESS_COOKIE = "guest_access";

export type AppSession =
  | { mode: "guest" }
  | { mode: "authenticated"; userId: string; email: string };

function parseSession(raw: string | null): AppSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const mode = (v as { mode?: unknown }).mode;
    if (mode === "guest") return { mode: "guest" };
    if (mode === "authenticated") {
      const userId = (v as { userId?: unknown }).userId;
      const email = (v as { email?: unknown }).email;
      if (typeof userId === "string" && typeof email === "string") {
        return { mode: "authenticated", userId, email };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function readAppSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  return parseSession(localStorage.getItem(APP_SESSION_STORAGE_KEY));
}

export const APP_SESSION_CHANGED_EVENT = "app-session-changed";

function notifySessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_SESSION_CHANGED_EVENT));
}

export function writeAppSession(session: AppSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
  notifySessionChanged();
}

export function clearAppSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(APP_SESSION_STORAGE_KEY);
  notifySessionChanged();
}

function setGuestAccessCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${GUEST_ACCESS_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearGuestAccessCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Guest: localStorage + cookie for middleware. */
export function startGuestSession(): void {
  writeAppSession({ mode: "guest" });
  setGuestAccessCookie();
}

/** After login/register: persist session and drop guest routing cookie. */
export function startAuthenticatedSession(user: { id: string; email: string }): void {
  writeAppSession({ mode: "authenticated", userId: user.id, email: user.email });
  clearGuestAccessCookie();
}

/**
 * Prefer localStorage; if missing but user has auth cookie, sync from /api/auth/me.
 */
export async function resolveAppSession(): Promise<AppSession | null> {
  if (typeof window === "undefined") return null;
  const local = readAppSession();
  if (local) return local;
  try {
    const res = await fetch("/api/auth/me");
    const data = (await res.json()) as { user?: { id: string; email: string } | null };
    if (data?.user) {
      startAuthenticatedSession(data.user);
      return {
        mode: "authenticated",
        userId: data.user.id,
        email: data.user.email,
      };
    }
  } catch {
    // ignore
  }
  return null;
}
