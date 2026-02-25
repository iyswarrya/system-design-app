"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BackOfEnvelopePage() {
  const params = useParams();
  const topic = params.topic as string;
  const { setEstimation } = useSummary();
  const [estimationLines, setEstimationLines] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    elements: string[];
    matched: string[];
    missed: string[];
    calculationFeedback: { userLine: string; reasonable: boolean; comment: string }[];
  } | null>(null);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const userEstimations = estimationLines
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSave = () => {
    // Save the user's full estimation lines (with numbers and derivations) to the interview summary
    setEstimation(userEstimations);
    setSaved(true);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResults(null);
    try {
      const res = await fetch(`${API_BASE}/validate-estimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, estimations: userEstimations }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setValidationResults({
        elements: data.elements ?? [],
        matched: data.matched ?? [],
        missed: data.missed ?? [],
        calculationFeedback: data.calculationFeedback ?? [],
      });
    } catch (err) {
      console.error(err);
      alert("Error validating estimation. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href={`/requirements/${topic}/high-level-diagram`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to high-level diagram
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName} – Back of the envelope
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            List the key back-of-the-envelope estimates for this system (e.g. DAU/MAU, QPS, storage, bandwidth).
          </p>
        </div>

        <section className="rounded-2xl border-2 border-purple-200 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-800/90">
          <h2 className="mb-4 text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            Estimation items
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Enter one estimation item per line. Include numbers and derivations when you can (e.g. DAU: 100M, QPS: 50k = 100M×5/86400)—the second step will review whether your calculations are reasonable.
          </p>
          <textarea
            value={estimationLines}
            onChange={(e) => {
              setEstimationLines(e.target.value);
              setSaved(false);
            }}
            placeholder={"DAU / MAU or user scale\nQueries per second (QPS)\nStorage size\nBandwidth\nRead/write ratio"}
            rows={10}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-400"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">
                {isValidating ? "Validating..." : "Validate estimation"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!estimationLines.trim()}
              className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              Save estimations to summary
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Estimations saved to interview summary
              </span>
            )}
            <Link
              href={`/requirements/${topic}/data-model`}
              className="rounded-xl bg-gray-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: Database schema →
            </Link>
          </div>
        </section>

        {validationResults && (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Estimation validation results
            </h2>
            {(validationResults.calculationFeedback.length > 0 || validationResults.missed.length > 0) && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-300/10 to-cyan-500/10 p-6 dark:from-emerald-500/20 dark:via-teal-300/20 dark:to-cyan-500/20">
                <h3 className="mb-4 text-xl font-semibold text-emerald-800 dark:text-emerald-300">
                  Calculation feedback
                </h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Review of your numbers and derivations (per line).
                  {validationResults.missed.length > 0 && " Items you didn’t cover are listed below so you can add estimates for them."}
                </p>
                {validationResults.missed.length > 0 && (
                  <div className="mb-6 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Items you didn’t cover ({validationResults.missed.length})
                    </p>
                    <ul className="mt-2 space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {validationResults.missed.map((item, idx) => (
                        <li key={idx} className="list-disc">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationResults.calculationFeedback.length > 0 && (
                <ul className="space-y-4">
                  {validationResults.calculationFeedback.map((fb, idx) => (
                    <li
                      key={idx}
                      className={`rounded-lg border-2 p-4 ${
                        fb.reasonable
                          ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                          : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 shrink-0 text-lg"
                          title={fb.reasonable ? "Reasonable" : "Review suggested"}
                          aria-hidden
                        >
                          {fb.reasonable ? "✓" : "⚠"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {fb.userLine}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {fb.comment}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
