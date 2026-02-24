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
    #TODO: Replace with Anthropic API call
    


class CoverageResult(TypedDict):
    matched: list[str]  # from reference list that user semantically covered
    missed: list[str]   # from reference list that user did not cover


COVERAGE_SYSTEM_PROMPT = """You are comparing a user's answers to a reference list of requirements. Your job is to decide, for each reference requirement, whether the user's answers semantically cover it (same meaning, even if different words). Match by meaning, not exact words. Return valid JSON only, in this exact shape:
{"matched": ["exact reference requirement 1", "exact reference requirement 2"], "missed": ["exact reference requirement 3", ...]}
- "matched": list of items from the reference list that the user's answers cover (use the EXACT reference text).
- "missed": list of items from the reference list that the user did NOT cover (use the EXACT reference text).
Every reference item must appear in either "matched" or "missed", and only those exact strings. No other text."""


async def classify_requirements_coverage(
    reference: list[str], user_answers: list[str]
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
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": COVERAGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Reference requirements (use these exact strings in your answer):\n{ref_str}\n\nUser's answers:\n{user_str}",
                },
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
