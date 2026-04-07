"""Tests for semantic API matching: normalization layer and prompt.

- Regression: URL shortener and chat examples must be matched (deterministic normalizer).
- COVERAGE_APIS_PROMPT encodes /shorten vs /urls and chat equivalences.
- classify_requirements_coverage(for_apis=True) uses normalizer first, then LLM for borderline.
"""

import json
from typing import Any, Dict

import pytest

from app.api_normalize import compute_api_auto_matches
from app.llm import (
    COVERAGE_APIS_PROMPT,
    classify_requirements_coverage,
)


def test_apis_prompt_contains_shorten_and_chat_examples() -> None:
    """Prompt should encode /urls vs /shorten and chat equivalences."""
    assert "shorten" in COVERAGE_APIS_PROMPT.lower() and "urls" in COVERAGE_APIS_PROMPT.lower()
    assert "POST /v1/conversations" in COVERAGE_APIS_PROMPT or "conversations" in COVERAGE_APIS_PROMPT
    assert "POST /messages" in COVERAGE_APIS_PROMPT


@pytest.mark.asyncio
async def test_classify_apis_parses_object_based_json(monkeypatch: pytest.MonkeyPatch) -> None:
    """classify_requirements_coverage(for_apis=True) accepts object-based matched/missed JSON."""

    reference = [
        "POST /messages – send a new message to a specific chat room or user",
    ]
    user_apis = [
        "POST /v1/conversations/{conversation_id}/messages",
    ]

    # Fake LLM JSON response using the object-based schema the prompt specifies.
    fake_llm_result: Dict[str, Any] = {
        "matched": [
            {
                "user": user_apis[0],
                "expected": reference[0],
                "why": "Both send a new message scoped to a conversation/chat.",
            }
        ],
        "missed": [],
    }

    class _FakeChoices:
        def __init__(self, content: str) -> None:
            self.message = type("Msg", (), {"content": content})()

    class _FakeResponse:
        def __init__(self, content: str) -> None:
            self.choices = [_FakeChoices(content)]

    class _FakeCompletions:
        async def create(self, *args: Any, **kwargs: Any) -> _FakeResponse:
            return _FakeResponse(json.dumps(fake_llm_result))

    class _FakeChat:
        def __init__(self) -> None:
            self.completions = _FakeCompletions()

    class _FakeClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.chat = _FakeChat()

    # Patch AsyncOpenAI used inside classify_requirements_coverage
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr("app.llm.AsyncOpenAI", _FakeClient)

    result = await classify_requirements_coverage(
        reference,
        user_apis,
        for_apis=True,
    )

    # It should treat the reference endpoint as matched, not missed.
    assert reference[0] in result["matched"]
    assert reference[0] not in result["missed"]


# ---- Regression: deterministic normalizer must match these pairs ----


def test_url_shortener_normalizer_matches_post_shorten_and_post_v1_urls() -> None:
    """POST /shorten (create short URL) must match 'Create short link POST /v1/urls'."""
    expected = ["POST /shorten – create short URL from long URL"]
    user = ["Create short link POST /v1/urls"]
    auto_pairs, unmatched_ref, _ = compute_api_auto_matches(expected, user)
    assert len(auto_pairs) == 1, f"Expected one auto-matched pair, got {auto_pairs}"
    assert auto_pairs[0][0] == expected[0] and auto_pairs[0][1] == user[0]
    assert unmatched_ref == [], f"Expected no unmatched reference, got {unmatched_ref}"


def test_chat_normalizer_matches_post_messages_and_post_conversations_id_messages() -> None:
    """POST /messages (send new message) must match POST /v1/conversations/{conversation_id}/messages."""
    expected = ["POST /messages – send a new message to a specific chat room or user"]
    user = ["POST /v1/conversations/{conversation_id}/messages"]
    auto_pairs, unmatched_ref, _ = compute_api_auto_matches(expected, user)
    assert len(auto_pairs) == 1, f"Expected one auto-matched pair, got {auto_pairs}"
    assert auto_pairs[0][0] == expected[0] and auto_pairs[0][1] == user[0]
    assert unmatched_ref == [], f"Expected no unmatched reference, got {unmatched_ref}"


@pytest.mark.asyncio
async def test_classify_apis_url_shortener_matched_missed_empty() -> None:
    """Full pipeline: expected POST /shorten, user POST /v1/urls -> matched contains expected, missed empty."""
    reference = ["POST /shorten – create short URL from long URL"]
    user_answers = ["Create short link POST /v1/urls"]
    result = await classify_requirements_coverage(
        reference,
        user_answers,
        for_apis=True,
    )
    assert reference[0] in result["matched"], f"Expected reference in matched, got {result}"
    assert result["missed"] == [], f"Expected missed empty, got {result['missed']}"


@pytest.mark.asyncio
async def test_classify_apis_chat_send_message_matched_missed_empty() -> None:
    """Full pipeline: POST /messages (send message) vs POST /v1/conversations/{id}/messages -> matched."""
    reference = ["POST /messages – send a new message to a specific chat room or user"]
    user_answers = ["POST /v1/conversations/{conversation_id}/messages"]
    result = await classify_requirements_coverage(
        reference,
        user_answers,
        for_apis=True,
    )
    assert reference[0] in result["matched"], f"Expected reference in matched, got {result}"
    assert result["missed"] == [], f"Expected missed empty, got {result['missed']}"

