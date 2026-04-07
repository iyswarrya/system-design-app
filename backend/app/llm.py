"""LLM calls for system design requirements. call_llm1 = OpenAI; call_llm2 = stub (or Anthropic)."""

import json
import os
from typing import TypedDict

from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.api_normalize import compute_api_auto_matches

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class LLMResponse(TypedDict):
    functional_requirements: list[str]
    non_functional_requirements: list[str]


def _stub_llm1(_topic: str) -> LLMResponse:
    """Fallback when OpenAI is not configured or fails."""
    return {
        "functional_requirements": [
            "User authentication and authorization",
            "Core feature implementation",
            "Data storage and retrieval",
            "API endpoints",
            "Error handling",
        ],
        "non_functional_requirements": [
            "Scalability to handle 1M+ users",
            "99.9% uptime",
            "Response time < 200ms",
            "Data consistency",
            "Security and encryption",
        ],
    }


def _stub_llm2(_topic: str) -> LLMResponse:
    """Stub: replace with Anthropic (or other) API call."""
    return {
        "functional_requirements": [
            "User management",
            "Core business logic",
            "Data persistence",
            "RESTful API",
            "Input validation",
        ],
        "non_functional_requirements": [
            "Horizontal scalability",
            "High availability",
            "Low latency",
            "ACID compliance",
            "End-to-end encryption",
        ],
    }


LLM1_SYSTEM_PROMPT = """You are a system design expert. For a given system design topic, output exactly 5 functional requirements and exactly 5 non-functional requirements. Respond only with valid JSON in this exact shape, no other text:
{"functional_requirements": ["req1", "req2", "req3", "req4", "req5"], "non_functional_requirements": ["req1", "req2", "req3", "req4", "req5"]}"""


async def call_llm1(topic: str) -> LLMResponse:
    """Call OpenAI for topic. Returns functional + non-functional requirement lists. Falls back to stub if no key or on error."""
    if not OPENAI_API_KEY:
        print("OPENAI_API_KEY is not set")
        return _stub_llm1(topic)

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": LLM1_SYSTEM_PROMPT},
                {"role": "user", "content": f"System design topic: {topic}"},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_llm1(topic)
        data = json.loads(content)
        func = data.get("functional_requirements") or []
        non_func = data.get("non_functional_requirements") or []
        if not isinstance(func, list):
            func = [str(x) for x in func] if func else []
        if not isinstance(non_func, list):
            non_func = [str(x) for x in non_func] if non_func else []
        return {
            "functional_requirements": [str(x) for x in func][:5],
            "non_functional_requirements": [str(x) for x in non_func][:5],
        }
    except Exception:
        return _stub_llm1(topic)


async def call_llm2(topic: str) -> LLMResponse:
    """Call second LLM (e.g. Anthropic) for topic. Returns functional + non-functional requirement lists."""
    return _stub_llm2(topic)


# --- API design: top APIs from two LLMs ---

APIS_LLM_SYSTEM_PROMPT = """You are a system design expert. For a given system design topic, list the 5 most important APIs (REST or RPC) that the system should expose. For each API give a short description (e.g. "POST /shorten – create short URL from long URL"). Respond only with valid JSON in this exact shape, no other text:
{"apis": ["API 1 description", "API 2 description", "API 3 description", "API 4 description", "API 5 description"]}"""


def _stub_apis_1(_topic: str) -> list[str]:
    return [
        "POST /shorten – create short URL from long URL",
        "GET /:id – resolve short URL and redirect to long URL",
        "GET /analytics/:id – get click statistics for a short URL",
        "POST /users – register user",
        "GET /users/:id/urls – list short URLs created by user",
    ]


def _stub_apis_2(_topic: str) -> list[str]:
    return [
        "POST /api/shorten – create and store short link",
        "GET /s/:shortCode – redirect to original URL",
        "GET /api/stats/:shortCode – retrieve analytics",
        "PUT /api/shorten/:id – update or delete short link",
        "GET /api/health – health check endpoint",
    ]


async def call_llm_apis_1(topic: str) -> list[str]:
    """Return top 5 APIs for the system (OpenAI). Falls back to stub if no key or error."""
    if not OPENAI_API_KEY:
        return _stub_apis_1(topic)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": APIS_LLM_SYSTEM_PROMPT},
                {"role": "user", "content": f"System design topic: {topic}"},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_apis_1(topic)
        data = json.loads(content)
        apis = data.get("apis") or []
        if not isinstance(apis, list):
            apis = []
        return [str(x).strip() for x in apis][:5]
    except Exception:
        return _stub_apis_1(topic)


async def call_llm_apis_2(topic: str) -> list[str]:
    """Return top 5 APIs for the system (stub; replace with second LLM)."""
    return _stub_apis_2(topic)


# --- High-level diagram: key components from two LLMs ---

class DiagramLLM1Result(TypedDict):
    elements: list[str]
    suggested_diagram: str  # Mermaid flowchart code


def build_api_to_diagram_prompt(api_spec_text: str) -> str:
    """Build the system + user prompt for API-to-diagram generation. Keeps prompt logic in one place."""
    return f"""You are a system design expert. Generate a high-level architecture diagram from the following API spec.

API spec:
{api_spec_text}

Rules for mapping endpoints to services and diagram structure:
1) Group endpoints by top-level resource noun from the path (e.g. /posts -> Posts, /feed -> Feed, /comments -> Comments, /likes -> Likes, /users or /follow -> Users, /notifications -> Notifications).
2) Each group becomes a service named "<Noun> Service": Posts -> Post Service, Feed -> Feed Service, Comments -> Comment Service, Likes -> Like Service, Users/Follow -> User Service, Notifications -> Notification Service.
3) Hard constraints (you MUST obey):
   - If the API contains any /posts endpoints, the diagram MUST include "Post Service".
   - If the API contains any /feed endpoints, the diagram MUST include "Feed Service".
4) Include in the diagram: API Server or BFF (Backend-for-Frontend), and a Database per service (or shared DB where appropriate).
5) Add a Cache for read-heavy endpoints (e.g. GET /feed should imply a cache in front of or beside Feed Service).
6) If feed or notification fanout is implied by the APIs, optionally include an Event Bus or Message Queue.

Mermaid syntax rules:
- Use flowchart TB (top to bottom). Use only safe node ids (letters, numbers, underscores; no spaces or special characters). Put human-readable labels in square brackets: id[Label Text].
- Example: Client[Client] --> LB[Load Balancer], LB --> API[API Server], API --> PostSvc[Post Service], PostSvc --> DB[(Database)].
- For databases you may use parentheses: db[(Database)]. Keep the diagram under 25 lines.

Output format: Respond with valid JSON only, no other text. Use this exact shape:
{{"elements": ["Component1", "Component2", ...], "suggested_diagram": "<mermaid code>"}}
- "elements": list of 5-10 key component names that appear in the diagram (e.g. "Post Service", "Feed Service", "Cache", "API Server").
- "suggested_diagram": ONLY the raw Mermaid flowchart code (flowchart TB ...). No markdown code fences, no explanations. Valid Mermaid only."""


