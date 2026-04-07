"""Unit tests for API-driven high-level diagram generation.

Asserts that when a sample social feed API spec is passed:
- The prompt includes hard constraints for Post Service and Feed Service.
- The validate-diagram endpoint returns a suggestedDiagram containing those services
  (with call_llm_diagram_1 mocked to return a fixed diagram).
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.llm import build_api_to_diagram_prompt
from app.main import app

# Sample social feed API spec (list of endpoints + brief description)
SAMPLE_SOCIAL_FEED_API_SPEC = """POST /posts — request: CreatePostRequest (title, body, userId) — response: Post
GET /posts/:id — response: Post
GET /feed — request: FeedQuery (userId, limit, offset) — response: FeedResponse
POST /comments — request: CreateCommentRequest — response: Comment
GET /posts/:id/comments — response: Comment[]
POST /likes — request: LikeRequest (postId, userId) — response: Like
GET /users/:id — response: User
POST /follow — request: FollowRequest (followerId, followeeId) — response: Ok
GET /notifications — request: NotificationsQuery (userId) — response: Notification[]"""


class TestBuildApiToDiagramPrompt:
    """Test that the API-to-diagram prompt includes required rules and the API spec."""

    def test_prompt_contains_post_service_constraint(self) -> None:
        prompt = build_api_to_diagram_prompt(SAMPLE_SOCIAL_FEED_API_SPEC)
        assert "Post Service" in prompt
        assert "/posts" in prompt or "posts" in prompt.lower()

    def test_prompt_contains_feed_service_constraint(self) -> None:
        prompt = build_api_to_diagram_prompt(SAMPLE_SOCIAL_FEED_API_SPEC)
        assert "Feed Service" in prompt
        assert "/feed" in prompt or "feed" in prompt.lower()

    def test_prompt_includes_api_spec(self) -> None:
        prompt = build_api_to_diagram_prompt(SAMPLE_SOCIAL_FEED_API_SPEC)
        assert "POST /posts" in prompt or "/posts" in prompt
        assert "GET /feed" in prompt or "/feed" in prompt

    def test_prompt_requires_mermaid_flowchart_tb(self) -> None:
        prompt = build_api_to_diagram_prompt(SAMPLE_SOCIAL_FEED_API_SPEC)
        assert "flowchart TB" in prompt or "flowchart" in prompt


class TestValidateDiagramEndpoint:
    """Test POST /validate-diagram with apiDesign returns diagram containing Post/Feed Service."""

    @pytest.fixture
    def client(self) -> TestClient:
        return TestClient(app)

    @pytest.fixture
    def sample_api_design(self) -> list[dict]:
        return [
            {"api": "POST /posts", "request": "CreatePostRequest", "response": "Post"},
            {"api": "GET /posts/:id", "request": "", "response": "Post"},
            {"api": "GET /feed", "request": "FeedQuery", "response": "FeedResponse"},
            {"api": "POST /comments", "request": "CreateCommentRequest", "response": "Comment"},
        ]

    @pytest.fixture
    def mock_diagram_result(self) -> dict:
        return {
            "elements": [
                "API Server",
                "Post Service",
                "Feed Service",
                "Cache",
                "Database",
            ],
            "suggested_diagram": "flowchart TB\n  Client[Client] --> LB[Load Balancer]\n  LB --> API[API Server]\n  API --> PostSvc[Post Service]\n  API --> FeedSvc[Feed Service]\n  PostSvc --> DB[(Database)]\n  FeedSvc --> Cache[Cache]\n  FeedSvc --> DB",
        }

    def test_validate_diagram_with_api_design_returns_diagram_with_post_and_feed_service(
        self,
        client: TestClient,
        sample_api_design: list[dict],
        mock_diagram_result: dict,
    ) -> None:
        with patch("app.main.call_llm_diagram_1", new_callable=AsyncMock) as mock_llm1:
            with patch("app.main.call_llm_diagram_2", new_callable=AsyncMock) as mock_llm2:
                mock_llm1.return_value = mock_diagram_result
                mock_llm2.return_value = ["API Server", "Post Service", "Feed Service", "Database", "Cache"]

                response = client.post(
                    "/validate-diagram",
                    json={
                        "topic": "Design a Social Media Feed",
                        "diagramXml": "",
                        "apiDesign": sample_api_design,
                    },
                )

                assert response.status_code == 200
                data = response.json()
                suggested = data.get("suggestedDiagram") or ""
                assert "Post Service" in suggested, f"expected 'Post Service' in suggestedDiagram, got: {suggested!r}"
                assert "Feed Service" in suggested, f"expected 'Feed Service' in suggestedDiagram, got: {suggested!r}"

                # Verify call_llm_diagram_1 was called with api_spec (non-empty)
                mock_llm1.assert_called_once()
                args, kwargs = mock_llm1.call_args
                assert args[0] == "Design a Social Media Feed"
                api_spec = kwargs.get("api_spec")
                assert api_spec, "call_llm_diagram_1 should be called with non-empty api_spec when apiDesign is provided"
                assert "/posts" in api_spec or "posts" in api_spec.lower()
                assert "/feed" in api_spec or "feed" in api_spec.lower()
