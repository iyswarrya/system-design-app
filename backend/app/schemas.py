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


class ValidateApisRequest(BaseModel):
    """Request body for POST /validate-apis."""

    topic: str = Field(..., min_length=1, description="System design topic")
    apis: list[str] = Field(
        default_factory=list,
        description="User-provided API descriptions (e.g. POST /shorten – create short URL)",
    )

    model_config = {"populate_by_name": True}


class ValidateApisResponse(BaseModel):
    """Response body for POST /validate-apis. Top APIs + what user got right / missed."""

    apis: list[str] = Field(..., description="Top 5 important APIs for the system")
    matched: list[str] = Field(
        default_factory=list,
        description="From top 5 that the user's answers covered (by meaning)",
    )
    missed: list[str] = Field(
        default_factory=list,
        description="From top 5 that the user did not cover",
    )

    model_config = {"populate_by_name": True}


class ValidateDiagramRequest(BaseModel):
    """Request body for POST /validate-diagram."""

    topic: str = Field(..., min_length=1, description="System design topic")
    diagramXml: str = Field(
        default="",
        alias="diagramXml",
        description="Draw.io diagram XML (to extract text labels for comparison)",
    )

    model_config = {"populate_by_name": True}


class ValidateDiagramResponse(BaseModel):
    """Response body for POST /validate-diagram. Expected elements + matched / missed + suggested diagram."""

    elements: list[str] = Field(
        ...,
        description="Key components/elements that should appear in the high-level diagram",
    )
    matched: list[str] = Field(
        default_factory=list,
        description="Expected elements that the user's diagram covered (by meaning)",
    )
    missed: list[str] = Field(
        default_factory=list,
        description="Expected elements that the user did not include",
    )
    suggestedDiagram: str = Field(
        default="",
        alias="suggestedDiagram",
        description="High-level diagram from LLM (Mermaid flowchart) for the user to add to summary",
    )

    model_config = {"populate_by_name": True}