DIAGRAM_LLM_SYSTEM_PROMPT = """You are a system design expert. For a given system design topic:
1) List 5-7 key components (e.g. Load Balancer, API Server, Database, Cache, Client).
2) Provide a high-level architecture diagram in Mermaid flowchart syntax showing how these components connect (use direction TB or LR, rectangles for components, arrows for flow). Use short id labels in the diagram (e.g. A[Client], B[Load Balancer]).

Respond only with valid JSON in this exact shape, no other text:
{"elements": ["Component 1", "Component 2", ...], "mermaid_diagram": "flowchart TB\\n  A[Client] --> B[Load Balancer]\\n  B --> C[API Server]\\n  ..."}"""


def _strip_mermaid_fences(raw: str) -> str:
    """Remove markdown code fences and extra whitespace from Mermaid block."""
    s = (raw or "").strip()
    for prefix in ("```mermaid", "```"):
        if s.startswith(prefix):
            s = s[len(prefix) :].lstrip("\n")
        if s.endswith("```"):
            s = s[: s.rfind("```")].rstrip()
    return s.strip()


def _stub_diagram_1(_topic: str, _api_spec: str | None = None) -> DiagramLLM1Result:
    return {
        "elements": [
            "Load Balancer",
            "API Server",
            "Database",
            "Cache",
            "Client",
        ],
        "suggested_diagram": "flowchart TB\n  A[Client] --> B[Load Balancer]\n  B --> C[API Server]\n  C --> D[Database]\n  C --> E[Cache]",
    }


def _stub_diagram_2(_topic: str) -> list[str]:
    return [
        "Web Server",
        "Application Server",
        "Database",
        "Message Queue",
        "CDN",
    ]


async def call_llm_diagram_1(topic: str, api_spec: str | None = None) -> DiagramLLM1Result:
    """Return key diagram elements and a suggested Mermaid diagram (OpenAI).
    If api_spec is provided, the diagram is generated from the API spec with service-mapping rules.
    Falls back to stub if no key or error."""
    if not OPENAI_API_KEY:
        return _stub_diagram_1(topic, api_spec)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    use_api_prompt = bool((api_spec or "").strip())
    if use_api_prompt:
        user_content = build_api_to_diagram_prompt(api_spec.strip())
        system_content = "You generate a high-level architecture Mermaid diagram from an API spec. Follow the mapping rules exactly. Output only valid JSON with elements and suggested_diagram."
    else:
        system_content = DIAGRAM_LLM_SYSTEM_PROMPT
        user_content = f"System design topic: {topic}"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_diagram_1(topic, api_spec)
        data = json.loads(content)
        elements = data.get("elements") or []
        if not isinstance(elements, list):
            elements = []
        elements = [str(x).strip() for x in elements][:10]
        mermaid = (
            data.get("mermaid_diagram")
            or data.get("suggested_diagram")
            or ""
        ).strip()
        mermaid = _strip_mermaid_fences(mermaid)
        if not mermaid:
            mermaid = _stub_diagram_1(topic, api_spec)["suggested_diagram"]
        if not mermaid.startswith("flowchart"):
            mermaid = "flowchart TB\n  " + mermaid
        print("Diagram elements:", elements)
        return {"elements": elements, "suggested_diagram": mermaid}
    except Exception:
        return _stub_diagram_1(topic, api_spec)


async def call_llm_diagram_2(topic: str) -> list[str]:
    """Return key diagram elements (stub; replace with second LLM)."""
    return _stub_diagram_2(topic)


# --- End-to-end flow validation ---

FLOW_VALIDATION_PROMPT = """You are a system design expert. You are given:
1) A system design topic.
2) Optional: a list of component labels from the user's high-level diagram (if provided).
3) The user's end-to-end flow summary (how a request or data flows through the system).

Your task: Validate whether the user's flow summary is correct and consistent with the system design and (if provided) the diagram components. Consider:
- Does the flow align with typical architecture for this kind of system?
- If diagram labels were given, does the flow mention or imply the right components and their order?
- Are critical steps (e.g. load balancing, caching, persistence, external calls) present where expected?
- Is the sequence logical (e.g. client -> LB -> app -> DB, not client -> DB directly)?

Respond with valid JSON only, in this exact shape (no other text):
{"correct": true or false, "feedback": "1-3 sentences on what is correct or wrong about the flow", "improvements": "Concrete suggestions: missing steps, wrong order, components to add, or clarifications. Empty string if no improvements needed."}
- "correct": true if the flow is largely correct and aligns with the expected design; false if it has significant gaps or errors.
- "feedback": Brief overall assessment (what they got right or wrong).
- "improvements": Specific, actionable suggestions. Leave empty if the flow is good."""


async def call_llm_validate_flow(
    topic: str, flow_summary: str, diagram_labels: list[str] | None = None
) -> dict:
    """Validate user's end-to-end flow summary against the system design and optional diagram. Returns {correct, feedback, improvements}."""
    stub_result = {
        "correct": True,
        "feedback": "Flow summary was not validated (no API key or empty input).",
        "improvements": "",
    }
    if not (flow_summary or "").strip():
        return {**stub_result, "feedback": "No flow summary provided.", "correct": False}
    if not OPENAI_API_KEY:
        return stub_result
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    user_content = f"System design topic: {topic}\n\nUser's end-to-end flow summary:\n{flow_summary.strip()}"
    if diagram_labels:
        user_content += f"\n\nComponent labels from the user's high-level diagram (for reference):\n" + ", ".join(diagram_labels)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": FLOW_VALIDATION_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return stub_result
        data = json.loads(content)
        return {
            "correct": bool(data.get("correct", False)),
            "feedback": str(data.get("feedback") or "").strip() or "No feedback.",
            "improvements": str(data.get("improvements") or "").strip(),
        }
    except Exception:
        return stub_result


# --- Deep dives: suggested summary per topic ---

