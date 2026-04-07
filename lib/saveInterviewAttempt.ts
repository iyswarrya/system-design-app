import type { AppSession } from "@/lib/appSession";
import { GUEST_INTERVIEW_HISTORY_KEY } from "@/lib/appSession";

export type InterviewAttemptPayload = {
  topicName: string;
  summary: string;
};

export type SaveInterviewAttemptResult =
  | { ok: true; source: "backend" }
  | { ok: true; source: "local" }
  | { ok: false; source: "none"; error: string };

/**
 * Authenticated → POST /api/topic-attempts.
 * Guest → append to localStorage guest_interview_history (no backend).
 */
export async function saveInterviewAttempt(
  attempt: InterviewAttemptPayload,
  session: AppSession | null
): Promise<SaveInterviewAttemptResult> {
  if (!session) {
    return { ok: false, source: "none", error: "No session." };
  }

  if (session.mode === "authenticated") {
    try {
      const res = await fetch("/api/topic-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: attempt.topicName,
          summary: attempt.summary,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        return {
          ok: false,
          source: "none",
          error: data?.error || "Failed to save attempt.",
        };
      }
      return { ok: true, source: "backend" };
    } catch {
      return { ok: false, source: "none", error: "Network error." };
    }
  }

  if (session.mode === "guest") {
    if (typeof window === "undefined") {
      return { ok: false, source: "none", error: "Not in browser." };
    }
    try {
      const raw = localStorage.getItem(GUEST_INTERVIEW_HISTORY_KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      arr.push({
        topicName: attempt.topicName,
        summary: attempt.summary,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(GUEST_INTERVIEW_HISTORY_KEY, JSON.stringify(arr));
      return { ok: true, source: "local" };
    } catch {
      return { ok: false, source: "none", error: "Could not save locally." };
    }
  }

  return { ok: false, source: "none", error: "Unknown session mode." };
}
