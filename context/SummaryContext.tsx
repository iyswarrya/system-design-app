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

export interface EstimationFeedbackItem {
  userLine: string;
  reasonable: boolean;
  comment: string;
}

export interface ApiDesignRow {
  api: string;
  request: string;
  response: string;
}

export interface FlowValidationFeedback {
  correct: boolean;
  feedback: string;
  improvements: string;
}

export interface DeepDiveItem {
  topic: string;
  userSummary: string;
  suggestedSummary?: string;
}

export interface SummaryState {
  requirements: RequirementsSummary | null;
  apiDesign: ApiDesignRow[];
  diagramXml: string | null;
  /** High-level diagram exported as PNG (data URL) when user saves as PNG */
  diagramPng: string | null;
  suggestedDiagramMermaid: string | null;
  detailedDiagramXml: string | null;
  suggestedDetailedDiagramMermaid: string | null;
  /** LLM-suggested detailed diagram as PNG (data URL) from validation feedback */
  suggestedDetailedDiagramPng: string | null;
  /** PNG image as data URL (e.g. data:image/png;base64,...) from exporting the detailed diagram */
  detailedDiagramPng: string | null;
  endToEndFlow: string | null;
  flowValidationFeedback: FlowValidationFeedback | null;
  deepDives: DeepDiveItem[];
  estimation: string[];
  estimationFeedback: EstimationFeedbackItem[] | null;
  /** When set, shows "items you missed" under Back of envelope (from Save suggested summary). */
  estimationMissed: string[] | null;
  dataModel: string[];
  schemaFeedback: SchemaFeedbackItem[] | null;
  /** When set, shows missed items under Database schema (from Save suggested schema feedback). */
  schemaMissed: string[] | null;
}

const STORAGE_PREFIX = "system-design-summary-";

const EMPTY_SUMMARY_STATE: SummaryState = {
  requirements: null,
  apiDesign: [],
  diagramXml: null,
  diagramPng: null,
  suggestedDiagramMermaid: null,
  detailedDiagramXml: null,
  suggestedDetailedDiagramMermaid: null,
  suggestedDetailedDiagramPng: null,
  detailedDiagramPng: null,
  endToEndFlow: null,
  flowValidationFeedback: null,
  deepDives: [],
  estimation: [],
  estimationFeedback: null,
  estimationMissed: null,
  dataModel: [],
  schemaFeedback: null,
  schemaMissed: null,
};