DEEP_DIVES_PROMPT = """You are a system design expert. You are given:
1) A system design topic (e.g. "URL Shortener", "News Feed").
2) A list of "deep dive" sub-topics the user wants to elaborate on (e.g. "Caching strategy", "Database sharding", "Rate limiting"). For each, the user may have written their own summary/elaboration.

Your task:
A) For each deep dive sub-topic the user listed, produce a concise "suggested summary" (2-5 sentences) that would be a strong interview answer for that aspect of the system. If the user provided their own summary for a topic, also give brief feedback on it (what's good, what to add or correct).
B) Suggest exactly 3 additional important deep dive topics that the user did NOT cover but are relevant and valuable for this system design. These should be topics an interviewer might ask about (e.g. "Fault tolerance and replication", "Consistency model", "Monitoring and observability"). Do not repeat or semantically overlap with the user's topics.

Respond with valid JSON only, in this exact shape (no other text):
{"items": [{"topic": "exact sub-topic name", "suggestedSummary": "2-5 sentences", "feedback": "brief feedback if user wrote something, else empty string"}, ...], "suggestedMissingTopics": ["Missing topic 1", "Missing topic 2", "Missing topic 3"]}
- "items": same as before; "topic" must match the exact sub-topic string from the request; "suggestedSummary" and "feedback" as described.
- "suggestedMissingTopics": exactly 3 strings, each a short label for an important deep dive the user missed (different from what they already listed)."""


async def call_llm_deep_dives(
    system_topic: str, deep_dives: list[dict]
) -> dict:
    """For each deep dive topic, generate suggested summary and optional feedback; also return 3 suggested missing topics. Returns {"items": [...], "suggestedMissingTopics": [...]}."""
    empty_items = [
        {"topic": d.get("topic", ""), "suggestedSummary": "", "feedback": ""}
        for d in deep_dives
    ]
    if not deep_dives:
        return {"items": [], "suggestedMissingTopics": []}
    if not OPENAI_API_KEY:
        return {
            "items": [
                {"topic": d.get("topic", ""), "suggestedSummary": "(No API key.)", "feedback": ""}
                for d in deep_dives
            ],
            "suggestedMissingTopics": [],
        }
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    lines = []
    for d in deep_dives:
        topic_name = (d.get("topic") or "").strip()
        user_sum = (d.get("userSummary") or "").strip()
        if not topic_name:
            continue
        line = f"- {topic_name}"
        if user_sum:
            line += f"\n  User's summary: {user_sum[:500]}"
        lines.append(line)
    if not lines:
        return {"items": [], "suggestedMissingTopics": []}
    user_content = f"System design topic: {system_topic}\n\nDeep dive topics (with optional user summary):\n" + "\n".join(lines)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DEEP_DIVES_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return {"items": empty_items, "suggestedMissingTopics": []}
        data = json.loads(content)
        raw = data.get("items") or []
        if not isinstance(raw, list):
            return {"items": empty_items, "suggestedMissingTopics": []}
        topic_map = {str(x.get("topic", "")).strip(): x for x in raw}
        result = []
        for d in deep_dives:
            t = (d.get("topic") or "").strip()
            item = topic_map.get(t) or {}
            result.append({
                "topic": t,
                "suggestedSummary": str(item.get("suggestedSummary") or "").strip(),
                "feedback": str(item.get("feedback") or "").strip(),
            })
        raw_missing = data.get("suggestedMissingTopics") or data.get("suggested_missing_topics") or []
        if not isinstance(raw_missing, list):
            raw_missing = []
        suggested_missing = [str(x).strip() for x in raw_missing if str(x).strip()][:3]
        return {"items": result, "suggestedMissingTopics": suggested_missing}
    except Exception:
        return {"items": empty_items, "suggestedMissingTopics": []}


# --- Detailed design diagram: validate against all discussed points, return feedback + suggested diagram ---

DETAILED_DIAGRAM_VALIDATION_PROMPT = """You are a system design expert. You are given a system design topic and everything the user has discussed so far in their interview prep:

1) Requirements (functional and non-functional).
2) API design (APIs with request/response).
3) Database schema / data model (key entities or schema lines).
4) High-level diagram: component labels from their high-level architecture diagram.
5) End-to-end flow summary (how requests/data move through the system).
6) Deep dives: sub-topics (e.g. Caching, Sharding, Rate limiting) with their summaries.
7) The text labels extracted from the user's DETAILED design diagram (draw.io) — the components/boxes they drew in this step.

Your task:
A) Validate whether the user's detailed diagram is consistent with and reflects ALL the points discussed: requirements, API design, database schema, high-level diagram, end-to-end flow, and deep dives. Check for alignment, missing components, and any contradictions.
B) Give diagram-based "feedback" (2-5 sentences): what is good, what aligns or misaligns with each of the discussed areas. Be specific (e.g. "aligns with your API design and flow" or "missing the cache layer from your deep dives").
C) Give "improvements": specific, actionable diagram improvements — missing components from requirements/API/schema/high-level/flow/deep dives, better alignment, or corrections. Empty string only if the diagram is strong across all areas.
D) Provide a "suggested_diagram": a detailed system-design diagram in Mermaid flowchart syntax — same style as a high-level architecture Mermaid diagram but richer: reflect APIs, schema entities, high-level components, end-to-end flow, and deep dives (e.g. cache, sharding, queues) where relevant.

Mermaid rules (strict):
- Use flowchart TB or flowchart LR. Node ids: only letters, numbers, underscores (no spaces in ids). Human-readable text in [square brackets]: id[Label] or id[(Database)] for DB-style nodes.
- Use subgraph for logical tiers or bounded contexts, e.g. subgraph client[Client tier] ... end, subgraph app[Application] ... end, subgraph data[Data layer] ... end. Connect tiers with arrows across subgraph boundaries.
- Keep under ~40 lines. No markdown fences inside the string. Valid Mermaid only.

Respond with valid JSON only, in this exact shape (no other text):
{"feedback": "2-5 sentences", "improvements": "actionable suggestions or empty string", "suggested_diagram": "flowchart TB\\n  subgraph client[Client]\\n    C[Browser/App]\\n  end\\n  ..."}
- Use the key "suggested_diagram" for the raw Mermaid source. Escape newlines as \\n in the JSON value."""


