"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useState, useEffect } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function EndToEndFlowPage() {
  const params = useParams();
  const topic = params.topic as string;
  const { endToEndFlow, setEndToEndFlow, setFlowValidationFeedback, diagramXml } = useSummary();
  const [flowText, setFlowText] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    correct: boolean;
    feedback: string;
    improvements: string;
  } | null>(null);

  useEffect(() => {
    if (endToEndFlow) setFlowText(endToEndFlow);
  }, [topic]);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const handleValidate = async () => {
    if (!flowText.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    setSavedFeedback(false);
    try {
      const res = await fetch(`${API_BASE}/validate-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          flowSummary: flowText.trim(),
          diagramXml: diagramXml || "",
        }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setValidationResult({
        correct: data.correct ?? false,
        feedback: data.feedback ?? "",
        improvements: data.improvements ?? "",
      });
    } catch (err) {
      console.error(err);
      alert("Error validating flow. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    setEndToEndFlow(flowText.trim() || null);
    setSaved(true);
  };

  const handleSaveFeedback = () => {
    if (!validationResult) return;
    setFlowValidationFeedback({
      correct: validationResult.correct,
      feedback: validationResult.feedback,
      improvements: validationResult.improvements,
    });
    setSavedFeedback(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href={`/requirements/${topic}/data-model`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to database schema
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName} – End-to-end flow
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Describe the end-to-end flow (e.g. how a request or data moves through the system). Your answer will be validated against your saved high-level diagram.
          </p>
        </div>

        <section className="rounded-2xl border-2 border-purple-200 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-800/90">
          <h2 className="mb-4 text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            Flow summary
          </h2>
          <textarea
            value={flowText}
            onChange={(e) => {
              setFlowText(e.target.value);
              setSaved(false);
              setSavedFeedback(false);
              setValidationResult(null);
            }}
            placeholder="e.g. User request hits the load balancer, which forwards to API servers. API servers check cache; on miss they read from the database and optionally write to cache. Response is returned to the client."
            rows={12}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-400"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !flowText.trim()}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">
                {isValidating ? "Validating..." : "Validate flow"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!flowText.trim()}
              className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              Save flow to summary
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Flow saved to interview summary
              </span>
            )}
            {savedFeedback && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Flow validation feedback saved
              </span>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-purple-200 pt-6 dark:border-purple-700">
            <Link
              href={`/requirements/${topic}/deep-dives`}
              className="rounded-xl bg-gray-800 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: Deep dives →
            </Link>
            <Link
              href={`/requirements/${topic}`}
              className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ← Back to requirements
            </Link>
          </div>
        </section>

        {validationResult && (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Flow validation feedback
            </h2>
            <div
              className={`rounded-xl border-2 p-6 ${
                validationResult.correct
                  ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                  : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
              }`}
            >
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {validationResult.correct ? "✓ Flow looks correct" : "⚠ Flow needs improvement"}
              </p>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                {validationResult.feedback}
              </p>
              {validationResult.improvements && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Suggested improvements
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {validationResult.improvements}
                  </p>
                </div>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSaveFeedback}
                  className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                >
                  Save flow validation feedback to summary
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
