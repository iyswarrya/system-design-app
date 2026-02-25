"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface RequirementsSummary {
  functional: string[];
  nonFunctional: string[];
}

export interface SchemaFeedbackItem {
  userLine: string;
  reasonable: boolean;
  comment: string;
}

export interface SummaryState {
  requirements: RequirementsSummary | null;
  apiDesign: string[];
  diagramXml: string | null;
  suggestedDiagramMermaid: string | null;
  estimation: string[];
  dataModel: string[];
  schemaFeedback: SchemaFeedbackItem[] | null;
}

const STORAGE_PREFIX = "system-design-summary-";

function loadSummary(topic: string): SummaryState {
  if (typeof window === "undefined") {
    return { requirements: null, apiDesign: [], diagramXml: null, suggestedDiagramMermaid: null, estimation: [], dataModel: [], schemaFeedback: null };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + topic);
    if (!raw) return { requirements: null, apiDesign: [], diagramXml: null, suggestedDiagramMermaid: null, estimation: [], dataModel: [], schemaFeedback: null };
    const parsed = JSON.parse(raw) as SummaryState;
    const fb = parsed.schemaFeedback;
    const schemaFeedback = Array.isArray(fb) ? fb.filter((x) => x && typeof x.userLine === "string" && typeof x.reasonable === "boolean" && typeof x.comment === "string") : null;
    return {
      requirements: parsed.requirements ?? null,
      apiDesign: Array.isArray(parsed.apiDesign) ? parsed.apiDesign : [],
      diagramXml: typeof parsed.diagramXml === "string" ? parsed.diagramXml : null,
      suggestedDiagramMermaid: typeof parsed.suggestedDiagramMermaid === "string" ? parsed.suggestedDiagramMermaid : null,
      estimation: Array.isArray(parsed.estimation) ? parsed.estimation : [],
      dataModel: Array.isArray(parsed.dataModel) ? parsed.dataModel : [],
      schemaFeedback: schemaFeedback?.length ? schemaFeedback : null,
    };
  } catch {
    return { requirements: null, apiDesign: [], diagramXml: null, suggestedDiagramMermaid: null, estimation: [], dataModel: [], schemaFeedback: null };
  }
}

function saveSummary(topic: string, state: SummaryState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + topic, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface SummaryContextValue extends SummaryState {
  topic: string;
  setRequirements: (req: RequirementsSummary) => void;
  setApiDesign: (apis: string[]) => void;
  setDiagramXml: (xml: string | null) => void;
  setSuggestedDiagramMermaid: (mermaid: string | null) => void;
  setEstimation: (items: string[]) => void;
  setDataModel: (items: string[]) => void;
  setSchemaFeedback: (feedback: SchemaFeedbackItem[] | null) => void;
}

const SummaryContext = createContext<SummaryContextValue | null>(null);

export function SummaryProvider({
  topic,
  children,
}: {
  topic: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SummaryState>(() => loadSummary(topic));

  useEffect(() => {
    setState(loadSummary(topic));
  }, [topic]);

  useEffect(() => {
    saveSummary(topic, state);
  }, [topic, state]);

  const setRequirements = useCallback((requirements: RequirementsSummary) => {
    setState((prev) => ({ ...prev, requirements }));
  }, []);

  const setApiDesign = useCallback((apiDesign: string[]) => {
    setState((prev) => ({ ...prev, apiDesign }));
  }, []);

  const setDiagramXml = useCallback((diagramXml: string | null) => {
    setState((prev) => ({ ...prev, diagramXml }));
  }, []);

  const setSuggestedDiagramMermaid = useCallback((suggestedDiagramMermaid: string | null) => {
    setState((prev) => ({ ...prev, suggestedDiagramMermaid }));
  }, []);

  const setEstimation = useCallback((estimation: string[]) => {
    setState((prev) => ({ ...prev, estimation }));
  }, []);

  const setDataModel = useCallback((dataModel: string[]) => {
    setState((prev) => ({ ...prev, dataModel }));
  }, []);

  const setSchemaFeedback = useCallback((schemaFeedback: SchemaFeedbackItem[] | null) => {
    setState((prev) => ({ ...prev, schemaFeedback }));
  }, []);

  const value: SummaryContextValue = {
    ...state,
    topic,
    setRequirements,
    setApiDesign,
    setDiagramXml,
    setSuggestedDiagramMermaid,
    setEstimation,
    setDataModel,
    setSchemaFeedback,
  };

  return (
    <SummaryContext.Provider value={value}>{children}</SummaryContext.Provider>
  );
}

export function useSummary() {
  const ctx = useContext(SummaryContext);
  if (!ctx) {
    throw new Error("useSummary must be used within SummaryProvider");
  }
  return ctx;
}