async def call_llm_validate_detailed_diagram(
    topic: str,
    requirements_summary: str,
    api_design_summary: str,
    data_model_summary: str,
    high_level_labels: list[str],
    end_to_end_flow: str,
    deep_dives: list[dict],
    diagram_labels: list[str],
) -> dict:
    """Validate user's detailed diagram against all discussed points; return feedback, improvements, and a suggested Mermaid diagram."""
    stub = {
        "feedback": "Validation skipped (no API key or missing context).",
        "improvements": "",
        "suggested_diagram": (
            "flowchart TB\n"
            "  subgraph client[Client tier]\n"
            "    C[Client]\n"
            "  end\n"
            "  subgraph app[Application]\n"
            "    LB[Load Balancer] --> API[API Server]\n"
            "    API --> CACHE[Cache]\n"
            "  end\n"
            "  subgraph data[Data]\n"
            "    DB[(Database)]\n"
            "  end\n"
            "  C --> LB\n"
            "  API --> DB"
        ),
    }
    if not OPENAI_API_KEY:
        return stub
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    flow_text = (end_to_end_flow or "").strip()
    deep_lines = []
    for d in deep_dives or []:
        t = (d.get("topic") or "").strip()
        if not t:
            continue
        user_s = (d.get("userSummary") or "").strip()
        sugg_s = (d.get("suggestedSummary") or "").strip()
        summary = sugg_s if sugg_s else user_s
        deep_lines.append(f"- {t}: {summary[:400]}" if summary else f"- {t}")
    deep_block = "\n".join(deep_lines) if deep_lines else "(No deep dives provided.)"
    high_level_text = ", ".join(high_level_labels) if high_level_labels else "(None provided.)"
    labels_text = ", ".join(diagram_labels) if diagram_labels else "(No diagram labels extracted.)"
    user_content = f"""System design topic: {topic}

Requirements (functional and non-functional):
{requirements_summary or "(None provided.)"}

API design:
{api_design_summary or "(None provided.)"}

Database schema / data model:
{data_model_summary or "(None provided.)"}

High-level diagram component labels:
{high_level_text}

End-to-end flow (user's summary):
{flow_text or "(No flow provided.)"}

Deep dives (topic and summary):
{deep_block}

Labels from the user's DETAILED diagram (components they drew):
{labels_text}

Produce JSON with "feedback", "improvements", and "suggested_diagram" (Mermaid flowchart source) as described in the system prompt."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DETAILED_DIAGRAM_VALIDATION_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return stub
        data = json.loads(content)
        feedback = str(data.get("feedback") or "").strip() or stub["feedback"]
        improvements = str(data.get("improvements") or "").strip()
        suggested = (
            (data.get("suggested_diagram") or data.get("suggestedDiagram") or "").strip()
            .replace("\\n", "\n")
        )
        suggested = _strip_mermaid_fences(suggested)
        if not suggested:
            suggested = stub["suggested_diagram"]
        s0 = suggested.lstrip().lower()
        if not (s0.startswith("flowchart") or s0.startswith("graph")):
            suggested = "flowchart TB\n  " + suggested
        return {
            "feedback": feedback,
            "improvements": improvements,
            "suggested_diagram": suggested,
        }
    except Exception:
        return stub


# --- Back-of-the-envelope estimation: key estimation items from two LLMs ---

ESTIMATION_LLM_SYSTEM_PROMPT = """You are a system design expert. For a given system design topic, list 5-7 key back-of-the-envelope estimation items that should be considered (e.g. DAU/MAU or user scale, Queries per second (QPS), Storage size, Bandwidth, Read/write ratio, Cache hit rate, Data retention). Each item should be a short label describing what to estimate. Respond only with valid JSON in this exact shape, no other text:
{"elements": ["Estimation item 1", "Estimation item 2", "Estimation item 3", ...]}"""


def _stub_estimation_1(_topic: str) -> list[str]:
    return [
        "DAU / MAU or user scale",
        "Queries per second (QPS)",
        "Storage size",
        "Bandwidth",
        "Read/write ratio",
    ]


def _stub_estimation_2(_topic: str) -> list[str]:
    return [
        "Daily active users",
        "Requests per second",
        "Data storage requirements",
        "Network bandwidth",
        "Cache hit rate",
    ]


async def call_llm_estimation_1(topic: str) -> list[str]:
    """Return key estimation items (OpenAI). Falls back to stub if no key or error."""
    if not OPENAI_API_KEY:
        return _stub_estimation_1(topic)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ESTIMATION_LLM_SYSTEM_PROMPT},
                {"role": "user", "content": f"System design topic: {topic}"},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_estimation_1(topic)
        data = json.loads(content)
        elements = data.get("elements") or []
        if not isinstance(elements, list):
            elements = []
        return [str(x).strip() for x in elements][:7]
    except Exception:
        return _stub_estimation_1(topic)


async def call_llm_estimation_2(topic: str) -> list[str]:
    """Return key estimation items (stub; replace with second LLM)."""
    return _stub_estimation_2(topic)


# --- Back-of-the-envelope: strict reference estimates + comparison ---


class EstimationEvaluationResult(TypedDict):
    expected_estimations: list[dict[str, str]]
    comparison_feedback: list[dict[str, str]]
    missing_items: list[str]
    overall_feedback: str


ESTIMATION_EVALUATION_PROMPT = """You are a senior system design interviewer. Evaluate back-of-the-envelope estimates with strict math and unit discipline.

Workflow (you MUST follow this order internally):
1) State reasonable assumptions for the given topic (user scale, read/write mix, payload sizes, retention, etc.). When the system has end users, include DAU and MAU (or explain why only one applies).
2) For each important metric, derive expected_value step by step with intermediate calculations. Use 86,400 seconds per day. Keep units explicit (e.g. req/s, GB/day, Gbps). Check arithmetic.
3) Map the user's lines to categories by meaning (not exact wording). Extract user_value per category; if the user did not address a category, user_value must be "".
4) Compare: status must be exactly one of: correct, close, incorrect, missing
   - correct: matches your expected within ~2x and derivation/units are sound
   - close: right order of magnitude but notable assumption gap, rounding, or minor math slip
   - incorrect: wrong magnitude, wrong formula, arithmetic error, or unit mismatch
   - missing: user did not provide this category (user_value empty)
5) missing_items: list short labels for important categories absent from the user's submission (not already fully covered). Prefer concrete names (e.g. "MAU", "Peak write QPS").
6) comparison_feedback: one object per category you judge (cover user scale/DAU/MAU when relevant, average and/or peak QPS or RPS, storage, bandwidth, cache hit rate if relevant). For each row, feedback must be concise and specific (wrong assumption / wrong formula / arithmetic error / unit mismatch / missing derivation).

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "expected_estimations": [
    {"item": "DAU", "expected_value": "...", "derivation": "Assumption: ... Step: ... => ..."}
  ],
  "comparison_feedback": [
    {"item": "DAU", "user_value": "...", "expected_value": "...", "status": "correct", "feedback": "..."}
  ],
  "missing_items": ["Bandwidth"],
  "overall_feedback": "2-4 sentences."
}

