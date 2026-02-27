"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useState, useEffect } from "react";
import type { DeepDiveItem } from "@/context/SummaryContext";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DeepDivesPage() {
  const params = useParams();
  const topic = params.topic as string;
  const { deepDives: savedDeepDives, setDeepDives } = useSummary();
  const [items, setItems] = useState<{ topic: string; userSummary: string }[]>([{ topic: "", userSummary: "" }]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [savedUser, setSavedUser] = useState(false);
  const [savedSuggested, setSavedSuggested] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<Array<{ topic: string; suggestedSummary: string; feedback: string }> | null>(null);
  const [suggestedMissingTopics, setSuggestedMissingTopics] = useState<string[]>([]);

  useEffect(() => {
    if (savedDeepDives && savedDeepDives.length > 0) {
      setItems(
        savedDeepDives.map((d) => ({ topic: d.topic, userSummary: d.userSummary ?? "" }))
      );
    }
  }, [topic]);

  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const toggleElaborate = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const setTopic = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], topic: value };
      return next;
    });
    setValidationResult(null);
  };

  const setUserSummary = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], userSummary: value };
      return next;
    });
    setValidationResult(null);
  };

  const addTopic = () => {
    setItems((prev) => [...prev, { topic: "", userSummary: "" }]);
    setValidationResult(null);
  };

  const removeTopic = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(index);
      const shifted = new Set<number>();
      next.forEach((i) => {
        if (i > index) shifted.add(i - 1);
        else shifted.add(i);
      });
      return shifted;
    });
    setValidationResult(null);
  };

  const handleValidate = async () => {
    const withTopic = items.filter((i) => i.topic.trim());
    if (!withTopic.length) return;
    setIsValidating(true);
    setValidationResult(null);
    setSuggestedMissingTopics([]);
    setSavedUser(false);
    setSavedSuggested(false);
    try {
      const res = await fetch(`${API_BASE}/validate-deep-dives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          deepDives: withTopic.map((i) => ({ topic: i.topic.trim(), userSummary: i.userSummary.trim() })),
        }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setValidationResult((data.items ?? []).map((x: { topic: string; suggestedSummary: string; feedback: string }) => ({
        topic: x.topic ?? "",
        suggestedSummary: x.suggestedSummary ?? "",
        feedback: x.feedback ?? "",
      })));
      setSuggestedMissingTopics(Array.isArray(data.suggestedMissingTopics) ? data.suggestedMissingTopics : []);
    } catch (err) {
      console.error(err);
      alert("Error validating deep dives. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const addMissingTopics = () => {
    const existing = new Set(items.map((i) => i.topic.trim().toLowerCase()));
    const toAdd = suggestedMissingTopics.filter((t) => t.trim() && !existing.has(t.trim().toLowerCase()));
    if (toAdd.length === 0) return;
    setItems((prev) => [...prev, ...toAdd.map((topic) => ({ topic, userSummary: "" }))]);
    setSuggestedMissingTopics((prev) => prev.filter((t) => !toAdd.includes(t)));
  };

  const handleSaveUserSummary = () => {
    const toSave = items
      .filter((i) => i.topic.trim())
      .map((i) => ({ topic: i.topic.trim(), userSummary: i.userSummary.trim() }));
    setDeepDives(toSave.map((i) => ({ ...i, suggestedSummary: undefined })));
    setSavedUser(true);
    setSavedSuggested(false);
  };

  const handleSaveSuggestedSummary = () => {
    if (!validationResult || validationResult.length === 0) return;
    const toSave: DeepDiveItem[] = validationResult.map((r) => ({
      topic: r.topic,
      userSummary: "", // or keep from current items if we want to merge
      suggestedSummary: r.suggestedSummary,
    }));
    const byTopic = new Map(toSave.map((d) => [d.topic, d]));
    items.forEach((i) => {
      if (i.topic.trim() && byTopic.has(i.topic.trim())) {
        const d = byTopic.get(i.topic.trim())!;
        d.userSummary = i.userSummary;
      }
    });
    setDeepDives(Array.from(byTopic.values()));
    setSavedSuggested(true);
    setSavedUser(false);
  };

  const hasTopics = items.some((i) => i.topic.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href={`/requirements/${topic}/end-to-end-flow`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to end-to-end flow
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName} – Deep dives
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Add deep dive topics (e.g. Caching, Sharding, Rate limiting). Use Elaborate to write your summary for each; validate to get suggested summaries and feedback.
          </p>
        </div>

        <section className="rounded-2xl border-2 border-purple-200 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-800/90">
          <h2 className="mb-4 text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            Deep dive topics
          </h2>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border-2 border-purple-100 bg-white p-4 dark:border-purple-800 dark:bg-gray-900/50"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={item.topic}
                    onChange={(e) => setTopic(index, e.target.value)}
                    placeholder="e.g. Caching strategy, Database sharding"
                    className="min-w-[200px] flex-1 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleElaborate(index)}
                    className="rounded-lg border-2 border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                  >
                    {expanded.has(index) ? "Hide" : "Elaborate"}
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTopic(index)}
                      className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {expanded.has(index) && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Your summary
                    </label>
                    <textarea
                      value={item.userSummary}
                      onChange={(e) => setUserSummary(index, e.target.value)}
                      placeholder="Write your elaboration for this deep dive..."
                      rows={5}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTopic}
            className="mt-4 rounded-xl border-2 border-purple-300 bg-purple-50 px-6 py-3 font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            + Add deep dive topic
          </button>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-purple-200 pt-6 dark:border-purple-700">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !hasTopics}
              className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
            <button
              type="button"
              onClick={handleSaveUserSummary}
              disabled={!hasTopics}
              className="rounded-xl border-2 border-purple-400 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              Save my deep dives to summary
            </button>
            <button
              type="button"
              onClick={handleSaveSuggestedSummary}
              disabled={!validationResult?.length}
              className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              Save deep dives feedback to summary
            </button>
            {savedUser && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                My deep dives saved to summary
              </span>
            )}
            {savedSuggested && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Deep dives feedback saved to summary
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-purple-200 pt-4 dark:border-purple-700">
            <Link
              href={`/requirements/${topic}/detailed-diagram`}
              className="rounded-xl bg-gray-800 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next: Detailed design diagram →
            </Link>
            <Link
              href={`/requirements/${topic}`}
              className="rounded-xl border-2 border-purple-300 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              ← Back to requirements
            </Link>
          </div>
        </section>

        {validationResult && validationResult.length > 0 && (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 shadow-2xl backdrop-blur-sm dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20">
            {suggestedMissingTopics.length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-6 dark:border-amber-700 dark:bg-amber-900/20">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                  Important deep dives you might have missed
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  The LLM suggests 3 more topics to consider for this system.
                </p>
                <ul className="mt-3 space-y-2 pl-4 text-gray-700 dark:text-gray-300">
                  {suggestedMissingTopics.map((t, i) => (
                    <li key={i} className="list-disc font-medium">
                      {t}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addMissingTopics}
                  className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
                >
                  Add all to my topics
                </button>
              </div>
            )}
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              Suggested summaries & feedback
            </h2>
            <div className="space-y-6">
              {validationResult.map((r, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border-2 border-indigo-100 bg-white p-6 dark:border-indigo-800 dark:bg-gray-800/80"
                >
                  <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                    {r.topic}
                  </h3>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Suggested summary
                    </p>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {r.suggestedSummary}
                    </p>
                  </div>
                  {r.feedback && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Feedback on your summary
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {r.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
