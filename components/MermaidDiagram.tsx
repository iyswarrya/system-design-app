"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
});

interface MermaidDiagramProps {
  code: string;
  /** Called with rendered SVG string (or empty string on error). */
  onRendered?: (svg: string) => void;
}

export function MermaidDiagram({ code, onRendered }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!code?.trim() || !containerRef.current) {
        if (onRendered) onRendered("");
        return;
      }
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          if (onRendered) onRendered(svg);
        }
      } catch (err) {
        console.error("Mermaid render failed", err);
        if (!cancelled) {
          if (onRendered) onRendered("");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [code, onRendered]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800 dark:bg-amber-900/10"
      aria-label="Mermaid diagram"
    />
  );
}