Use snake_case keys exactly as shown."""


def _normalize_status(raw: str) -> str:
    s = (raw or "").strip().lower()
    if s in ("correct", "close", "incorrect", "missing"):
        return s
    return "incorrect"


def _parse_expected_row(obj: object) -> dict[str, str] | None:
    if not isinstance(obj, dict):
        return None
    item = str(obj.get("item") or "").strip()
    ev = str(obj.get("expected_value") or obj.get("expectedValue") or "").strip()
    der = str(obj.get("derivation") or "").strip()
    if not item or not ev:
        return None
    return {"item": item, "expected_value": ev, "derivation": der or "(no derivation provided)"}


def _parse_comparison_row(obj: object) -> dict[str, str] | None:
    if not isinstance(obj, dict):
        return None
    item = str(obj.get("item") or "").strip()
    if not item:
        return None
    uv = str(obj.get("user_value") or obj.get("userValue") or "").strip()
    ev = str(obj.get("expected_value") or obj.get("expectedValue") or "").strip()
    st = _normalize_status(str(obj.get("status") or ""))
    fb = str(obj.get("feedback") or "").strip() or "No feedback."
    if not ev:
        ev = "—"
    return {
        "item": item,
        "user_value": uv,
        "expected_value": ev,
        "status": st,
        "feedback": fb,
    }


def _coerce_estimation_evaluation(data: dict) -> EstimationEvaluationResult:
    raw_exp = data.get("expected_estimations") or data.get("expectedEstimations") or []
    expected: list[dict[str, str]] = []
    if isinstance(raw_exp, list):
        for x in raw_exp:
            row = _parse_expected_row(x)
            if row:
                expected.append(row)

    raw_comp = data.get("comparison_feedback") or data.get("comparisonFeedback") or []
    comparison: list[dict[str, str]] = []
    if isinstance(raw_comp, list):
        for x in raw_comp:
            row = _parse_comparison_row(x)
            if row:
                comparison.append(row)

    raw_miss = data.get("missing_items") or data.get("missingItems") or []
    missing: list[str] = []
    if isinstance(raw_miss, list):
        missing = [str(x).strip() for x in raw_miss if str(x).strip()]

    overall = str(data.get("overall_feedback") or data.get("overallFeedback") or "").strip()

    return {
        "expected_estimations": expected,
        "comparison_feedback": comparison,
        "missing_items": missing,
        "overall_feedback": overall,
    }


def _stub_estimation_evaluation(
    topic: str, user_estimations: list[str]
) -> EstimationEvaluationResult:
    placeholder = (
        "Set OPENAI_API_KEY for topic-specific reference estimates with full derivations."
    )
    expected: list[dict[str, str]] = [
        {
            "item": "User scale (DAU / MAU)",
            "expected_value": placeholder,
            "derivation": f"Topic: {topic}. Stub mode cannot derive numbers.",
        },
        {
            "item": "Traffic (QPS / RPS)",
            "expected_value": placeholder,
            "derivation": "Stub: derive from DAU × actions/user/day ÷ 86,400 with explicit peak multiplier.",
        },
        {
            "item": "Storage",
            "expected_value": placeholder,
            "derivation": "Stub: objects × payload × retention with replication factor.",
        },
        {
            "item": "Bandwidth",
            "expected_value": placeholder,
            "derivation": "Stub: QPS × payload × 8 bits, separate read vs write if needed.",
        },
    ]
    comparison: list[dict[str, str]] = []
    for line in user_estimations:
        ln = line.strip()
        if not ln:
            continue
        comparison.append({
            "item": "User line",
            "user_value": ln,
            "expected_value": "—",
            "status": "close",
            "feedback": "Stub mode: enable API key for independent reference values and strict comparison.",
        })
    overall = (
        "Stub evaluation: configure OpenAI for step-by-step reference estimates, "
        "per-category status (correct/close/incorrect/missing), and missing-items detection."
    )
    missing_default = ["MAU", "Peak QPS", "Storage", "Bandwidth"]
    missing = missing_default if not user_estimations else []
    return {
        "expected_estimations": expected,
        "comparison_feedback": comparison,
        "missing_items": missing,
        "overall_feedback": overall,
    }


async def call_llm_estimation_evaluation(
    topic: str, user_estimations: list[str]
) -> EstimationEvaluationResult:
    """Derive reference estimates, compare to user lines, return structured evaluation."""
    if not OPENAI_API_KEY:
        return _stub_estimation_evaluation(topic, user_estimations)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    lines = "\n".join(user_estimations) if user_estimations else "(none — user submitted no lines)"
    user_block = f"User's estimation lines (one per line):\n{lines}"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ESTIMATION_EVALUATION_PROMPT},
                {
                    "role": "user",
                    "content": f"System design topic: {topic}\n\n{user_block}",
                },
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_estimation_evaluation(topic, user_estimations)
        data = json.loads(content)
        if not isinstance(data, dict):
            return _stub_estimation_evaluation(topic, user_estimations)
        out = _coerce_estimation_evaluation(data)
        if not out["expected_estimations"]:
            stub = _stub_estimation_evaluation(topic, user_estimations)
            out["expected_estimations"] = stub["expected_estimations"]
        if not out["overall_feedback"]:
            out["overall_feedback"] = (
                "See expected_estimations and comparison_feedback for category-level feedback."
            )
        return out
    except Exception:
        return _stub_estimation_evaluation(topic, user_estimations)


# --- Data model: key tables + fields from two LLMs + feedback ---

DATA_MODEL_LLM_SYSTEM_PROMPT = """You are a system design expert. List 5-7 key database schema elements (tables and indexes) that the user should have. If the user's API design is provided, derive required tables from those APIs (e.g. GET /users → Users table, POST /messages → Messages table, GET /chats → Chats or conversation table). Format each item exactly as follows:
- For tables/entities: "TableName (field1, field2, field3)" — include main key fields (id, foreign keys, timestamps). Use singular or plural consistently.
- For indexes: "Index on TableName.fieldName" or "Index on fieldName".
Examples: "Users (id, email, createdAt)", "Messages (id, conversationId, senderId, content, createdAt)", "Index on Messages.conversationId".
Every element must be a concrete table with fields or an index. Respond only with valid JSON in this exact shape, no other text:
{"elements": ["TableOrIndex 1 (fields if table)", "TableOrIndex 2 (fields if table)", ...]}"""


def _stub_data_model_1(_topic: str) -> list[str]:
    return [
        "Users (id, email, createdAt)",
        "ShortUrl (shortCode, longUrl, userId, createdAt)",
        "Clicks (shortCode, timestamp, userAgent)",
        "Index on ShortUrl.shortCode",
        "Index on ShortUrl.userId",
    ]


def _stub_data_model_2(_topic: str) -> list[str]:
    return [
        "Users (id, email, createdAt)",
        "UrlMapping (shortCode, longUrl, userId, createdAt)",
        "Analytics (shortCode, timestamp)",
        "Index on shortCode",
    ]


async def call_llm_data_model_1(topic: str, api_design: list[str] | None = None) -> list[str]:
    """Return key data model elements (OpenAI). If api_design provided, suggest tables that support those APIs."""
    if not OPENAI_API_KEY:
        return _stub_data_model_1(topic)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    user_content = f"System design topic: {topic}"
    if api_design:
        apis_str = "\n".join(f"- {a}" for a in api_design)
        user_content += f"\n\nAPI design (from interview summary) — suggest tables that support these APIs:\n{apis_str}"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DATA_MODEL_LLM_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_data_model_1(topic)
        data = json.loads(content)
        elements = data.get("elements") or []
        if not isinstance(elements, list):
            elements = []
        return [str(x).strip() for x in elements][:7]
    except Exception:
        return _stub_data_model_1(topic)


async def call_llm_data_model_2(topic: str, api_design: list[str] | None = None) -> list[str]:
    """Return key data model elements (stub; replace with second LLM)."""
    return _stub_data_model_2(topic)


class DataModelFeedbackItem(TypedDict):
    userLine: str
    reasonable: bool
    comment: str


DATA_MODEL_FEEDBACK_PROMPT = """You are a system design expert. Assess the user's database schema. For each line (table or index), check:

