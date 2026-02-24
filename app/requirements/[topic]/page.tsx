"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import RequirementsForm from "@/components/RequirementsForm";

export default function RequirementsPage() {
  const params = useParams();
  const topic = params.topic as string;
  
  const topicName = topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-purple-100/30 to-pink-100/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to home
          </Link>
          <h1 className="mt-2 text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
            {topicName}
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Define the functional and non-functional requirements for this system
          </p>
        </div>

        <RequirementsForm topic={topicName} topicSlug={topic} />
      </main>
    </div>
  );
}