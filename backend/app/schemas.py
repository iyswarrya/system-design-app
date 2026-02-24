"""Pydantic models for API request/response. Field aliases match frontend JSON keys."""

from pydantic import BaseModel, Field


class ValidateRequest(BaseModel):
    """Request body for POST /validate. Frontend sends camelCase."""

    topic: str = Field(..., min_length=1, description="System design topic")
    functionalReqs: list[str] = Field(
        default_factory=list,
        alias="functionalReqs",
        description="User-provided functional requirements",
    )
    nonFunctionalReqs: list[str] = Field(
        default_factory=list,
        alias="nonFunctionalReqs",
        description="User-provided non-functional requirements",
    )

    model_config = {"populate_by_name": True}


class ValidateResponse(BaseModel):
    """Response body for POST /validate. Frontend expects camelCase."""

    functional: list[str] = Field(..., description="Top 5 functional requirements")
    nonFunctional: list[str] = Field(
        ...,
        alias="nonFunctional",
        description="Top 5 non-functional requirements",
    )
    functionalMatched: list[str] = Field(
        default_factory=list,
        alias="functionalMatched",
        description="From top 5 functional that the user's answers covered (by meaning)",
    )
    functionalMissed: list[str] = Field(
        default_factory=list,
        alias="functionalMissed",
        description="From top 5 functional that the user did not cover",
    )
    nonFunctionalMatched: list[str] = Field(
        default_factory=list,
        alias="nonFunctionalMatched",
        description="From top 5 non-functional that the user's answers covered",
    )
    nonFunctionalMissed: list[str] = Field(
        default_factory=list,
        alias="nonFunctionalMissed",
        description="From top 5 non-functional that the user did not cover",
    )

    model_config = {"populate_by_name": True}