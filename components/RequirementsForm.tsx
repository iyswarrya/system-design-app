"use client";

import Link from "next/link";
import { useState } from "react";
import { useSummary } from "@/context/SummaryContext";
import RequirementsSection from "./RequirementsSection";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RequirementsFormProps {
  topic: string;
  topicSlug: string;
}

export default function RequirementsForm({ topic, topicSlug }: RequirementsFormProps) {
  const { setRequirements } = useSummary();
  const [functionalReqs, setFunctionalReqs] = useState<string[]>([""]);
  const [nonFunctionalReqs, setNonFunctionalReqs] = useState<string[]>([""]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    functional: string[];
    nonFunctional: string[];
    functionalMatched: string[];
    functionalMissed: string[];
    nonFunctionalMatched: string[];
    nonFunctionalMissed: string[];
  } | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          functionalReqs: functionalReqs.filter((r) => r.trim() !== ""),
          nonFunctionalReqs: nonFunctionalReqs.filter((r) => r.trim() !== ""),
        }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const results = await res.json();
      setValidationResults({
        functional: results.functional ?? [],
        nonFunctional: results.nonFunctional ?? [],
        functionalMatched: results.functionalMatched ?? [],
        functionalMissed: results.functionalMissed ?? [],
        nonFunctionalMatched: results.nonFunctionalMatched ?? [],
        nonFunctionalMissed: results.nonFunctionalMissed ?? [],
      });
    } catch (error) {
      console.error("Validation error:", error);
      alert("Error validating requirements. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-8">
      <RequirementsSection
        title="Functional Requirements"
        requirements={functionalReqs}
        setRequirements={setFunctionalReqs}
        placeholder="e.g., Users should be able to shorten URLs"
      />

      <RequirementsSection
        title="Non-Functional Requirements"
        requirements={nonFunctionalReqs}
        setRequirements={setNonFunctionalReqs}
        placeholder="e.g., System should handle 1000 requests per second"
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <span className="relative z-10">
            {isValidating ? "Validating..." : "Validate Requirements"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-400 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        </button>
        <button
          type="button"
          onClick={() => {
            const func = validationResults?.functional ?? functionalReqs.filter((r) => r.trim() !== "");
            const nonFunc = validationResults?.nonFunctional ?? nonFunctionalReqs.filter((r) => r.trim() !== "");
            if (func.length || nonFunc.length) {
              setRequirements({ functional: func, nonFunctional: nonFunc });
            }
          }}
          className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
        >
          Save to summary
        </button>
        <Link
          href={`/requirements/${topicSlug}/api-design`}
          className="rounded-xl bg-gray-800 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Next: API design →
        </Link>
      </div>

      {validationResults && (
        <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            Validation Results
          </h2>
          
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-300/10 to-purple-500/10 p-6 dark:from-indigo-500/20 dark:via-purple-300/20 dark:to-purple-500/20">
              <h3 className="mb-4 text-xl font-semibold text-indigo-700 dark:text-indigo-300">
                Top 5 Functional Requirements
              </h3>
              <ul className="mb-4 space-y-3 pl-6 text-gray-700 dark:text-gray-300">
                {validationResults.functional.map((req, idx) => (
                  <li key={idx} className="relative before:absolute before:-left-4 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-r before:from-indigo-400 before:via-purple-300 before:to-purple-400">
                    {req}
                  </li>
                ))}
              </ul>
              <div className="space-y-2 border-t border-indigo-200/60 pt-4 dark:border-indigo-700/60">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  You got these right ({validationResults.functionalMatched.length}):
                </p>
                {validationResults.functionalMatched.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.functionalMatched.map((req, idx) => (
                      <li key={idx} className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-green-500">
                        {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">None of your answers matched these.</p>
                )}
                <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  You missed ({validationResults.functionalMissed.length}):
                </p>
                {validationResults.functionalMissed.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.functionalMissed.map((req, idx) => (
                      <li key={idx} className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-500">
                        {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">You covered all of these.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-300/10 to-purple-500/10 p-6 dark:from-pink-500/20 dark:via-purple-300/20 dark:to-purple-500/20">
              <h3 className="mb-4 text-xl font-semibold text-pink-700 dark:text-pink-300">
                Top 5 Non-Functional Requirements
              </h3>
              <ul className="mb-4 space-y-3 pl-6 text-gray-700 dark:text-gray-300">
                {validationResults.nonFunctional.map((req, idx) => (
                  <li key={idx} className="relative before:absolute before:-left-4 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-r before:from-pink-400 before:via-purple-300 before:to-purple-400">
                    {req}
                  </li>
                ))}
              </ul>
              <div className="space-y-2 border-t border-pink-200/60 pt-4 dark:border-pink-700/60">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  You got these right ({validationResults.nonFunctionalMatched.length}):
                </p>
                {validationResults.nonFunctionalMatched.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.nonFunctionalMatched.map((req, idx) => (
                      <li key={idx} className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-green-500">
                        {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">None of your answers matched these.</p>
                )}
                <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  You missed ({validationResults.nonFunctionalMissed.length}):
                </p>
                {validationResults.nonFunctionalMissed.length > 0 ? (
                  <ul className="space-y-1 pl-6 text-gray-700 dark:text-gray-300">
                    {validationResults.nonFunctionalMissed.map((req, idx) => (
                      <li key={idx} className="relative before:absolute before:-left-4 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-500">
                        {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-2 text-sm text-gray-500 dark:text-gray-400">You covered all of these.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}