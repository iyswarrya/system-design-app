"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useState, useEffect } from "react";
import type { ApiDesignRow } from "@/context/SummaryContext";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const emptyRow = (): ApiDesignRow => ({ api: "", request: "", response: "" });

export default function ApiDesignPage() {
  const params = useParams();
  const topic = params.topic as string;
  const { apiDesign: savedApiDesign, setApiDesign } = useSummary();
  const [apiRows, setApiRows] = useState<ApiDesignRow[]>(() => [emptyRow()]);
  const [savedMy, setSavedMy] = useState(false);
  const [savedSuggested, setSavedSuggested] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    apis: string[];
    matched: string[];
    missed: string[];
  } | null>(null);

  useEffect(() => {
    if (savedApiDesign && savedApiDesign.length > 0) {
      setApiRows(savedApiDesign);
    }
  }, [topic]);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const userApis = apiRows.map((r) => r.api.trim()).filter(Boolean);

  const setRow = (index: number, field: keyof ApiDesignRow, value: string) => {
    setApiRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSavedMy(false);
    setSavedSuggested(false);
  };

  const addRow = () => {
    setApiRows((prev) => [...prev, emptyRow()]);
    setSavedMy(false);
    setSavedSuggested(false);
  };

  const removeRow = (index: number) => {
    if (apiRows.length <= 1) return;
    setApiRows((prev) => prev.filter((_, i) => i !== index));
    setSavedMy(false);
    setSavedSuggested(false);
  };

  const handleSaveMy = () => {
    setApiDesign(apiRows.filter((r) => r.api.trim()));
    setSavedMy(true);
    setSavedSuggested(false);
  };

  const handleSaveSuggested = () => {
    if (!validationResults?.apis?.length) return;
    setApiDesign(
      validationResults.apis.map((api) => ({ api, request: "", response: "" }))
    );
    setSavedSuggested(true);
    setSavedMy(false);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResults(null);
    setSavedMy(false);
    setSavedSuggested(false);
    try {
      const res = await fetch(`${API_BASE}/validate-apis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, apis: userApis }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setValidationResults({
        apis: data.apis ?? [],
        matched: data.matched ?? [],
        missed: data.missed ?? [],
      });
    } catch (err) {
      console.error(err);
      alert("Error validating APIs. Please try again.");
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
            href={`/requirements/${topic}`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to requirements
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName}
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Define the APIs you expect from the system (e.g. endpoints, methods, purpose).
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/20 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/15 dark:to-indigo-900/15">
            <h2 className="mb-6 text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              API design
            </h2>
            <div className="space-y-4">
              {apiRows.map((row, index) => (
                <div key={index} className="flex flex-wrap items-stretch gap-3">
                  <input
                    type="text"
                    value={row.api}
                    onChange={(e) => setRow(index, "api", e.target.value)}
                    placeholder="e.g. POST /shorten – create short URL"
                    className="min-w-[200px] flex-1 rounded-xl border-2 border-gray-200 bg-white/90 px-4 py-3 text-base text-gray-900 placeholder-gray-400 shadow-md transition-all focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-300"
                  />
                  <input
                    type="text"
                    value={row.request}
                    onChange={(e) => setRow(index, "request", e.target.value)}
                    placeholder="Input / request"
                    className="min-w-[120px] flex-1 rounded-xl border-2 border-gray-200 bg-white/90 px-4 py-3 text-base text-gray-900 placeholder-gray-400 shadow-md transition-all focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-300"
                  />
                  <input
                    type="text"
                    value={row.response}
                    onChange={(e) => setRow(index, "response", e.target.value)}
                    placeholder="Output / response"
                    className="min-w-[120px] flex-1 rounded-xl border-2 border-gray-200 bg-white/90 px-4 py-3 text-base text-gray-900 placeholder-gray-400 shadow-md transition-all focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-300"
                  />
                  {apiRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 px-4 py-3 font-medium text-red-700 shadow-md transition-all hover:scale-105 dark:border-red-800 dark:from-red-900/20 dark:to-pink-900/20 dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-6 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-indigo-50 via-purple-50 to-purple-50 px-6 py-3 font-semibold text-purple-700 shadow-md transition-all hover:scale-105 dark:border-purple-700 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-purple-900/20 dark:text-purple-300"
            >
              + Add API
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">
                {isValidating ? "Validating..." : "Validate APIs"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSaveMy}
              disabled={userApis.length === 0}
              className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              Save my API design to summary
            </button>
            <button
              type="button"
              onClick={handleSaveSuggested}
              disabled={!validationResults?.apis?.length}
              className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              Save suggested API feedback to summary
            </button>
            {savedMy && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                My API design saved
              </span>
            )}
            {savedSuggested && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Suggested API feedback saved
              </span>
            )}
            <Link
              href={`/requirements/${topic}/high-level-diagram`}
              className="rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: High-level diagram →
            </Link>
          </div>
        </div>

        {validationResults && (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              API validation results
            </h2>
            <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-300/10 to-purple-500/10 p-6 dark:from-indigo-500/20 dark:via-purple-300/20 dark:to-purple-500/20">
              <h3 className="mb-4 text-xl font-semibold text-indigo-700 dark:text-indigo-300">
                Top 5 APIs
              </h3>
              <ul className="mb-4 space-y-3 pl-6 text-gray-700 dark:text-gray-300">
                {validationResults.apis.map((api, idx) => (
                  <li
                    key={idx}
                    className="relative before:absolute before:-left-4 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-r before:from-indigo-400 before:via-purple-300 before:to-purple-400"
                  >
                    {api}
                  </li>
                ))}
              </ul>
              <div className="space-y-2 border-t border-indigo-200/60 pt-4 dark:border-indigo-700/60">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  You got these right ({validationResults.matched.length}):
                </p>
                {validationResults.matched.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.matched.map((api, idx) => (
                      <li
                        key={idx}
                        className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-green-500"
                      >
                        {api}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">
                    None of your answers matched these.
                  </p>
                )}
                <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  You missed ({validationResults.missed.length}):
                </p>
                {validationResults.missed.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.missed.map((api, idx) => (
                      <li
                        key={idx}
                        className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-500"
                      >
                        {api}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">
                    You covered all of these.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