1) KEYS — REQUIRE AN EXPLICIT PRIMARY KEY: Every table must have an explicit primary key field (e.g. id, user_id, message_id), not just a "unique" business field. If the user only has a unique constraint on a business field (e.g. phone_number, email) but NO dedicated id/user_id/entity_id column, that is INSUFFICIENT: say "Missing explicit primary key: add user_id (or id) as PK. phone_number (unique) is OK for lookups but other tables cannot reference users by a stable PK." Do NOT say "Keys: OK" when the only key is a business field like phone_number — recommend adding user_id (or id) as the primary key. For wide-column/NoSQL use partition key + optional clustering key.
2) MISSING FIELDS: For tables, are there important fields missing (e.g. id, user_id, createdAt, updatedAt, foreign keys)? Always list missing fields when the table lacks an explicit PK (e.g. "Missing: user_id (PK)").
3) API alignment: If API design is provided, does this table support those APIs? Are relationships sensible?

When API design is provided, also suggest any TABLES that are missing in "suggestedMissingTables" with format "TableName (field1, field2, ...)". Empty list if no API design or none missing.

Return valid JSON only. Use the EXACT user line text in "userLine":
{"feedback": [{"userLine": "<exact line from user>", "reasonable": true or false, "comment": "Concise feedback: (1) Keys: if no explicit PK (id/user_id), say missing and suggest one. (2) Missing fields. (3) Any other note."}], "suggestedMissingTables": ["TableName (field1, field2, ...)", ...]}
- "reasonable": false if the table has no explicit primary key (e.g. only phone_number unique), critical fields missing, or doesn't fit system/APIs; true otherwise.
- "comment": 1–2 sentences. Always mention keys: if there is no id/user_id (or similar) as PK, say "Missing explicit primary key: add user_id (or id)." and any missing fields. Be constructive."""


def _stub_data_model_feedback(user_lines: list[str]) -> list[DataModelFeedbackItem]:
    return [
        {"userLine": line, "reasonable": True, "comment": "Stub: enable OpenAI API key for data model review."}
        for line in user_lines
    ]


class DataModelFeedbackResult(TypedDict):
    feedback: list[DataModelFeedbackItem]
    suggested_missing_tables: list[str]


async def call_llm_data_model_feedback(
    topic: str, user_lines: list[str], api_design: list[str] | None = None
) -> DataModelFeedbackResult:
    """Review each user data model line; when api_design provided, also return suggested missing tables."""
    empty_result: DataModelFeedbackResult = {
        "feedback": [],
        "suggested_missing_tables": [],
    }
    if not user_lines:
        return empty_result
    stub_feedback = _stub_data_model_feedback(user_lines)
    if not OPENAI_API_KEY:
        return {"feedback": stub_feedback, "suggested_missing_tables": []}
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    user_str = "\n".join(user_lines)
    user_content = f"System design topic: {topic}\n\nUser's data model (one per line):\n{user_str}"
    if api_design:
        apis_str = "\n".join(f"- {a}" for a in api_design)
        user_content += f"\n\nAPI design (validate schema against these):\n{apis_str}"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DATA_MODEL_FEEDBACK_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return {"feedback": stub_feedback, "suggested_missing_tables": []}
        data = json.loads(content)
        raw = data.get("feedback") or []
        if not isinstance(raw, list):
            return {"feedback": stub_feedback, "suggested_missing_tables": []}
        result: list[DataModelFeedbackItem] = []
        for line in user_lines:
            line_stripped = line.strip()
            match = next(
                (x for x in raw if isinstance(x, dict) and (x.get("userLine") or "").strip() == line_stripped),
                None,
            )
            if match and isinstance(match.get("reasonable"), bool):
                result.append({
                    "userLine": line_stripped,
                    "reasonable": bool(match["reasonable"]),
                    "comment": str(match.get("comment") or "").strip() or "No comment.",
                })
            else:
                result.append({
                    "userLine": line_stripped,
                    "reasonable": True,
                    "comment": "No specific feedback for this line.",
                })
        suggested_raw = data.get("suggestedMissingTables") or data.get("suggested_missing_tables") or []
        if not isinstance(suggested_raw, list):
            suggested_raw = []
        suggested_missing_tables = [str(x).strip() for x in suggested_raw if str(x).strip()]
        return {"feedback": result, "suggested_missing_tables": suggested_missing_tables}
    except Exception:
        return {"feedback": stub_feedback, "suggested_missing_tables": []}


class CoverageResult(TypedDict):
    matched: list[str]  # from reference list that user semantically covered
    missed: list[str]   # from reference list that user did not cover


COVERAGE_SYSTEM_PROMPT = """You are comparing a user's answers to a reference list. Match by CONCEPTS, not by exact phrases. Two items match if they express the same idea (paraphrases, synonyms, shorthand, or rewordings all count as the same concept). Normalize mentally before comparing: expand shorthand and treat equivalent terms as one. Return valid JSON only, in this exact shape:
{"matched": ["exact reference item 1", "exact reference item 2"], "missed": ["exact reference item 3", ...]}
- "matched": reference items that the user's answers cover by meaning (use the EXACT reference text in the list).
- "missed": reference items the user did NOT cover (use the EXACT reference text).
Every reference item must appear in either "matched" or "missed", and only those exact strings. No other text."""

COVERAGE_REQUIREMENTS_PROMPT = """You are comparing the user's functional or non-functional requirements to a reference list. Match by CONCEPTS, not by exact phrases.

CRITICAL: You must perform SEMANTIC matching. Do NOT require literal or similar wording. Two requirements match if they express the same capability, intent, or constraint—even when one is a shorthand and the other is a full sentence, or when they use different words (paraphrases, synonyms).

