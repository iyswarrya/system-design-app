"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useCallback, useEffect, useRef, useState } from "react";

const DIAGRAM_EMBED_ORIGIN = "https://embed.diagrams.net";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HighLevelDiagramPage() {
  const params = useParams();
  const topic = params.topic as string;
  const { diagramXml, setDiagramXml, setDiagramPng, setSuggestedDiagramMermaid } = useSummary();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const exportForValidateRef = useRef(false);
  const exportForPngRef = useRef(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    elements: string[];
    matched: string[];
    missed: string[];
    suggestedDiagram: string;
  } | null>(null);
  const validateTimeoutRef = useRef<number | null>(null);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const runValidation = useCallback(
    (xml: string) => {
      setIsValidating(true);
      setValidationResults(null);
      fetch(`${API_BASE}/validate-diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          diagramXml: xml,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Validation failed");
          return res.json();
        })
        .then((data) => {
          setValidationResults({
            elements: data.elements ?? [],
            matched: data.matched ?? [],
            missed: data.missed ?? [],
            suggestedDiagram: data.suggestedDiagram ?? "",
          });
        })
        .catch((err) => {
          console.error(err);
          alert("Error validating diagram. Please try again.");
        })
        .finally(() => setIsValidating(false));
    },
    [topicName]
  );

  const sendLoad = useCallback(
    (xml: string) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        JSON.stringify({ action: "load", xml: xml || "" }),
        DIAGRAM_EMBED_ORIGIN
      );
    },
    []
  );

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== DIAGRAM_EMBED_ORIGIN) return;
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (msg.event === "init") {
          setReady(true);
          sendLoad(diagramXml ?? "");
        }
        const isExportPng =
          msg.event === "export" &&
          (msg.format === "png" || msg.format === "xmlpng") &&
          exportForPngRef.current &&
          typeof msg.data === "string";
        if (isExportPng) {
          exportForPngRef.current = false;
          setIsExportingPng(false);
          const dataUrl = msg.data.startsWith("data:image") ? msg.data : "data:image/png;base64," + msg.data;
          setDiagramPng(dataUrl);
          setSaved(true);
        }
        const isExportXml =
          msg.event === "export" &&
          (msg.format === "xml" || msg.format === "xmlsvg") &&
          (msg.xml != null || msg.data != null);
        if (isExportXml) {
          let xml: string | null =
            msg.xml != null ? (msg.xml as string) : null;
          if (xml == null && typeof msg.data === "string" && msg.data.startsWith("data:")) {
            try {
              const base64 = msg.data.split(",")[1];
              if (base64) {
                const decoded = atob(base64);
                if (decoded.includes("mxfile") || decoded.includes("mxCell")) xml = decoded;
              }
            } catch {
              // ignore
            }
          }
          if (xml) {
            if (validateTimeoutRef.current) {
              clearTimeout(validateTimeoutRef.current);
              validateTimeoutRef.current = null;
            }
            if (exportForValidateRef.current) {
              exportForValidateRef.current = false;
              runValidation(xml);
            } else {
              setDiagramXml(xml);
              if (!exportForPngRef.current) setSaved(true);
            }
          }
        }
        if (msg.event === "save" && msg.xml != null) {
          setDiagramXml(msg.xml);
        }
      } catch {
        // ignore non-JSON or invalid messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [diagramXml, setDiagramXml, setDiagramPng, sendLoad, runValidation]);

  const handleSaveToSummaryAsPng = () => {
    exportForValidateRef.current = false;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    exportForPngRef.current = true;
    setIsExportingPng(true);
    win.postMessage(
      JSON.stringify({ action: "export", format: "png" }),
      DIAGRAM_EMBED_ORIGIN
    );
    win.postMessage(
      JSON.stringify({ action: "export", format: "xmlsvg" }),
      DIAGRAM_EMBED_ORIGIN
    );
    window.setTimeout(() => {
      if (exportForPngRef.current) {
        exportForPngRef.current = false;
        setIsExportingPng(false);
      }
    }, 8000);
  };

  const handleValidate = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    setValidationResults(null);
    // Use saved diagram if we have it (always works); otherwise request export from iframe
    if (diagramXml && diagramXml.trim().length > 0) {
      runValidation(diagramXml);
      return;
    }
    setIsValidating(true);
    exportForValidateRef.current = true;
    win.postMessage(
      JSON.stringify({ action: "export", format: "xmlsvg" }),
      DIAGRAM_EMBED_ORIGIN
    );
    // If no export response in 5s, validation might not have started; stop loading state
    validateTimeoutRef.current = window.setTimeout(() => {
      if (exportForValidateRef.current) {
        exportForValidateRef.current = false;
        setIsValidating(false);
        if (diagramXml && diagramXml.trim().length > 0) {
          runValidation(diagramXml);
        } else {
          alert(
            "Could not get diagram from editor. Draw something, click \"Save user's diagram to summary as PNG\", then click \"Validate diagram\" again."
          );
        }
      }
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/requirements/${topic}/api-design`}
              className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              ← Back to API design
            </Link>
            <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              {topicName} – High-level diagram
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Draw your system architecture with diagrams.net (draw.io). Save your diagram as PNG to add it to your interview summary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isValidating ? "Validating..." : "Validate diagram"}
            </button>
            <button
              type="button"
              onClick={handleSaveToSummaryAsPng}
              disabled={isExportingPng}
              className="rounded-xl border-2 border-purple-400 bg-white px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              {isExportingPng ? "Exporting..." : "Save user's diagram to summary as PNG"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
            <Link
              href={`/requirements/${topic}/back-of-envelope`}
              className="rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: Back of envelope →
            </Link>
          </div>
        </div>

        {validationResults?.suggestedDiagram && (
          <div className="mb-6 rounded-2xl border-2 border-purple-200 bg-white/95 p-6 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-800/95">
            <h2 className="mb-4 text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Suggested high-level diagram (from LLM)
            </h2>
            <pre className="max-h-64 overflow-auto rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-gray-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-gray-200">
              <code>{validationResults.suggestedDiagram}</code>
            </pre>
            <button
              type="button"
              onClick={() => {
                setSuggestedDiagramMermaid(validationResults.suggestedDiagram);
              }}
              className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-800/30"
            >
              Add suggested diagram to summary
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border-2 border-purple-200 bg-white shadow-xl dark:border-purple-800 dark:bg-gray-900">
          <iframe
            key={topic}
            ref={iframeRef}
            title="High-level diagram editor (draw.io)"
            src="https://embed.diagrams.net/?embed=1&proto=json&spin=1&saveAndExit=0"
            className="h-[calc(100vh-14rem)] min-h-[480px] w-full"
          />
        </div>
      </main>
    </div>
  );
}
