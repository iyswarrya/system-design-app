"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSummary } from "@/context/SummaryContext";
import { useSummaryItems } from "@/hooks/useSummaryItems";

export default function SummaryPane() {
  const params = useParams();
  const topic = params.topic as string;
  const { requirements, apiDesign, diagramXml, diagramPng, suggestedDiagramMermaid, detailedDiagramXml, suggestedDetailedDiagramMermaid, suggestedDetailedDiagramPng, detailedDiagramPng, endToEndFlow, flowValidationFeedback, deepDives, estimation, estimationFeedback, estimationStructured, estimationMissed, dataModel, schemaFeedback, schemaMissed, clearSummary, setRequirements, setApiDesign, setDiagramXml, setDiagramPng, setSuggestedDiagramMermaid, setDetailedDiagramXml, setSuggestedDetailedDiagramMermaid, setSuggestedDetailedDiagramPng, setDetailedDiagramPng, setEndToEndFlow, setFlowValidationFeedback, setDeepDives, setEstimation, setEstimationFeedback, setEstimationStructured, setEstimationMissed, setDataModel, setSchemaFeedback, setSchemaMissed } = useSummary();
  const { items: summaryItems, removeItemById } = useSummaryItems(topic);
  const hasAny =
    requirements ||
    (apiDesign && apiDesign.length > 0) ||
    (diagramXml && diagramXml.length > 0) ||
    (diagramPng && diagramPng.length > 0) ||
    (suggestedDiagramMermaid && suggestedDiagramMermaid.length > 0) ||
    (detailedDiagramXml && detailedDiagramXml.length > 0) ||
    (suggestedDetailedDiagramMermaid && suggestedDetailedDiagramMermaid.length > 0) ||
    (suggestedDetailedDiagramPng && suggestedDetailedDiagramPng.length > 0) ||
    (detailedDiagramPng && detailedDiagramPng.length > 0) ||
    (endToEndFlow && endToEndFlow.trim().length > 0) ||
    (flowValidationFeedback && (flowValidationFeedback.feedback?.trim() || flowValidationFeedback.improvements?.trim())) ||
    (deepDives && deepDives.length > 0) ||
    (estimation && estimation.length > 0) ||
    (estimationFeedback && estimationFeedback.length > 0) ||
    (estimationStructured &&
      (estimationStructured.expectedEstimations.length > 0 ||
        estimationStructured.comparisonFeedback.length > 0 ||
        estimationStructured.missingItems.length > 0 ||
        estimationStructured.overallFeedback.trim())) ||
    (estimationMissed && estimationMissed.length > 0) ||
    (dataModel && dataModel.length > 0) ||
    (schemaFeedback && schemaFeedback.length > 0) ||
    (schemaMissed && schemaMissed.length > 0) ||
    (summaryItems && summaryItems.length > 0);

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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Requirements
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => window.confirm("Remove Requirements from summary?") && setRequirements(null)} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400">
              API design
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/api-design`} className="font-medium text-pink-600 hover:underline dark:text-pink-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => window.confirm("Remove API design from summary?") && setApiDesign([])} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          <ul className="mt-1.5 space-y-1 pl-3 text-xs text-gray-700 dark:text-gray-300">
            {apiDesign.map((row, i) => (
              <li key={i} className="list-disc">
                <span className="font-medium">{row.api}</span>
                {(row.request || row.response) && (
                  <span className="block mt-0.5 pl-2 text-gray-600 dark:text-gray-400">
                    {row.request && <>Request: {row.request}</>}
                    {row.request && row.response && " · "}
                    {row.response && <>Response: {row.response}</>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(diagramXml?.length > 0 || diagramPng?.length > 0) && (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
              High-level diagram
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/high-level-diagram`} className="font-medium text-teal-600 hover:underline dark:text-teal-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove High-level diagram from summary?")) { setDiagramXml(null); setDiagramPng(null); setSuggestedDiagramMermaid(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {diagramPng && diagramPng.startsWith("data:image") && (
            <div className="mt-1.5">
              <img
                src={diagramPng}
                alt="High-level diagram"
                className="max-h-40 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            </div>
          )}
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {diagramPng ? "Diagram saved as PNG." : "Diagram saved."}{" "}
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              LLM suggested diagram
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/high-level-diagram`} className="font-medium text-amber-600 hover:underline dark:text-amber-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => window.confirm("Remove LLM suggested diagram from summary?") && setSuggestedDiagramMermaid(null)} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Mermaid reference saved.
          </p>
        </section>
      )}

      {(estimation && estimation.length > 0) ||
      (estimationFeedback && estimationFeedback.length > 0) ||
      (estimationStructured &&
        (estimationStructured.expectedEstimations.length > 0 ||
          estimationStructured.comparisonFeedback.length > 0 ||
          estimationStructured.missingItems.length > 0 ||
          estimationStructured.overallFeedback.trim())) ||
      (estimationMissed && estimationMissed.length > 0) ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Back of envelope
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/back-of-envelope`} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove Back of envelope from summary?")) { setEstimation([]); setEstimationFeedback(null); setEstimationStructured(null); setEstimationMissed(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {estimation && estimation.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
              {estimation.map((item, i) => (
                <li key={i} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          )}
          {estimationMissed && estimationMissed.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Items you missed</p>
              <ul className="mt-0.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
                {estimationMissed.map((item, i) => (
                  <li key={i} className="list-disc">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {estimationStructured &&
            (estimationStructured.expectedEstimations.length > 0 ||
              estimationStructured.comparisonFeedback.length > 0 ||
              estimationStructured.missingItems.length > 0 ||
              estimationStructured.overallFeedback.trim()) && (
            <div className="mt-2 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2 dark:border-indigo-800 dark:bg-indigo-950/30">
              {estimationStructured.overallFeedback.trim() && (
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-indigo-800 dark:text-indigo-300">Overall: </span>
                  {estimationStructured.overallFeedback}
                </p>
              )}
              {estimationStructured.expectedEstimations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Reference</p>
                  <ul className="mt-0.5 space-y-1 pl-3 text-xs text-gray-700 dark:text-gray-300">
                    {estimationStructured.expectedEstimations.map((row, i) => (
                      <li key={i} className="list-disc">
                        <span className="font-medium">{row.item}: </span>
                        {row.expectedValue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {estimationStructured.comparisonFeedback.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Comparison</p>
                  <ul className="mt-0.5 space-y-1 pl-3 text-xs text-gray-700 dark:text-gray-300">
                    {estimationStructured.comparisonFeedback.map((fb, i) => (
                      <li key={i} className="list-disc">
                        <span className="font-medium">{fb.item}</span>
                        <span className="text-gray-500 dark:text-gray-400"> ({fb.status})</span>
                        {" — "}
                        {fb.feedback}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {estimationFeedback && estimationFeedback.length > 0 && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">LLM calculation feedback</p>
              <ul className="mt-1 space-y-1.5">
                {estimationFeedback.map((fb, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{fb.userLine}</span>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">— {fb.comment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href={`/requirements/${topic}/back-of-envelope`}
            className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Open
          </Link>
        </section>
      ) : null}

      {(dataModel && dataModel.length > 0) || (schemaFeedback && schemaFeedback.length > 0) || (schemaMissed && schemaMissed.length > 0) ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Database schema
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/data-model`} className="font-medium text-violet-600 hover:underline dark:text-violet-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove Database schema from summary?")) { setDataModel([]); setSchemaFeedback(null); setSchemaMissed(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {dataModel && dataModel.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
              {dataModel.map((item, i) => (
                <li key={i} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          )}
          {schemaMissed && schemaMissed.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Items you missed</p>
              <ul className="mt-0.5 space-y-0.5 pl-3 text-xs text-gray-700 dark:text-gray-300">
                {schemaMissed.map((item, i) => (
                  <li key={i} className="list-disc">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {schemaFeedback && schemaFeedback.length > 0 && (
            <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2 dark:border-violet-800 dark:bg-violet-900/20">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">Schema feedback</p>
              <ul className="mt-1 space-y-1.5">
                {schemaFeedback.map((fb, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{fb.userLine}</span>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">— {fb.comment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href={`/requirements/${topic}/data-model`}
            className="mt-1 inline-block text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            Open
          </Link>
        </section>
      ) : null}

      {(endToEndFlow && endToEndFlow.trim().length > 0) || flowValidationFeedback ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
              End-to-end flow
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/end-to-end-flow`} className="font-medium text-cyan-600 hover:underline dark:text-cyan-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove End-to-end flow from summary?")) { setEndToEndFlow(null); setFlowValidationFeedback(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {endToEndFlow && endToEndFlow.trim().length > 0 && (
            <p className="mt-1 line-clamp-3 text-xs text-gray-600 dark:text-gray-400">
              {endToEndFlow.trim()}
            </p>
          )}
          {flowValidationFeedback && (flowValidationFeedback.feedback?.trim() || flowValidationFeedback.improvements?.trim()) && (
            <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50/50 p-2 dark:border-cyan-700 dark:bg-cyan-900/20">
              <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Flow validation feedback</p>
              {flowValidationFeedback.feedback?.trim() && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-700 dark:text-gray-300">
                  {flowValidationFeedback.feedback.trim()}
                </p>
              )}
              {flowValidationFeedback.improvements?.trim() && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                  {flowValidationFeedback.improvements.trim()}
                </p>
              )}
            </div>
          )}
          <Link
            href={`/requirements/${topic}/end-to-end-flow`}
            className="mt-0.5 inline-block text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
          >
            Open
          </Link>
        </section>
      ) : null}

      {deepDives && deepDives.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Deep dives
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/deep-dives`} className="font-medium text-sky-600 hover:underline dark:text-sky-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => window.confirm("Remove Deep dives from summary?") && setDeepDives([])} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          <ul className="mt-1.5 space-y-1 pl-3 text-xs text-gray-700 dark:text-gray-300">
            {deepDives.map((d, i) => (
              <li key={i} className="list-disc">
                <span className="font-medium">{d.topic}</span>
                {(d.userSummary || d.suggestedSummary) && (
                  <span className="block mt-0.5 pl-2 line-clamp-2 text-gray-600 dark:text-gray-400">
                    {d.suggestedSummary ?? d.userSummary}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link
            href={`/requirements/${topic}/deep-dives`}
            className="mt-0.5 inline-block text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Open
          </Link>
        </section>
      )}

      {(detailedDiagramXml?.length > 0 || detailedDiagramPng?.length > 0) && (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
              Detailed design diagram
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/detailed-diagram`} className="font-medium text-teal-600 hover:underline dark:text-teal-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove Detailed design diagram from summary?")) { setDetailedDiagramXml(null); setDetailedDiagramPng(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {detailedDiagramPng && detailedDiagramPng.startsWith("data:image") && (
            <div className="mt-1.5">
              <img
                src={detailedDiagramPng}
                alt="Detailed design diagram"
                className="max-h-40 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            </div>
          )}
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {detailedDiagramXml?.length ? "Diagram saved." : "PNG saved."}{" "}
            <Link
              href={`/requirements/${topic}/detailed-diagram`}
              className="font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              Open
            </Link>
          </p>
        </section>
      )}

      {(suggestedDetailedDiagramPng?.length > 0 || suggestedDetailedDiagramMermaid?.length > 0) && (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              LLM suggested detailed diagram
            </h3>
            <span className="flex shrink-0 gap-1 text-xs">
              <Link href={`/requirements/${topic}/detailed-diagram`} className="font-medium text-amber-600 hover:underline dark:text-amber-400">Edit</Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <button type="button" onClick={() => { if (window.confirm("Remove LLM suggested detailed diagram from summary?")) { setSuggestedDetailedDiagramMermaid(null); setSuggestedDetailedDiagramPng(null); } }} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete</button>
            </span>
          </div>
          {suggestedDetailedDiagramPng && suggestedDetailedDiagramPng.startsWith("data:image") && (
            <img
              src={suggestedDetailedDiagramPng}
              alt="LLM suggested detailed diagram"
              className="mt-1.5 max-h-32 w-full rounded-lg border border-amber-200 object-contain dark:border-amber-800"
            />
          )}
          {!suggestedDetailedDiagramPng && suggestedDetailedDiagramMermaid && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Mermaid reference saved.
            </p>
          )}
        </section>
      )}

      {summaryItems && summaryItems.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
            Saved feedback diagrams
          </h3>
          <ul className="mt-1.5 space-y-3">
            {summaryItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/40 p-2 text-xs dark:border-fuchsia-800 dark:bg-fuchsia-900/10">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove this saved feedback diagram from summary?")) {
                        removeItemById(item.id);
                      }
                    }}
                    className="text-[11px] font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
                <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.svg ? (
                  <div
                    className="mt-1 max-h-32 overflow-hidden rounded border border-fuchsia-200 bg-white dark:border-fuchsia-700 dark:bg-gray-900"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                ) : (
                  <p className="mt-1 line-clamp-3 text-[11px] text-gray-600 dark:text-gray-300">
                    {item.mermaidText}
                  </p>
                )}
              </li>
            ))}
          </ul>
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
        <Link
          href={`/requirements/${topic}/back-of-envelope`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          Back of envelope →
        </Link>
        <Link
          href={`/requirements/${topic}/data-model`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          Database schema →
        </Link>
        <Link
          href={`/requirements/${topic}/end-to-end-flow`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          End-to-end flow →
        </Link>
        <Link
          href={`/requirements/${topic}/deep-dives`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          Deep dives →
        </Link>
        <Link
          href={`/requirements/${topic}/detailed-diagram`}
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          Detailed design diagram →
        </Link>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm("Clear the entire interview summary for this topic? This cannot be undone.")) {
              clearSummary();
            }
          }}
          className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Clear summary
        </button>
      </div>
    </aside>
  );
}
