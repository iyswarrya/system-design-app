"use client";

import SessionBanner from "@/components/SessionBanner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_DESIGN_TOPICS } from "@/lib/constants";

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const router = useRouter();

  const topicToUse = customTopic.trim() || selectedTopic;

  const handleStart = () => {
    if (topicToUse) {
      const topicSlug = topicToUse.toLowerCase().replace(/\s+/g, "-");
      router.push(`/requirements/${topicSlug}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
      <main className="relative z-10 flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-8 py-16">
        <div className="w-full max-w-md">
          <SessionBanner />
        </div>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <h1 className="text-5xl font-bold leading-tight tracking-tight bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
              System Design Practice
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 rounded-lg blur opacity-15"></div>
          </div>
          <p className="max-w-md text-lg leading-8 text-gray-700 dark:text-gray-300">
            Choose a topic from the list or enter your own system design topic
          </p>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="topic-select"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Select from list
            </label>
            <select
              id="topic-select"
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                if (e.target.value) setCustomTopic("");
              }}
              className="w-full rounded-xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3.5 text-base text-gray-900 shadow-lg transition-all duration-200 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:focus:border-purple-300"
            >
              <option value="">-- Select a topic --</option>
              {SYSTEM_DESIGN_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-2 text-gray-500 dark:bg-slate-900 dark:text-gray-400">
                Or enter your own topic
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="custom-topic"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Custom topic
            </label>
            <input
              id="custom-topic"
              type="text"
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                if (e.target.value.trim()) setSelectedTopic("");
              }}
              placeholder="e.g. Design a News Feed Ranking System"
              className="w-full rounded-xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3.5 text-base text-gray-900 shadow-lg transition-all duration-200 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-purple-300"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!topicToUse}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="relative z-10">Start Practice</span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-400 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          </button>
        </div>
      </main>
    </div>
  );
}