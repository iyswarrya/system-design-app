"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";

export default function SummaryPane() {
  const params = useParams();
  const topic = params.topic as string;
  const { requirements, apiDesign, diagramXml, suggestedDiagramMermaid } = useSummary();
  const hasAny =
    requirements ||
    (apiDesign && apiDesign.length > 0) ||
    (diagramXml && diagramXml.length > 0) ||
    (suggestedDiagramMermaid && suggestedDiagramMermaid.length > 0);

  if (!hasAny) {
    return (
      <aside className="w-72 shrink-0 rounded-xl border border-purple-200 bg-white/80 p-4 shadow-lg backdrop-blur dark:border-purple-800 dark:bg-gray-800/80">
        <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
          Interview summary
        </h2>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Finalized blocks will appear here. Save from each step to build your summary.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto rounded-xl border border-purple-200 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-purple-800 dark:bg-gray-800/90">
      <h2 className="sticky top-0 bg-white/95 py-1 text-sm font-semibold text-purple-700 dark:bg-gray-800/95 dark:text-purple-300">
        Interview summary
      </h2>

      {requirements && (
        <section className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Requirements
          </h3>
          <div className="mt-1.5 space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Functional
              </p>
              <ul className="mt-0.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
                {requirements.functional.map((r, i) => (
                  <li key={i} className="list-disc">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Non-functional
              </p>
              <ul className="mt-0.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
                {requirements.nonFunctional.map((r, i) => (
                  <li key={i} className="list-disc">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {apiDesign && apiDesign.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400">
            API design
          </h3>
          <ul className="mt-1.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
            {apiDesign.map((api, i) => (
              <li key={i} className="list-disc">
                {api}
              </li>
            ))}
          </ul>
        </section>
      )}

      {diagramXml && diagramXml.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
            High-level diagram
          </h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Diagram saved.{" "}
            <Link
              href={`/requirements/${topic}/high-level-diagram`}
              className="font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              Open
            </Link>
          </p>
        </section>
      )}

      {suggestedDiagramMermaid && suggestedDiagramMermaid.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            LLM suggested diagram
          </h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Mermaid reference saved.
          </p>
        </section>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <Link
          href={`/requirements/${topic}`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          ← Requirements
        </Link>
        <Link
          href={`/requirements/${topic}/api-design`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          API design →
        </Link>
        <Link
          href={`/requirements/${topic}/high-level-diagram`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          High-level diagram →
        </Link>
      </div>
    </aside>
  );
}
