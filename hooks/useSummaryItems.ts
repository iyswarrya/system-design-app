"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SummaryItem,
  loadSummaryItems,
  saveSummaryItem,
  removeSummaryItem,
  clearSummary,
} from "@/lib/summaryItems";

export function useSummaryItems(topic: string) {
  const [items, setItems] = useState<SummaryItem[]>([]);

  useEffect(() => {
    setItems(loadSummaryItems(topic));
  }, [topic]);

  useEffect(() => {
    function handleChanged(e: Event) {
      const detail = (e as CustomEvent).detail as { topic?: string } | undefined;
      if (detail?.topic === topic) {
        setItems(loadSummaryItems(topic));
      }
    }
    window.addEventListener("summary-items-changed", handleChanged as EventListener);
    return () => {
      window.removeEventListener("summary-items-changed", handleChanged as EventListener);
    };
  }, [topic]);

  const addItem = useCallback(
    (item: SummaryItem) => {
      const { added, items: next } = saveSummaryItem(topic, item);
      setItems(next);
      return added;
    },
    [topic]
  );

  const removeItemById = useCallback(
    (id: string) => {
      const next = removeSummaryItem(topic, id);
      setItems(next);
    },
    [topic]
  );

  const clearAll = useCallback(() => {
    clearSummary(topic);
    setItems([]);
  }, [topic]);

  return { items, addItem, removeItemById, clearAll };
}