Before comparing:
1) Normalize mentally: expand shorthand and abbreviations (e.g. "1:1" = one-to-one = private/direct; "real-time" = instant/live delivery).
2) Treat synonyms and paraphrases as the same concept (e.g. "messaging" = "send and receive messages"; "group chats" = "create and join chat groups").
3) Do NOT penalize shorthand or brief terms: "1:1 messaging" matches "Users can send and receive private/direct messages"; "group chats" matches "Users can create and join chat groups"; "real-time delivery" matches "Users can send and receive messages in real-time".

Examples of MATCHED (same concept — put reference in "matched"):
- Reference "Users can send and receive messages in real-time" ↔ User wrote "1:1 messaging", "real-time delivery", "private messaging", "direct messages", or "instant messaging"
- Reference "Users can create and join chat groups" ↔ User wrote "group chats", "group messaging", "create groups", or "group conversations"
- Reference "User authentication and authorization" ↔ User wrote "Login and access control", "sign in", "Users can sign in and have roles"
- Reference "Scalability to handle 1M+ users" ↔ User wrote "Scale to millions", "scale horizontally", "handle high load"
- Reference "Response time < 200ms" ↔ User wrote "Low latency", "fast API", "API response under 200ms"
- Reference "Data storage and retrieval" ↔ User wrote "Persist and fetch data", "Database", "store data"
- Reference "RESTful API" ↔ User wrote "REST API", "HTTP API", "API endpoints"

Put a reference item in "matched" if ANY user requirement expresses the SAME concept (same intent, capability, or constraint). Put in "missed" ONLY when no user requirement addresses that idea at all. Use the EXACT reference text in your output.

Return valid JSON only:
{"matched": ["exact reference 1", ...], "missed": ["exact reference 2", ...]}
Every reference item must appear in either "matched" or "missed". No other text."""

COVERAGE_APIS_PROMPT = """Compare the user's API list to the reference list. Match by METHOD + INTENT (meaning), not literal path strings. Two APIs match if they do the same operation (same HTTP method or same action: create/get/list/update/delete) on the same logical resource.

Normalize mentally: strip /v1, /api; treat {id}, :id the same; treat path nesting vs query/body as equivalent when intent is the same.
- URL shortener: "/urls" and "/shorten" are equivalent for shorten_url (create short link). POST /v1/urls = POST /shorten = "create short URL from long URL".
- Chat: POST /conversations/{id}/messages ≈ POST /messages (send message); conversation/chat/room/thread are synonyms.

5 equivalence examples (treat as MATCHED):
1) POST /shorten – create short URL ↔ User "Create short link POST /v1/urls" or "POST /urls" or "POST /links"
2) GET /r/{id} or GET /redirect – resolve short URL ↔ User "GET /urls/:id" or "GET /r/{shortCode}"
3) POST /messages – send new message to chat ↔ User "POST /v1/conversations/{conversation_id}/messages" or "POST /chats/{id}/messages"
4) GET /messages – list messages in conversation ↔ User "GET /conversations/{id}/messages" or "GET /messages?conversation_id=..."
5) POST /conversations – create conversation ↔ User "POST /chats" or "POST /rooms" or "POST /threads"

APIs can be HTTP, RPC, or method calls; match by intent (e.g. POST /shorten = MessageService.ShortenUrl).

