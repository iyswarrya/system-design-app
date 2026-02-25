"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useState } from "react";
import RequirementsSection from "@/components/RequirementsSection";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DatabaseSchemaPage() {
  const params = useParams();
  const topic = params.topic as string;
  const { setDataModel, setSchemaFeedback, apiDesign } = useSummary();
  const [schemaItems, setSchemaItems] = useState<string[]>([""]);
  const [saved, setSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    elements: string[];
    matched: string[];
    missed: string[];
    feedback: { userLine: string; reasonable: boolean; comment: string }[];
    suggestedMissingTables?: string[];
  } | null>(null);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const userSchemaLines = schemaItems
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSave = () => {
    setDataModel(userSchemaLines);
    setSchemaFeedback(null);
    setSaved(true);
  };

  const handleSaveCorrect = () => {
    if (!validationResults?.elements?.length) return;
    setDataModel(validationResults.elements);
    setSchemaFeedback(
      validationResults.feedback?.length
        ? validationResults.feedback.map((fb) => ({
            userLine: fb.userLine,
            reasonable: fb.reasonable,
            comment: fb.comment,
          }))
        : null
    );
    setSaved(true);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResults(null);
    try {
      const res = await fetch(`${API_BASE}/validate-data-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          dataModel: userSchemaLines,
          apiDesign: (apiDesign ?? []).map((r) => r.api).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setValidationResults({
        elements: data.elements ?? [],
        matched: data.matched ?? [],
        missed: data.missed ?? [],
        feedback: data.feedback ?? [],
        suggestedMissingTables: data.suggestedMissingTables ?? [],
      });
    } catch (err) {
      console.error(err);
      alert("Error validating database schema. Please try again.");
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
            href={`/requirements/${topic}/back-of-envelope`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to back of envelope
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName} – Database schema
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Define the database schema for this system (tables, key attributes, relationships, indexes).
          </p>
        </div>

        <div className="space-y-6">
          <RequirementsSection
            title="Database schema"
            requirements={schemaItems}
            setRequirements={setSchemaItems}
            placeholder="e.g. Users (id, email, createdAt), ShortUrl (shortCode, longUrl, userId), Index on shortCode"
            addButtonLabel="+ Add schema item"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">
                {isValidating ? "Validating..." : "Validate database schema"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={userSchemaLines.length === 0}
              className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              Save my schema to summary
            </button>
            {validationResults?.elements?.length ? (
              <button
                type="button"
                onClick={handleSaveCorrect}
                className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                Save correct schema to summary
              </button>
            ) : null}
            {saved && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Database schema saved to interview summary
              </span>
            )}
            <Link
              href={`/requirements/${topic}/end-to-end-flow`}
              className="rounded-xl bg-gray-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: End-to-end flow →
            </Link>
          </div>
        </div>

        {validationResults && (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Database schema validation results
            </h2>

            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-300/10 to-fuchsia-500/10 p-6 dark:from-violet-500/20 dark:via-purple-300/20 dark:to-fuchsia-500/20">
              <h3 className="mb-4 text-xl font-semibold text-violet-800 dark:text-violet-300">
                Schema feedback
              </h3>

              {(() => {
                const missedTables = validationResults.missed.filter(
                  (item) => item.includes("(") && item.includes(")")
                );
                return missedTables.length > 0 ? (
                <div className="mb-6">
                  <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Missing tables / suggested to add
                  </p>
                  <ul className="space-y-2 pl-4">
                    {missedTables.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
                      >
                        <span className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden>+</span>
                        <span className="text-gray-800 dark:text-gray-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                ) : null;
              })()}

              {validationResults.suggestedMissingTables && validationResults.suggestedMissingTables.length > 0 && (
                <div className="mb-6">
                  <p className="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Suggested tables based on API design
                  </p>
                  <ul className="space-y-2 pl-4">
                    {validationResults.suggestedMissingTables
                      .filter((item) => item.includes("(") && item.includes(")"))
                      .map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
                        >
                          <span className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden>+</span>
                          <span className="text-gray-800 dark:text-gray-200">{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {validationResults.feedback.length > 0 && (
                <>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Review of your schema items (keys, missing fields, API alignment):
                  </p>
                  <ul className="space-y-4">
                    {validationResults.feedback.map((fb, idx) => (
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
                            title={fb.reasonable ? "Looks good" : "Review suggested"}
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
                </>
              )}

              {validationResults.missed.length === 0 && validationResults.feedback.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No schema items to review. Add items above and validate.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
