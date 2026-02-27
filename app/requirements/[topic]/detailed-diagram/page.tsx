"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useCallback, useEffect, useRef, useState } from "react";

const DIAGRAM_EMBED_ORIGIN = "https://embed.diagrams.net";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DetailedDiagramPage() {
  const params = useParams();
  const topic = params.topic as string;
  const {
    detailedDiagramXml,
    setDetailedDiagramXml,
    setSuggestedDetailedDiagramMermaid,
    setSuggestedDetailedDiagramPng,
    setDetailedDiagramPng,
    requirements,
    apiDesign,
    dataModel,
    diagramXml: highLevelDiagramXml,
    endToEndFlow,
    deepDives,
  } = useSummary();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [savedPng, setSavedPng] = useState(false);
  const [ready, setReady] = useState(false);
  const exportForValidateRef = useRef(false);
  const exportForPngRef = useRef(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    feedback: string;
    improvements: string;
    suggestedDiagram: string;
    suggestedDiagramPng: string;
  } | null>(null);
  const [generatedBlockDiagramPng, setGeneratedBlockDiagramPng] = useState<string>("");
  const [generatedPngLoading, setGeneratedPngLoading] = useState(false);
  const validateTimeoutRef = useRef<number | null>(null);

  const KROKI_URL = "https://kroki.io";

  useEffect(() => {
    if (!validationResults?.suggestedDiagram?.trim() || validationResults.suggestedDiagramPng) {
      setGeneratedBlockDiagramPng("");
      setGeneratedPngLoading(false);
      return;
    }
    let cancelled = false;
    setGeneratedPngLoading(true);
    setGeneratedBlockDiagramPng("");
    fetch(`${KROKI_URL}/d2/png`, {
      method: "POST",
      body: validationResults.suggestedDiagram.trim(),
      headers: { "Content-Type": "text/plain" },
    })
      .then((res) => {
        if (cancelled || !res.ok) return null;
        return res.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return null;
        return new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });
      })
      .then((dataUrl) => {
        if (!cancelled && dataUrl) setGeneratedBlockDiagramPng(dataUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGeneratedPngLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [validationResults?.suggestedDiagram, validationResults?.suggestedDiagramPng]);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const runValidation = useCallback(
    (xml: string) => {
      setIsValidating(true);
      setValidationResults(null);
      setGeneratedBlockDiagramPng("");
      setGeneratedPngLoading(false);
      const deepDivesPayload = (deepDives ?? []).map((d) => ({
        topic: d.topic,
        userSummary: d.userSummary ?? "",
        suggestedSummary: d.suggestedSummary ?? "",
      }));
      const requirementsPayload = requirements
        ? { functional: requirements.functional ?? [], nonFunctional: requirements.nonFunctional ?? [] }
        : undefined;
      const apiDesignPayload = (apiDesign ?? []).map((row) => ({
        api: row.api,
        request: row.request ?? "",
        response: row.response ?? "",
      }));
      fetch(`${API_BASE}/validate-detailed-diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          diagramXml: xml,
          requirements: requirementsPayload,
          apiDesign: apiDesignPayload,
          dataModel: dataModel ?? [],
          highLevelDiagramXml: highLevelDiagramXml ?? "",
          endToEndFlow: endToEndFlow ?? "",
          deepDives: deepDivesPayload,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Validation failed");
          return res.json();
        })
        .then((data) => {
          setValidationResults({
            feedback: data.feedback ?? "",
            improvements: data.improvements ?? "",
            suggestedDiagram: data.suggestedDiagram ?? "",
            suggestedDiagramPng: data.suggestedDiagramPng ?? "",
          });
        })
        .catch((err) => {
          console.error(err);
          alert("Error validating diagram. Please try again.");
        })
        .finally(() => setIsValidating(false));
    },
    [topicName, requirements, apiDesign, dataModel, highLevelDiagramXml, endToEndFlow, deepDives]
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
          sendLoad(detailedDiagramXml ?? "");
        }
        const isExportPng =
          msg.event === "export" &&
          (msg.format === "png" || msg.format === "xmlpng") &&
          exportForPngRef.current;
        if (isExportPng && typeof msg.data === "string") {
          exportForPngRef.current = false;
          setIsExportingPng(false);
          let dataUrl = msg.data;
          if (dataUrl.startsWith("data:image")) {
            setDetailedDiagramPng(dataUrl);
            setSavedPng(true);
          } else if (dataUrl.length > 0 && !dataUrl.startsWith("data:")) {
            setDetailedDiagramPng("data:image/png;base64," + dataUrl);
            setSavedPng(true);
          }
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
              setDetailedDiagramXml(xml);
            }
          }
        }
        if (msg.event === "save" && msg.xml != null) {
          setDetailedDiagramXml(msg.xml);
        }
      } catch {
        // ignore non-JSON or invalid messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [detailedDiagramXml, setDetailedDiagramXml, setDetailedDiagramPng, sendLoad, runValidation]);

  const handleSaveUserDiagramAsPng = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    exportForPngRef.current = true;
    setIsExportingPng(true);
    win.postMessage(
      JSON.stringify({ action: "export", format: "png" }),
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
    if (detailedDiagramXml && detailedDiagramXml.trim().length > 0) {
      runValidation(detailedDiagramXml);
      return;
    }
    setIsValidating(true);
    exportForValidateRef.current = true;
    win.postMessage(
      JSON.stringify({ action: "export", format: "xmlsvg" }),
      DIAGRAM_EMBED_ORIGIN
    );
    validateTimeoutRef.current = window.setTimeout(() => {
      if (exportForValidateRef.current) {
        exportForValidateRef.current = false;
        setIsValidating(false);
        if (detailedDiagramXml && detailedDiagramXml.trim().length > 0) {
          runValidation(detailedDiagramXml);
        } else {
          alert(
            "Could not get diagram from editor. Draw something, click \"Save the user's diagram as PNG\", then click \"Validate diagram\" again."
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
              href={`/requirements/${topic}/deep-dives`}
              className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              ← Back to deep dives
            </Link>
            <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              {topicName} – Detailed design diagram
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Draw a more detailed system design (components, data flow, scaling) with diagrams.net (draw.io). Validation checks your diagram against requirements, API design, database schema, high-level diagram, end-to-end flow, and deep dives. Export as PNG to save an image to your summary.
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
              onClick={handleSaveUserDiagramAsPng}
              disabled={isExportingPng}
              className="rounded-xl border-2 border-teal-500 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-50 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
            >
              {isExportingPng ? "Exporting..." : "Save the user's diagram as PNG"}
            </button>
            {savedPng && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
            <Link
              href={`/requirements/${topic}`}
              className="rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              ← Back to requirements
            </Link>
          </div>
        </div>

        {validationResults && (
          <div className="mb-6 space-y-6 rounded-2xl border-2 border-purple-200 bg-white/95 p-6 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-800/95">
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Validation feedback (based on requirements, API design, schema, high-level diagram, flow and deep dives)
            </h2>
            {(validationResults.feedback || validationResults.improvements) && (
              <div className="space-y-4">
                {validationResults.feedback && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Feedback</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{validationResults.feedback}</p>
                  </div>
                )}
                {validationResults.improvements && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Improvements</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{validationResults.improvements}</p>
                  </div>
                )}
              </div>
            )}
            {(validationResults.suggestedDiagramPng || generatedBlockDiagramPng || validationResults.suggestedDiagram) && (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suggested detailed diagram (system-design block diagram)</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">The LLM suggests a block diagram (D2, rendered as PNG) that aligns with everything discussed.</p>
                  {(validationResults.suggestedDiagramPng || generatedBlockDiagramPng) ? (
                    <div className="mt-3 overflow-hidden rounded-xl border-2 border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/20">
                      <img
                        src={validationResults.suggestedDiagramPng || generatedBlockDiagramPng}
                        alt="Suggested block diagram"
                        className="max-h-96 w-full object-contain"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <button
                          type="button"
                          onClick={() => {
                            const src = validationResults.suggestedDiagramPng || generatedBlockDiagramPng;
                            const a = document.createElement("a");
                            a.href = src;
                            a.download = "suggested-block-diagram.png";
                            a.click();
                          }}
                          className="font-medium text-teal-600 hover:underline dark:text-teal-400"
                        >
                          Download image
                        </button>
                      </p>
                    </div>
                  ) : (
                    <>
                      <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-gray-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-gray-200">
                        <code>{validationResults.suggestedDiagram}</code>
                      </pre>
                      {generatedPngLoading && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Generating image from D2…</p>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const png = validationResults.suggestedDiagramPng || generatedBlockDiagramPng;
                    if (png) setSuggestedDetailedDiagramPng(png);
                    if (validationResults.suggestedDiagram) {
                      setSuggestedDetailedDiagramMermaid(validationResults.suggestedDiagram);
                    }
                  }}
                  className="rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-800/30"
                >
                  Save suggested feedback and diagram to summary
                </button>
              </>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border-2 border-purple-200 bg-white shadow-xl dark:border-purple-800 dark:bg-gray-900">
          <iframe
            key={topic}
            ref={iframeRef}
            title="Detailed design diagram editor (draw.io)"
            src="https://embed.diagrams.net/?embed=1&proto=json&spin=1&saveAndExit=0"
            className="h-[calc(100vh-14rem)] min-h-[480px] w-full"
          />
        </div>
      </main>
    </div>
  );
}
