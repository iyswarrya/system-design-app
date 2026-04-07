export type SummaryItemType = "diagram-feedback";

export interface SummaryItem {
  id: string;
  type: SummaryItemType;
  topic: string;
  title: string;
  createdAt: string;
  mermaidText?: string;
  svg?: string | null;
  pngDataUrl?: string | null;
}

const ITEMS_PREFIX = "summary_items_";

function getKey(topic: string) {
  return `${ITEMS_PREFIX}${topic}`;
}

export function loadSummaryItems(topic: string): SummaryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(getKey(topic));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.id === "string") as SummaryItem[];
  } catch {
    return [];
  }
}

function saveSummaryItems(topic: string, items: SummaryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(getKey(topic), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function saveSummaryItem(topic: string, item: SummaryItem): { added: boolean; items: SummaryItem[] } {
  const current = loadSummaryItems(topic);
  if (item.mermaidText) {
    const exists = current.some((x) => x.mermaidText === item.mermaidText);
    if (exists) {
      return { added: false, items: current };
    }
  }
  const next = [...current, item];
  saveSummaryItems(topic, next);
  return { added: true, items: next };
}

export function removeSummaryItem(topic: string, id: string): SummaryItem[] {
  const current = loadSummaryItems(topic);
  const next = current.filter((x) => x.id !== id);
  saveSummaryItems(topic, next);
  return next;
}

export function clearSummary(topic: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(getKey(topic));
  } catch {
    // ignore
  }
}

export function notifySummaryItemsChanged(topic: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("summary-items-changed", {
      detail: { topic },
    })
  );
}