5) Output format (STRICT JSON ONLY):
   - You MUST return JSON in this exact shape, and nothing else:
   {
     "matched":[{"user":"<user API string (HTTP path, RPC method, or function call)>","expected":"<reference API string>","why":"<short explanation of why they are equivalent>"}],
     "missed":[{"expected":"<reference API string>","why":"<short explanation of what is missing or different>"}]
   }

   Rules:
   - \"matched\": for each REFERENCE API that IS covered, include exactly one object with:
       * expected: EXACT string from the reference list (copy as-is)
       * user: one user-provided API string that best matches it (HTTP, RPC, or method — any description the user wrote is allowed)
       * why: 1 short sentence explaining why they are semantically equivalent (mention action/resource/scope; note if same intent across HTTP vs RPC vs method).
   - \"missed\": for each REFERENCE API that is NOT covered at all, include one object with:
       * expected: EXACT string from the reference list
       * why: short explanation of what is missing (e.g. \"no API that sends messages to a conversation\" or \"no API to list conversations\").
   - Every REFERENCE API must appear in EITHER \"matched\" or \"missed\" exactly once (via its \"expected\" value).
   - Do NOT invent extra reference APIs. Do NOT include plain strings in matched/missed: only objects with the keys above.
   - Do NOT include any text outside this JSON object (no commentary, no markdown)."""

COVERAGE_DIAGRAM_PROMPT = """You are comparing diagram labels to a reference list of expected components. Match by CONCEPTS, not by exact words. The reference list is the expected components; the user's list is the text labels from their diagram.

SEMANTIC MATCHING: Treat paraphrases, synonyms, and shorthand as equivalent. Normalize before comparing (e.g. "LB" = "Load Balancer", "DB" = "Database", "Cache" = "Redis/Cache"). Do NOT penalize brief or different labels that express the same component.

Examples of MATCHED (same concept):
- Reference "Load Balancer" ↔ User label "L4 LB", "LB", "Load Balancer", "Traefik"
- Reference "Database" ↔ User label "DB", "Database (Dynamo DB)", "Postgres", "MySQL"
- Reference "API Server" ↔ User label "API", "Backend", "BFF", "API Gateway"
- Reference "Cache" ↔ User label "Redis", "Cache", "CDN"

Put a reference item in "matched" if ANY user label refers to the SAME component or concept. Put in "missed" only if no user label addresses that component. Your response must contain ONLY exact strings from the reference list—copy them character-for-character. Do NOT put the user's labels in your response.

Return valid JSON only:
{"matched": ["Reference item 1", "Reference item 2"], "missed": ["Reference item 3", ...]}
Every reference item must appear in either "matched" or "missed". No other text."""

COVERAGE_SCHEMA_PROMPT = """You are comparing the user's database schema to a reference list of expected tables and indexes. The REFERENCE list has items like "TableName (field1, field2, ...)" or "Index on X". The user's list is what they wrote (may use different table names or field names).

SEMANTIC MATCHING — same table/entity counts as matched even if names differ:
- Table names: "User Table", "User", "Users" = SAME table. "Message", "Messages", "ChatMessage" = same if they mean the same entity. Match by real-world entity, not exact spelling.
- Field names: user_id vs id, phone_number vs email, name vs username, created_at vs createdAt are equivalent. If the user's line describes the same table with overlapping or equivalent fields, it MATCHES.
- Chats/Conversations vs Messages: A reference "Chats" or "Conversations" table (conversation between users) is MATCHED if the user has a Messages/Message table that includes conversation_id or chat_id (or similar). The user may model conversations via messages grouped by conversation_id without a separate Chats table — that counts as covering the Chats/conversation concept. So "Message Table: conversation_id, message_id, sender_id, content, created_at" MATCHES reference "Chats (id, userId1, userId2, createdAt)" because both represent the conversation/chat concept.

RULES:
- "matched": Put a reference item here if ANY user line semantically describes the SAME table or the SAME index. Same table = same entity; Chats/Conversations = matched by Messages table with conversation_id/chat_id.
- "missed": Put a reference item here ONLY if it is a TABLE (format "TableName (field1, field2, ...)") that no user line describes. Do NOT put "Index on ..." in "missed". We only suggest missing TABLES.

Use EXACT reference strings only. Return valid JSON only:
{"matched": ["exact reference 1", ...], "missed": ["exact reference 2", ...]}
Every reference item must appear in either "matched" or "missed". No other text."""


async def classify_requirements_coverage(
    reference: list[str],
    user_answers: list[str],
    *,
    for_diagram: bool = False,
    for_schema: bool = False,
    for_requirements: bool = False,
    for_apis: bool = False,
    api_design: list[str] | None = None,
) -> CoverageResult:
    """
    Uses the LLM to decide which reference requirements are semantically covered
    by the user's answers. Returns matched (covered) and missed (not covered),
    each as subsets of the reference list (exact strings).
    When for_apis=True, a deterministic normalization layer runs first; only
    borderline/unmatched reference items are sent to the LLM.
    """
    if not reference:
        return {"matched": [], "missed": []}

    # API path: run deterministic normalization first; only send unmatched to LLM
    if for_apis:
        auto_pairs, unmatched_ref, _ = compute_api_auto_matches(reference, user_answers)
        auto_matched_refs = [p[0] for p in auto_pairs]
        if not unmatched_ref:
            return {"matched": list(reference), "missed": []}
        if not OPENAI_API_KEY:
            return {"matched": auto_matched_refs, "missed": unmatched_ref}
        # LLM only for unmatched reference items; user list is full so LLM can still match
        ref_str = "\n".join(f"- {r}" for r in unmatched_ref)
        user_str = "\n".join(f"- {a}" for a in user_answers) if user_answers else "(none)"
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": COVERAGE_APIS_PROMPT},
                    {"role": "user", "content": f"Reference list (expected APIs — use these EXACT strings in matched/missed):\n{ref_str}\n\nUser's APIs:\n{user_str}"},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            if not content:
                return {"matched": auto_matched_refs, "missed": unmatched_ref}
            data = json.loads(content)
            raw_matched = data.get("matched") or []
            raw_missed = data.get("missed") or []
            if not isinstance(raw_matched, list):
                raw_matched = []
            if not isinstance(raw_missed, list):
                raw_missed = []
            llm_matched_refs = []
            if raw_matched and isinstance(raw_matched[0], dict):
                for item in raw_matched:
                    expected_val = str(item.get("expected", "")).strip()
                    if expected_val in unmatched_ref:
                        llm_matched_refs.append(expected_val)
            else:
                llm_matched_refs = [str(x).strip() for x in raw_matched if str(x).strip() in unmatched_ref]
            matched = list(dict.fromkeys(auto_matched_refs + llm_matched_refs))
            missed = [r for r in reference if r not in matched]
            return {"matched": matched, "missed": missed}
        except Exception:
            return {"matched": auto_matched_refs, "missed": unmatched_ref}

    if not OPENAI_API_KEY:
        return {"matched": [], "missed": list(reference)}

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    ref_str = "\n".join(f"- {r}" for r in reference)
    user_str = "\n".join(f"- {a}" for a in user_answers) if user_answers else "(none)"
    if for_schema:
        system_prompt = COVERAGE_SCHEMA_PROMPT
        user_content = f"Reference list (expected tables/indexes — use these EXACT strings in matched/missed):\n{ref_str}\n\nUser's schema (what they wrote):\n{user_str}"
        if api_design:
            apis_str = "\n".join(f"- {a}" for a in api_design)
            user_content += f"\n\nAPI design (for context):\n{apis_str}"
    elif for_diagram:
        system_prompt = COVERAGE_DIAGRAM_PROMPT
        user_content = (
            f"Reference list (copy these exact strings into your matched/missed lists):\n{ref_str}\n\nUser's list:\n{user_str}"
        )
    elif for_requirements:
        system_prompt = COVERAGE_REQUIREMENTS_PROMPT
        user_content = f"Reference list (use these EXACT strings in matched/missed):\n{ref_str}\n\nUser's requirements:\n{user_str}"
    else:
        system_prompt = COVERAGE_SYSTEM_PROMPT
        user_content = f"Reference requirements (use these exact strings in your answer):\n{ref_str}\n\nUser's answers:\n{user_str}"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return {"matched": [], "missed": list(reference)}
        data = json.loads(content)
        raw_matched = data.get("matched") or []
        raw_missed = data.get("missed") or []
        if not isinstance(raw_matched, list):
            raw_matched = []
        if not isinstance(raw_missed, list):
            raw_missed = []
        # For API coverage we allow rich objects {user, expected, why}; convert to reference strings.
        if for_apis:
            if raw_matched and isinstance(raw_matched[0], dict):
                matched = []
                for item in raw_matched:
                    expected_val = str(item.get("expected", "")).strip()
                    if expected_val and expected_val in reference:
                        matched.append(expected_val)
            else:
                matched = [str(x).strip() for x in raw_matched if str(x).strip() in reference]
            if raw_missed and isinstance(raw_missed[0], dict):
                missed = []
                for item in raw_missed:
                    expected_val = str(item.get("expected", "")).strip()
                    if expected_val and expected_val in reference:
                        missed.append(expected_val)
            else:
                missed = [str(x).strip() for x in raw_missed if str(x).strip() in reference]
        else:
            matched = [str(x).strip() for x in raw_matched if str(x).strip() in reference]
            missed = [str(x).strip() for x in raw_missed if str(x).strip() in reference]
        if for_diagram:
            print("[diagram] LLM raw matched:", raw_matched, "| LLM raw missed:", raw_missed)
        if for_schema:
            print("[schema] LLM raw matched:", raw_matched, "| LLM raw missed:", raw_missed)
        if for_requirements:
            print("[requirements] LLM raw matched:", raw_matched, "| LLM raw missed:", raw_missed)
        if for_apis:
            print("[apis] LLM raw matched:", raw_matched, "| LLM raw missed:", raw_missed)
        matched_set = set(matched)
        missed = [m for m in missed if m not in matched_set]
        for r in reference:
            if r not in matched_set and r not in missed:
                missed.append(r)
        return {"matched": matched, "missed": missed}
    except Exception:
        return {"matched": [], "missed": list(reference)}
