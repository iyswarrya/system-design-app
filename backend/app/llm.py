"""LLM calls for system design requirements. call_llm1 = OpenAI; call_llm2 = stub (or Anthropic)."""

import json
import os
from typing import TypedDict

from dotenv import load_dotenv
from openai import AsyncOpenAI

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


DIAGRAM_LLM_SYSTEM_PROMPT = """You are a system design expert. For a given system design topic:
1) List 5-7 key components (e.g. Load Balancer, API Server, Database, Cache, Client).
2) Provide a high-level architecture diagram in Mermaid flowchart syntax showing how these components connect (use direction TB or LR, rectangles for components, arrows for flow). Use short id labels in the diagram (e.g. A[Client], B[Load Balancer]).

Respond only with valid JSON in this exact shape, no other text:
{"elements": ["Component 1", "Component 2", ...], "mermaid_diagram": "flowchart TB\\n  A[Client] --> B[Load Balancer]\\n  B --> C[API Server]\\n  ..."}"""


def _stub_diagram_1(_topic: str) -> DiagramLLM1Result:
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


async def call_llm_diagram_1(topic: str) -> DiagramLLM1Result:
    """Return key diagram elements and a suggested Mermaid diagram (OpenAI). Falls back to stub if no key or error."""
    if not OPENAI_API_KEY:
        return _stub_diagram_1(topic)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DIAGRAM_LLM_SYSTEM_PROMPT},
                {"role": "user", "content": f"System design topic: {topic}"},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_diagram_1(topic)
        data = json.loads(content)
        elements = data.get("elements") or []
        if not isinstance(elements, list):
            elements = []
        elements = [str(x).strip() for x in elements][:7]
        mermaid = (data.get("mermaid_diagram") or data.get("suggested_diagram") or "").strip()
        if not mermaid:
            mermaid = _stub_diagram_1(topic)["suggested_diagram"]
        print("Diagram elements:", elements)
        return {"elements": elements, "suggested_diagram": mermaid}
    except Exception:
        return _stub_diagram_1(topic)


async def call_llm_diagram_2(topic: str) -> list[str]:
    """Return key diagram elements (stub; replace with second LLM)."""
    return _stub_diagram_2(topic)


class CoverageResult(TypedDict):
    matched: list[str]  # from reference list that user semantically covered
    missed: list[str]   # from reference list that user did not cover


COVERAGE_SYSTEM_PROMPT = """You are comparing a user's answers to a reference list. Your job is to decide, for each reference item, whether the user's answers semantically cover it (same meaning, even if different words). Match by meaning, not exact words. Return valid JSON only, in this exact shape:
{"matched": ["exact reference item 1", "exact reference item 2"], "missed": ["exact reference item 3", ...]}
- "matched": list of items from the reference list that the user's answers cover (use the EXACT reference text).
- "missed": list of items from the reference list that the user did NOT cover (use the EXACT reference text).
Every reference item must appear in either "matched" or "missed", and only those exact strings. No other text."""

COVERAGE_DIAGRAM_PROMPT = """You are comparing diagram labels to a reference list of expected components. The reference list is the expected diagram components. The user's list is the text labels from the user's diagram. For each item in the REFERENCE list, decide if any of the user's labels semantically cover it (same meaning: e.g. "L4 LB" or "Load Balancer" covers "Load Balancer", "Database (Dynamo DB)" covers "Database"). Your response must contain ONLY exact strings from the Reference list—copy them character-for-character. Do NOT put the user's labels in your response. Return valid JSON only:
{"matched": ["Reference item 1", "Reference item 2"], "missed": ["Reference item 3", ...]}
- "matched": reference items that the user's diagram labels cover (by meaning). Use EXACT reference strings only.
- "missed": reference items that the user did NOT cover. Use EXACT reference strings only.
Every reference item must appear in either "matched" or "missed". No other text."""


async def classify_requirements_coverage(
    reference: list[str], user_answers: list[str], *, for_diagram: bool = False
) -> CoverageResult:
    """
    Uses the LLM to decide which reference requirements are semantically covered
    by the user's answers. Returns matched (covered) and missed (not covered),
    each as subsets of the reference list (exact strings).
    """
    if not reference:
        return {"matched": [], "missed": []}
    if not OPENAI_API_KEY:
        return {"matched": [], "missed": list(reference)}

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    ref_str = "\n".join(f"- {r}" for r in reference)
    user_str = "\n".join(f"- {a}" for a in user_answers) if user_answers else "(none)"
    system_prompt = COVERAGE_DIAGRAM_PROMPT if for_diagram else COVERAGE_SYSTEM_PROMPT
    user_content = (
        f"Reference list (copy these exact strings into your matched/missed lists):\n{ref_str}\n\nUser's list:\n{user_str}"
        if for_diagram
        else f"Reference requirements (use these exact strings in your answer):\n{ref_str}\n\nUser's answers:\n{user_str}"
    )
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
        matched = data.get("matched") or []
        missed = data.get("missed") or []
        if not isinstance(matched, list):
            matched = []
        if not isinstance(missed, list):
            missed = []
        if for_diagram:
            print("[diagram] LLM raw matched:", matched, "| LLM raw missed:", missed)
        matched = [str(x).strip() for x in matched if str(x).strip() in reference]
        missed = [str(x).strip() for x in missed if str(x).strip() in reference]
        matched_set = set(matched)
        missed = [m for m in missed if m not in matched_set]
        for r in reference:
            if r not in matched_set and r not in missed:
                missed.append(r)
        return {"matched": matched, "missed": missed}
    except Exception:
        return {"matched": [], "missed": list(reference)}
