"""FastAPI app: single POST /validate endpoint, CORS for Next.js frontend."""

import asyncio
import base64
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.diagram import extract_text_from_drawio_xml
from app.llm import (
    call_llm1,
    call_llm2,
    call_llm_apis_1,
    call_llm_apis_2,
    call_llm_diagram_1,
    call_llm_diagram_2,
    call_llm_estimation_1,
    call_llm_estimation_2,
    call_llm_estimation_calculations,
    call_llm_data_model_1,
    call_llm_data_model_2,
    call_llm_data_model_feedback,
    call_llm_validate_flow,
    call_llm_validate_detailed_diagram,
    call_llm_deep_dives,
    classify_requirements_coverage,
)
from app.schemas import (
    CalculationFeedbackItem,
    DataModelFeedbackItem,
    DeepDiveItemResponse,
    ValidateApisRequest,
    ValidateApisResponse,
    ValidateDataModelRequest,
    ValidateDataModelResponse,
    ValidateDiagramRequest,
    ValidateDiagramResponse,
    ValidateEstimationRequest,
    ValidateEstimationResponse,
    ValidateFlowRequest,
    ValidateFlowResponse,
    ValidateDeepDivesRequest,
    ValidateDeepDivesResponse,
    ValidateDetailedDiagramRequest,
    ValidateDetailedDiagramResponse,
    ValidateRequest,
    ValidateResponse,
)
from app.validation import combine_top_requirements, find_common_requirements

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Load env and other startup; nothing to do on shutdown."""
    yield


app = FastAPI(
    title="System Design Validation API",
    description="Returns top 5 functional and non-functional requirements for a topic (from two LLMs).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.post("/validate", response_model=ValidateResponse)
async def validate(req: ValidateRequest) -> ValidateResponse:
    """
    Call two LLMs for the given topic, then:
    - Use common requirements (≥2 shared words) if any; else combine top 3 from LLM1 + top 2 from LLM2.
    - Return top 5 functional and top 5 non-functional requirements.
    """
    llm1, llm2 = await asyncio.gather(call_llm1(req.topic), call_llm2(req.topic))

    common_func = find_common_requirements(
        llm1["functional_requirements"],
        llm2["functional_requirements"],
    )
    common_non_func = find_common_requirements(
        llm1["non_functional_requirements"],
        llm2["non_functional_requirements"],
    )

    final_func = (
        common_func
        if common_func
        else combine_top_requirements(
            llm1["functional_requirements"],
            llm2["functional_requirements"],
        )
    )
    final_non_func = (
        common_non_func
        if common_non_func
        else combine_top_requirements(
            llm1["non_functional_requirements"],
            llm2["non_functional_requirements"],
        )
    )

    # Semantic comparison: which of the top 5 did the user cover (by meaning)?
    user_func = req.functionalReqs or []
    user_non_func = req.nonFunctionalReqs or []
    coverage_func, coverage_non_func = await asyncio.gather(
        classify_requirements_coverage(final_func, user_func, for_requirements=True),
        classify_requirements_coverage(final_non_func, user_non_func, for_requirements=True),
    )

    return ValidateResponse(
        functional=final_func,
        nonFunctional=final_non_func,
        functionalMatched=coverage_func["matched"],
        functionalMissed=coverage_func["missed"],
        nonFunctionalMatched=coverage_non_func["matched"],
        nonFunctionalMissed=coverage_non_func["missed"],
    )


@app.post("/validate-apis", response_model=ValidateApisResponse)
async def validate_apis(req: ValidateApisRequest) -> ValidateApisResponse:
    """
    Call two LLMs for top 5 APIs for the topic, merge (common or combine top),
    then compare user's APIs against the result by meaning; return matched and missed.
    """
    apis1, apis2 = await asyncio.gather(
        call_llm_apis_1(req.topic),
        call_llm_apis_2(req.topic),
    )
    common = find_common_requirements(apis1, apis2)
    final_apis = (
        common if common else combine_top_requirements(apis1, apis2)
    )
    coverage = await classify_requirements_coverage(
        final_apis, req.apis or [], for_apis=True
    )
    return ValidateApisResponse(
        apis=final_apis,
        matched=coverage["matched"],
        missed=coverage["missed"],
    )


@app.post("/validate-diagram", response_model=ValidateDiagramResponse)
async def validate_diagram(req: ValidateDiagramRequest) -> ValidateDiagramResponse:
    """
    Call two LLMs for key components that should appear in a high-level diagram,
    merge lists, extract text from the user's draw.io XML, then compare by meaning.
    """
    result1, elem2 = await asyncio.gather(
        call_llm_diagram_1(req.topic),
        call_llm_diagram_2(req.topic),
    )
    elem1 = result1["elements"]
    suggested_diagram = result1.get("suggested_diagram") or ""
    common = find_common_requirements(elem1, elem2)
    final_elements = (
        common if common else combine_top_requirements(elem1, elem2)
    )
    user_labels = extract_text_from_drawio_xml(req.diagramXml or "")
    print("[diagram] User labels:", user_labels)
    coverage = await classify_requirements_coverage(
        final_elements, user_labels, for_diagram=True
    )
    return ValidateDiagramResponse(
        elements=final_elements,
        matched=coverage["matched"],
        missed=coverage["missed"],
        suggestedDiagram=suggested_diagram,
    )


@app.post("/validate-flow", response_model=ValidateFlowResponse)
async def validate_flow(req: ValidateFlowRequest) -> ValidateFlowResponse:
    """
    Validate the user's end-to-end flow summary against the system design.
    Optionally uses diagram XML to extract component labels for context.
    """
    diagram_labels = (
        extract_text_from_drawio_xml(req.diagramXml) if (req.diagramXml or "").strip() else []
    )
    result = await call_llm_validate_flow(
        topic=req.topic,
        flow_summary=req.flowSummary or "",
        diagram_labels=diagram_labels or None,
    )
    return ValidateFlowResponse(
        correct=result["correct"],
        feedback=result["feedback"],
        improvements=result.get("improvements", ""),
    )


@app.post("/validate-deep-dives", response_model=ValidateDeepDivesResponse)
async def validate_deep_dives(req: ValidateDeepDivesRequest) -> ValidateDeepDivesResponse:
    """
    For each deep dive topic, generate a suggested summary and optional feedback; also return 3 suggested missing topics.
    """
    raw = req.deepDives or []
    payload = [{"topic": getattr(d, "topic", ""), "userSummary": getattr(d, "userSummary", "") or ""} for d in raw]
    result = await call_llm_deep_dives(req.topic, payload)
    items_data = result.get("items") or []
    missing = result.get("suggestedMissingTopics") or []
    return ValidateDeepDivesResponse(
        items=[DeepDiveItemResponse(topic=x["topic"], suggestedSummary=x["suggestedSummary"], feedback=x.get("feedback", "")) for x in items_data],
        suggestedMissingTopics=missing[:3],
    )


KROKI_URL = "https://kroki.io"


async def mermaid_to_png_data_url(mermaid: str) -> str:
    """Convert Mermaid diagram source to PNG via Kroki; return data URL or empty string."""
    if not (mermaid or "").strip():
        return ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{KROKI_URL}/mermaid/png",
                content=mermaid.strip().encode("utf-8"),
                headers={"Content-Type": "text/plain"},
            )
            if r.status_code != 200 or not r.content:
                return ""
            b64 = base64.standard_b64encode(r.content).decode("ascii")
            return f"data:image/png;base64,{b64}"
    except Exception:
        return ""


async def d2_to_png_data_url(d2_source: str) -> str:
    """Convert D2 diagram source to PNG via Kroki; return data URL or empty string."""
    if not (d2_source or "").strip():
        return ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{KROKI_URL}/d2/png",
                content=d2_source.strip().encode("utf-8"),
                headers={"Content-Type": "text/plain"},
            )
            if r.status_code != 200 or not r.content:
                return ""
            b64 = base64.standard_b64encode(r.content).decode("ascii")
            return f"data:image/png;base64,{b64}"
    except Exception:
        return ""


def _requirements_summary(req_in: ValidateDetailedDiagramRequest) -> str:
    if not req_in.requirements:
        return ""
    r = req_in.requirements
    func = getattr(r, "functional", None) or []
    non_func = getattr(r, "nonFunctional", None) or []
    lines = []
    if func:
        lines.append("Functional: " + "; ".join(str(x) for x in func[:10]))
    if non_func:
        lines.append("Non-functional: " + "; ".join(str(x) for x in non_func[:10]))
    return "\n".join(lines)


def _api_design_summary(api_design: list) -> str:
    if not api_design:
        return ""
    lines = []
    for row in api_design[:15]:
        if isinstance(row, dict):
            api, req, res = str(row.get("api", "") or ""), str(row.get("request", "") or ""), str(row.get("response", "") or "")
        else:
            api = str(getattr(row, "api", "") or "")
            req = str(getattr(row, "request", "") or "")
            res = str(getattr(row, "response", "") or "")
        if api:
            req_part = f" (request: {req[:80]}...)" if len(req) > 80 else (f" (request: {req})" if req else "")
            res_part = f" (response: {res[:80]}...)" if len(res) > 80 else (f" (response: {res})" if res else "")
            lines.append(f"- {api}{req_part}{res_part}")
    return "\n".join(lines) if lines else ""


@app.post("/validate-detailed-diagram", response_model=ValidateDetailedDiagramResponse)
async def validate_detailed_diagram(req: ValidateDetailedDiagramRequest) -> ValidateDetailedDiagramResponse:
    """
    Validate the user's detailed design diagram against all discussed points: requirements,
    API design, database schema, high-level diagram, end-to-end flow, and deep dives.
    Returns text feedback, improvements, and a suggested Mermaid diagram as reference.
    """
    diagram_labels = extract_text_from_drawio_xml(req.diagramXml or "")
    high_level_labels = extract_text_from_drawio_xml(req.highLevelDiagramXml or "")
    requirements_summary = _requirements_summary(req)
    api_list = req.apiDesign or []
    api_design_summary = _api_design_summary(api_list)
    data_model_summary = "\n".join(str(x) for x in (req.dataModel or [])[:30])
    raw_dives = req.deepDives or []
    deep_dives_payload = [
        {
            "topic": getattr(d, "topic", "") or "",
            "userSummary": getattr(d, "userSummary", "") or "",
            "suggestedSummary": getattr(d, "suggestedSummary", "") or "",
        }
        for d in raw_dives
    ]
    result = await call_llm_validate_detailed_diagram(
        topic=req.topic,
        requirements_summary=requirements_summary,
        api_design_summary=api_design_summary,
        data_model_summary=data_model_summary,
        high_level_labels=high_level_labels,
        end_to_end_flow=req.endToEndFlow or "",
        deep_dives=deep_dives_payload,
        diagram_labels=diagram_labels,
    )
    suggested_diagram = result.get("suggested_diagram", "") or ""
    suggested_diagram_png = ""
    if suggested_diagram.strip():
        suggested_diagram_png = await d2_to_png_data_url(suggested_diagram)
        if not suggested_diagram_png:
            suggested_diagram_png = await mermaid_to_png_data_url(suggested_diagram)
    return ValidateDetailedDiagramResponse(
        feedback=result.get("feedback", ""),
        improvements=result.get("improvements", ""),
        suggestedDiagram=suggested_diagram,
        suggestedDiagramPng=suggested_diagram_png,
    )


@app.post("/validate-estimation", response_model=ValidateEstimationResponse)
async def validate_estimation(req: ValidateEstimationRequest) -> ValidateEstimationResponse:
    """
    Call two LLMs for key back-of-the-envelope estimation items for the topic,
    merge lists, compare user's estimation items by meaning (matched/missed),
    and run a second-step LLM to validate reasonableness of numbers/calculations per line.
    """
    est1, est2 = await asyncio.gather(
        call_llm_estimation_1(req.topic),
        call_llm_estimation_2(req.topic),
    )
    common = find_common_requirements(est1, est2)
    final_elements = (
        common if common else combine_top_requirements(est1, est2)
    )
    user_est = req.estimations or []
    coverage, calculation_feedback = await asyncio.gather(
        classify_requirements_coverage(final_elements, user_est),
        call_llm_estimation_calculations(req.topic, user_est),
    )
    feedback_models = [
        CalculationFeedbackItem(userLine=item["userLine"], reasonable=item["reasonable"], comment=item["comment"])
        for item in calculation_feedback
    ]
    return ValidateEstimationResponse(
        elements=final_elements,
        matched=coverage["matched"],
        missed=coverage["missed"],
        calculationFeedback=feedback_models,
    )


@app.post("/validate-data-model", response_model=ValidateDataModelResponse)
async def validate_data_model(req: ValidateDataModelRequest) -> ValidateDataModelResponse:
    """
    Database schema validation uses multiple LLM calls:
    1) Two LLMs for expected schema elements (merged) — optionally based on API design.
    2) One LLM for semantic coverage (matched/missed tables).
    3) One LLM for per-line feedback (keys, missing fields, API alignment).
    """
    api_design = req.apiDesign or []
    dm1, dm2 = await asyncio.gather(
        call_llm_data_model_1(req.topic, api_design=api_design),
        call_llm_data_model_2(req.topic, api_design=api_design),
    )
    common = find_common_requirements(dm1, dm2)
    final_elements = (
        common if common else combine_top_requirements(dm1, dm2)
    )
    user_lines = req.dataModel or []
    coverage, feedback_result = await asyncio.gather(
        classify_requirements_coverage(
            final_elements, user_lines, for_schema=True, api_design=api_design
        ),
        call_llm_data_model_feedback(req.topic, user_lines, api_design=api_design),
    )
    feedback_list = feedback_result["feedback"]
    suggested_missing = feedback_result.get("suggested_missing_tables") or []
    feedback_models = [
        DataModelFeedbackItem(userLine=item["userLine"], reasonable=item["reasonable"], comment=item["comment"])
        for item in feedback_list
    ]
    return ValidateDataModelResponse(
        elements=final_elements,
        matched=coverage["matched"],
        missed=coverage["missed"],
        feedback=feedback_models,
        suggestedMissingTables=suggested_missing,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple health check for deployment."""
    return {"status": "ok"}
