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


# --- Back-of-the-envelope: validate calculations (second step) ---

class CalculationFeedbackItem(TypedDict):
    userLine: str
    reasonable: bool
    comment: str


ESTIMATION_CALCULATIONS_PROMPT = """You are a system design expert. Given a system design topic and the user's back-of-the-envelope estimation lines (each line may contain a label and numbers or a short derivation), assess each line:
1) Are the numbers and order of magnitude reasonable for this system?
2) If the user showed derivation (e.g. "QPS = DAU * 5 / 86400"), is the math and logic correct?
Return valid JSON only, in this exact shape. Include one object per user line, in the same order. Use the EXACT user line text in "userLine":
{"feedback": [{"userLine": "<exact line from user>", "reasonable": true or false, "comment": "Brief explanation: why the numbers are reasonable or what is off (e.g. wrong order of magnitude, missing unit, inconsistent assumption)."}]}
- "reasonable": true if the estimate and any derivation are sensible; false if numbers are way off, math is wrong, or assumptions are inconsistent.
- "comment": one short sentence. Be constructive."""


def _stub_calculation_feedback(user_estimations: list[str]) -> list[CalculationFeedbackItem]:
    return [
        {
            "userLine": line,
            "reasonable": True,
            "comment": "Stub: enable OpenAI API key for calculation review.",
        }
        for line in user_estimations
    ]


async def call_llm_estimation_calculations(
    topic: str, user_estimations: list[str]
) -> list[CalculationFeedbackItem]:
    """Review each user estimation line for reasonableness of numbers and derivations. Returns one feedback item per user line."""
    if not user_estimations:
        return []
    if not OPENAI_API_KEY:
        return _stub_calculation_feedback(user_estimations)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    user_str = "\n".join(user_estimations)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ESTIMATION_CALCULATIONS_PROMPT},
                {"role": "user", "content": f"System design topic: {topic}\n\nUser's estimation lines (one per line):\n{user_str}"},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            return _stub_calculation_feedback(user_estimations)
        data = json.loads(content)
        raw = data.get("feedback") or []
        if not isinstance(raw, list):
            return _stub_calculation_feedback(user_estimations)
        # Preserve order: match by userLine to user_estimations, fill missing with stub
        seen = {line.strip() for line in user_estimations}
        result: list[CalculationFeedbackItem] = []
        for line in user_estimations:
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
        return result
    except Exception:
        return _stub_calculation_feedback(user_estimations)


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
    api_design: list[str] | None = None,
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
        matched = data.get("matched") or []
        missed = data.get("missed") or []
        if not isinstance(matched, list):
            matched = []
        if not isinstance(missed, list):
            missed = []
        if for_diagram:
            print("[diagram] LLM raw matched:", matched, "| LLM raw missed:", missed)
        if for_schema:
            print("[schema] LLM raw matched:", matched, "| LLM raw missed:", missed)
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
