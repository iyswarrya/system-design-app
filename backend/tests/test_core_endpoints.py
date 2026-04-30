from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_validate_returns_merged_and_coverage_fields() -> None:
    client = TestClient(app)

    llm1_payload = {
        "functional_requirements": [
            "Users can sign up",
            "Users can log in",
            "Users can post content",
        ],
        "non_functional_requirements": [
            "Low latency",
            "High availability",
            "Scalable reads",
        ],
    }
    llm2_payload = {
        "functional_requirements": [
            "Users can sign up",
            "Users can comment",
            "Users can like content",
        ],
        "non_functional_requirements": [
            "Low latency",
            "Durability",
            "Fault tolerance",
        ],
    }
    coverage_payload = {
        "matched": ["Users can sign up"],
        "missed": ["Users can comment"],
    }

    with patch("app.main.call_llm1", new_callable=AsyncMock) as mock_llm1, patch(
        "app.main.call_llm2", new_callable=AsyncMock
    ) as mock_llm2, patch(
        "app.main.classify_requirements_coverage", new_callable=AsyncMock
    ) as mock_coverage:
        mock_llm1.return_value = llm1_payload
        mock_llm2.return_value = llm2_payload
        # validate() calls coverage twice: functional + non-functional
        mock_coverage.side_effect = [coverage_payload, coverage_payload]

        response = client.post(
            "/validate",
            json={
                "topic": "Design Twitter",
                "functionalReqs": ["Users can sign up"],
                "nonFunctionalReqs": ["Low latency"],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert "functional" in body
    assert "nonFunctional" in body
    assert "functionalMatched" in body
    assert "functionalMissed" in body
    assert "nonFunctionalMatched" in body
    assert "nonFunctionalMissed" in body
    assert body["functionalMatched"] == ["Users can sign up"]
