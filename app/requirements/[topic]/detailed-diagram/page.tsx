"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { resolveAppSession } from "@/lib/appSession";
import { saveInterviewAttempt } from "@/lib/saveInterviewAttempt";
import { notifySummaryItemsChanged, saveSummaryItem } from "@/lib/summaryItems";
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
    suggestedDiagramMermaid,
    suggestedDetailedDiagramMermaid,
    endToEndFlow,
    flowValidationFeedback,
    estimationFeedback,
    estimationStructured,
    schemaFeedback,
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
  const [suggestedSvg, setSuggestedSvg] = useState<string | null>(null);
  const [saveSuggestedStatus, setSaveSuggestedStatus] = useState<
    "" | "saved" | "duplicate" | "error"
  >("");
  const validateTimeoutRef = useRef<number | null>(null);

  const [attemptStatus, setAttemptStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [attemptError, setAttemptError] = useState<string | null>(null);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const runValidation = useCallback(
    (xml: string) => {
      setIsValidating(true);
      setValidationResults(null);
      setSuggestedSvg(null);
      setSaveSuggestedStatus("");
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
          exportForPngRef.current &&
          typeof msg.data === "string";
        if (isExportPng) {
          exportForPngRef.current = false;
          setIsExportingPng(false);
          const dataUrl = msg.data as string;
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
            <button
              type="button"
              disabled={attemptStatus === "saving" || !validationResults}
              onClick={async () => {
                setAttemptStatus("saving");
                setAttemptError(null);
                try {
                  const summaryKey = `summary_items_${topic}`;
                  type SavedFeedbackDiagramSummary = {
                    id: string;
                    title: string;
                    createdAt: string;
                    mermaidText: string;
                    svg: null;
                  };
                  let savedFeedbackDiagrams: SavedFeedbackDiagramSummary[] = [];
                  try {
                    const raw = window.sessionStorage.getItem(summaryKey);
                    if (raw) {
                      const parsed = JSON.parse(raw) as unknown;
                      if (Array.isArray(parsed)) {
                        savedFeedbackDiagrams = parsed
                          .map((it) => {
                            if (!it || typeof it !== "object") return null;
                            const v = it as {
                              id?: unknown;
                              title?: unknown;
                              createdAt?: unknown;
                              mermaidText?: unknown;
                            };
                            if (typeof v.id !== "string") return null;
                            return {
                              id: v.id,
                              title: typeof v.title === "string" ? v.title : "",
                              createdAt:
                                typeof v.createdAt === "string"
                                  ? v.createdAt
                                  : new Date().toISOString(),
                              mermaidText:
                                typeof v.mermaidText === "string" ? v.mermaidText : "",
                              svg: null,
                            };
                          })
                          .filter(
                            (x): x is SavedFeedbackDiagramSummary => x !== null
                          );
                      }
                    }
                  } catch {
                    // ignore parse errors
                  }

                  const llmSummary = {
                    topic: topicName,
                    validationFeedback: validationResults
                      ? {
                          feedback: validationResults.feedback,
                          improvements: validationResults.improvements,
                          suggestedDiagramMermaid: validationResults.suggestedDiagram,
                        }
                      : null,
                    suggestedDiagrams: {
                      highLevelMermaid: suggestedDiagramMermaid,
                      detailedSuggestedMermaid: suggestedDetailedDiagramMermaid,
                    },
                    flowValidationFeedback: flowValidationFeedback
                      ? {
                          correct: flowValidationFeedback.correct,
                          feedback: flowValidationFeedback.feedback,
                          improvements: flowValidationFeedback.improvements,
                        }
                      : null,
                    estimationFeedback: estimationFeedback ?? null,
                    estimationStructured: estimationStructured ?? null,
                    schemaFeedback: schemaFeedback ?? null,
                    deepDives,
                    savedFeedbackDiagrams,
                  };

                  const session = await resolveAppSession();
                  const result = await saveInterviewAttempt(
                    {
                      topicName: topicName,
                      summary: JSON.stringify(llmSummary),
                    },
                    session
                  );

                  if (!result.ok) {
                    throw new Error(result.error || "Failed to save attempt.");
                  }

                  setAttemptStatus("saved");
                } catch (err) {
                  setAttemptStatus("error");
                  setAttemptError(err instanceof Error ? err.message : "Failed to save attempt.");
                }
              }}
              className="rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-400 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {attemptStatus === "saving"
                ? "Saving..."
                : attemptStatus === "saved"
                  ? "Saved"
                  : "Finish & Save attempt"}
            </button>
            {savedPng && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
            {attemptStatus === "error" && (
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {attemptError ?? "Could not save attempt."}
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
            {validationResults.suggestedDiagram?.trim() && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/20 p-6 dark:border-amber-800 dark:bg-amber-950/20">
                <h3 className="mb-4 text-lg font-bold text-amber-900 dark:text-amber-200">
                  Suggested detailed diagram (from LLM)
                </h3>
                <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
                  Mermaid reference aligned with your requirements, APIs, schema, high-level diagram, flow, and deep dives — same format as the suggested high-level diagram.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <MermaidDiagram
                      code={validationResults.suggestedDiagram}
                      onRendered={(svg) => setSuggestedSvg(svg || null)}
                    />
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-gray-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-gray-200">
                    <code>{validationResults.suggestedDiagram}</code>
                  </pre>
                </div>
                {validationResults.suggestedDiagramPng?.startsWith("data:image") && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-amber-200/80 bg-white/60 p-3 dark:border-amber-800 dark:bg-gray-900/40">
                    <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Server-rendered PNG (optional)
                    </p>
                    <img
                      src={validationResults.suggestedDiagramPng}
                      alt="Suggested diagram PNG"
                      className="max-h-48 w-full object-contain"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = validationResults.suggestedDiagramPng;
                          a.download = "suggested-detailed-diagram.png";
                          a.click();
                        }}
                        className="font-medium text-teal-600 hover:underline dark:text-teal-400"
                      >
                        Download PNG
                      </button>
                    </p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const mermaidText = validationResults.suggestedDiagram;
                        setSuggestedDetailedDiagramMermaid(mermaidText);
                        const png = validationResults.suggestedDiagramPng;
                        if (png?.startsWith("data:image")) {
                          setSuggestedDetailedDiagramPng(png);
                        } else {
                          setSuggestedDetailedDiagramPng(null);
                        }
                        const id =
                          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                            ? crypto.randomUUID()
                            : `id-${Math.random().toString(36).slice(2)}`;
                        const item = {
                          id,
                          type: "diagram-feedback" as const,
                          topic,
                          title: "Detailed diagram feedback",
                          createdAt: new Date().toISOString(),
                          mermaidText,
                          svg: suggestedSvg ?? null,
                        };
                        const { added } = saveSummaryItem(topic, item);
                        notifySummaryItemsChanged(topic);
                        setSaveSuggestedStatus(added ? "saved" : "duplicate");
                      } catch (e) {
                        console.error("Failed to save suggested diagram to summary", e);
                        setSaveSuggestedStatus("error");
                      }
                    }}
                    className="rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-800/30"
                  >
                    Save Suggested diagram to Summary
                  </button>
                  {saveSuggestedStatus === "saved" && (
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      Saved to summary
                    </span>
                  )}
                  {saveSuggestedStatus === "duplicate" && (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Already saved
                    </span>
                  )}
                  {saveSuggestedStatus === "error" && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Could not save. Try again.
                    </span>
                  )}
                </div>
              </div>
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