function loadSummary(topic: string): SummaryState {
  if (typeof window === "undefined") {
    return { ...EMPTY_SUMMARY_STATE };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + topic);
    if (!raw) return { ...EMPTY_SUMMARY_STATE };
    const parsed = JSON.parse(raw) as { apiDesign?: unknown; [k: string]: unknown };
    const rawApi = parsed.apiDesign;
    let apiDesign: ApiDesignRow[] = [];
    if (Array.isArray(rawApi)) {
      const first = rawApi[0];
      if (typeof first === "string") {
        apiDesign = rawApi.map((s) => ({ api: String(s), request: "", response: "" }));
      } else if (first && typeof first === "object" && "api" in first) {
        apiDesign = rawApi
          .filter((r) => r && typeof r === "object" && "api" in r)
          .map((r) => ({
            api: String((r as ApiDesignRow).api),
            request: String((r as ApiDesignRow).request ?? ""),
            response: String((r as ApiDesignRow).response ?? ""),
          }));
      }
    }
    const fb = parsed.schemaFeedback;
    const schemaFeedback = Array.isArray(fb) ? (fb as SchemaFeedbackItem[]).filter((x) => x && typeof x.userLine === "string" && typeof x.reasonable === "boolean" && typeof x.comment === "string") : null;
    const estFb = parsed.estimationFeedback;
    const estimationFeedback = Array.isArray(estFb) ? (estFb as EstimationFeedbackItem[]).filter((x) => x && typeof x.userLine === "string" && typeof x.reasonable === "boolean" && typeof x.comment === "string") : null;
    const rawDeep = parsed.deepDives;
    let deepDives: SummaryState["deepDives"] = [];
    if (Array.isArray(rawDeep)) {
      deepDives = rawDeep
        .filter((x) => x && typeof x === "object" && typeof (x as DeepDiveItem).topic === "string")
        .map((x) => ({
          topic: String((x as DeepDiveItem).topic),
          userSummary: String((x as DeepDiveItem).userSummary ?? ""),
          suggestedSummary: (x as DeepDiveItem).suggestedSummary != null ? String((x as DeepDiveItem).suggestedSummary) : undefined,
        }));
    }
    return {
      requirements: (parsed.requirements as SummaryState["requirements"]) ?? null,
      apiDesign,
      diagramXml: typeof parsed.diagramXml === "string" ? parsed.diagramXml : null,
      diagramPng: typeof parsed.diagramPng === "string" && parsed.diagramPng.startsWith("data:image") ? parsed.diagramPng : null,
      suggestedDiagramMermaid: typeof parsed.suggestedDiagramMermaid === "string" ? parsed.suggestedDiagramMermaid : null,
      detailedDiagramXml: typeof parsed.detailedDiagramXml === "string" ? parsed.detailedDiagramXml : null,
      suggestedDetailedDiagramMermaid: typeof parsed.suggestedDetailedDiagramMermaid === "string" ? parsed.suggestedDetailedDiagramMermaid : null,
      suggestedDetailedDiagramPng: typeof parsed.suggestedDetailedDiagramPng === "string" && parsed.suggestedDetailedDiagramPng.startsWith("data:image") ? parsed.suggestedDetailedDiagramPng : null,
      detailedDiagramPng: typeof parsed.detailedDiagramPng === "string" && parsed.detailedDiagramPng.startsWith("data:image") ? parsed.detailedDiagramPng : null,
      endToEndFlow: typeof parsed.endToEndFlow === "string" ? parsed.endToEndFlow : null,
      flowValidationFeedback: (() => {
        const f = parsed.flowValidationFeedback;
        if (!f || typeof f !== "object" || typeof (f as FlowValidationFeedback).feedback !== "string") return null;
        const x = f as FlowValidationFeedback;
        return { correct: Boolean(x.correct), feedback: String(x.feedback), improvements: String(x.improvements ?? "") };
      })(),
      deepDives,
      estimation: Array.isArray(parsed.estimation) ? (parsed.estimation as string[]) : [],
      estimationFeedback: estimationFeedback?.length ? estimationFeedback : null,
      estimationMissed: Array.isArray(parsed.estimationMissed) ? (parsed.estimationMissed as string[]) : null,
      dataModel: Array.isArray(parsed.dataModel) ? (parsed.dataModel as string[]) : [],
      schemaFeedback: schemaFeedback?.length ? schemaFeedback : null,
      schemaMissed: Array.isArray(parsed.schemaMissed) ? (parsed.schemaMissed as string[]) : null,
    };
  } catch {
    return { ...EMPTY_SUMMARY_STATE };
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
  setApiDesign: (rows: ApiDesignRow[]) => void;
  setDiagramXml: (xml: string | null) => void;
  setDiagramPng: (dataUrl: string | null) => void;
  setSuggestedDiagramMermaid: (mermaid: string | null) => void;
  setDetailedDiagramXml: (xml: string | null) => void;
  setSuggestedDetailedDiagramMermaid: (mermaid: string | null) => void;
  setSuggestedDetailedDiagramPng: (dataUrl: string | null) => void;
  setDetailedDiagramPng: (dataUrl: string | null) => void;
  setEndToEndFlow: (flow: string | null) => void;
  setFlowValidationFeedback: (feedback: FlowValidationFeedback | null) => void;
  setDeepDives: (items: DeepDiveItem[]) => void;
  setEstimation: (items: string[]) => void;
  setEstimationFeedback: (feedback: EstimationFeedbackItem[] | null) => void;
  setEstimationMissed: (missed: string[] | null) => void;
  setDataModel: (items: string[]) => void;
  setSchemaFeedback: (feedback: SchemaFeedbackItem[] | null) => void;
  setSchemaMissed: (missed: string[] | null) => void;
  clearSummary: () => void;
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

  const setApiDesign = useCallback((apiDesign: ApiDesignRow[]) => {
    setState((prev) => ({ ...prev, apiDesign }));
  }, []);

  const setDiagramXml = useCallback((diagramXml: string | null) => {
    setState((prev) => ({ ...prev, diagramXml }));
  }, []);

  const setDiagramPng = useCallback((diagramPng: string | null) => {
    setState((prev) => ({ ...prev, diagramPng }));
  }, []);

  const setSuggestedDiagramMermaid = useCallback((suggestedDiagramMermaid: string | null) => {
    setState((prev) => ({ ...prev, suggestedDiagramMermaid }));
  }, []);

  const setDetailedDiagramXml = useCallback((detailedDiagramXml: string | null) => {
    setState((prev) => ({ ...prev, detailedDiagramXml }));
  }, []);

  const setSuggestedDetailedDiagramMermaid = useCallback((suggestedDetailedDiagramMermaid: string | null) => {
    setState((prev) => ({ ...prev, suggestedDetailedDiagramMermaid }));
  }, []);

  const setSuggestedDetailedDiagramPng = useCallback((suggestedDetailedDiagramPng: string | null) => {
    setState((prev) => ({ ...prev, suggestedDetailedDiagramPng }));
  }, []);

  const setDetailedDiagramPng = useCallback((detailedDiagramPng: string | null) => {
    setState((prev) => ({ ...prev, detailedDiagramPng }));
  }, []);

  const setEndToEndFlow = useCallback((endToEndFlow: string | null) => {
    setState((prev) => ({ ...prev, endToEndFlow }));
  }, []);

  const setFlowValidationFeedback = useCallback((flowValidationFeedback: FlowValidationFeedback | null) => {
    setState((prev) => ({ ...prev, flowValidationFeedback }));
  }, []);

  const setDeepDives = useCallback((deepDives: DeepDiveItem[]) => {
    setState((prev) => ({ ...prev, deepDives }));
  }, []);

  const setEstimation = useCallback((estimation: string[]) => {
    setState((prev) => ({ ...prev, estimation }));
  }, []);

  const setEstimationFeedback = useCallback((estimationFeedback: EstimationFeedbackItem[] | null) => {
    setState((prev) => ({ ...prev, estimationFeedback }));
  }, []);

  const setEstimationMissed = useCallback((estimationMissed: string[] | null) => {
    setState((prev) => ({ ...prev, estimationMissed }));
  }, []);

  const setDataModel = useCallback((dataModel: string[]) => {
    setState((prev) => ({ ...prev, dataModel }));
  }, []);

  const setSchemaFeedback = useCallback((schemaFeedback: SchemaFeedbackItem[] | null) => {
    setState((prev) => ({ ...prev, schemaFeedback }));
  }, []);

  const setSchemaMissed = useCallback((schemaMissed: string[] | null) => {
    setState((prev) => ({ ...prev, schemaMissed }));
  }, []);

  const clearSummary = useCallback(() => {
    setState({ ...EMPTY_SUMMARY_STATE });
  }, []);

  const value: SummaryContextValue = {
    ...state,
    topic,
    setRequirements,
    setApiDesign,
    setDiagramXml,
    setDiagramPng,
    setSuggestedDiagramMermaid,
    setDetailedDiagramXml,
    setSuggestedDetailedDiagramMermaid,
    setSuggestedDetailedDiagramPng,
    setDetailedDiagramPng,
    setEndToEndFlow,
    setFlowValidationFeedback,
    setDeepDives,
    setEstimation,
    setEstimationFeedback,
    setEstimationMissed,
    setDataModel,
    setSchemaFeedback,
    setSchemaMissed,
    clearSummary,
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
