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


class ValidateFlowRequest(BaseModel):
    """Request body for POST /validate-flow. End-to-end flow validation based on high-level diagram."""

    topic: str = Field(..., min_length=1, description="System design topic")
    flowSummary: str = Field(
        default="",
        alias="flowSummary",
        description="User's end-to-end flow description (e.g. request path, data flow)",
    )
    diagramXml: str = Field(
        default="",
        alias="diagramXml",
        description="Optional draw.io diagram XML to extract component labels for context",
    )

    model_config = {"populate_by_name": True}


class ValidateFlowResponse(BaseModel):
    """Response body for POST /validate-flow. LLM feedback on the flow summary."""

    correct: bool = Field(
        ...,
        description="True if the flow is largely correct and aligns with the expected system design",
    )
    feedback: str = Field(
        default="",
        description="Overall feedback on whether the flow is correct and what was done well",
    )
    improvements: str = Field(
        default="",
        description="Suggested improvements, missing steps, or corrections",
    )

    model_config = {"populate_by_name": True}


class DeepDiveItemInput(BaseModel):
    """One deep dive topic with optional user elaboration."""

    topic: str = Field(..., description="Deep dive topic name (e.g. Caching strategy, Sharding)")
    userSummary: str = Field(
        default="",
        alias="userSummary",
        description="User's elaboration/summary for this deep dive",
    )

    model_config = {"populate_by_name": True}


class ValidateDeepDivesRequest(BaseModel):
    """Request body for POST /validate-deep-dives."""

    topic: str = Field(..., min_length=1, description="System design topic (e.g. URL Shortener)")
    deepDives: list[DeepDiveItemInput] = Field(
        default_factory=list,
        alias="deepDives",
        description="List of deep dive topics with optional user summaries",
    )

    model_config = {"populate_by_name": True}


class DeepDiveItemResponse(BaseModel):
    """One deep dive with suggested summary and optional feedback."""

    topic: str = Field(..., description="Deep dive topic (echoed from request)")
    suggestedSummary: str = Field(
        default="",
        alias="suggestedSummary",
        description="LLM-generated suggested summary for this deep dive",
    )
    feedback: str = Field(
        default="",
        description="Optional feedback on the user's summary if they provided one",
    )

    model_config = {"populate_by_name": True}


class ValidateDeepDivesResponse(BaseModel):
    """Response body for POST /validate-deep-dives."""

    items: list[DeepDiveItemResponse] = Field(
        default_factory=list,
        description="Suggested summary and feedback per deep dive topic",
    )
    suggestedMissingTopics: list[str] = Field(
        default_factory=list,
        alias="suggestedMissingTopics",
        description="Up to 3 important deep dive topics the user missed (LLM-suggested)",
    )

    model_config = {"populate_by_name": True}


class DetailedDiagramDeepDiveInput(BaseModel):
    """One deep dive for detailed diagram validation context."""

    topic: str = Field(default="", description="Deep dive topic name")
    userSummary: str = Field(
        default="",
        alias="userSummary",
        description="User's elaboration for this deep dive",
    )
    suggestedSummary: str = Field(
        default="",
        alias="suggestedSummary",
        description="LLM-suggested summary (from earlier step) for context",
    )

    model_config = {"populate_by_name": True}


class RequirementsInput(BaseModel):
    """Requirements summary for detailed diagram validation."""

    functional: list[str] = Field(default_factory=list, description="Functional requirements")
    nonFunctional: list[str] = Field(
        default_factory=list,
        alias="nonFunctional",
        description="Non-functional requirements",
    )

    model_config = {"populate_by_name": True}


class ApiDesignRowInput(BaseModel):
    """One API row for detailed diagram validation."""

    api: str = Field(default="", description="API description")
    request: str = Field(default="", description="Request")
    response: str = Field(default="", description="Response")

    model_config = {"populate_by_name": True}


class ValidateDetailedDiagramRequest(BaseModel):
    """Request body for POST /validate-detailed-diagram. Validates diagram against all discussed points."""

    topic: str = Field(..., min_length=1, description="System design topic")
    diagramXml: str = Field(
        default="",
        alias="diagramXml",
        description="Draw.io detailed diagram XML (labels extracted for comparison)",
    )
    requirements: RequirementsInput | None = Field(
        default=None,
        description="User's requirements (functional + non-functional) for context",
    )
    apiDesign: list[ApiDesignRowInput] = Field(
        default_factory=list,
        alias="apiDesign",
        description="User's API design for context",
    )
    dataModel: list[str] = Field(
        default_factory=list,
        alias="dataModel",
        description="User's database schema / data model for context",
    )
    highLevelDiagramXml: str = Field(
        default="",
        alias="highLevelDiagramXml",
        description="High-level diagram XML (labels extracted for context)",
    )
    endToEndFlow: str = Field(
        default="",
        alias="endToEndFlow",
        description="User's saved end-to-end flow summary (for validation context)",
    )
    deepDives: list[DetailedDiagramDeepDiveInput] = Field(
        default_factory=list,
        alias="deepDives",
        description="User's deep dives (topic + user/suggested summary) for context",
    )

    model_config = {"populate_by_name": True}


class ValidateDetailedDiagramResponse(BaseModel):
    """Response body for POST /validate-detailed-diagram. Feedback + suggested diagram (PNG and optional Mermaid)."""

    feedback: str = Field(
        default="",
        description="Overall feedback on how the detailed diagram aligns with flow and deep dives",
    )
    improvements: str = Field(
        default="",
        description="Specific suggestions: missing components, alignment with flow, deep dive coverage",
    )
    suggestedDiagram: str = Field(
        default="",
        alias="suggestedDiagram",
        description="LLM-generated detailed diagram (Mermaid) as fallback/reference",
    )
    suggestedDiagramPng: str = Field(
        default="",
        alias="suggestedDiagramPng",
        description="LLM-generated diagram rendered as PNG (data URL) for feedback",
    )

    model_config = {"populate_by_name": True}


class ValidateEstimationRequest(BaseModel):
    """Request body for POST /validate-estimation."""

    topic: str = Field(..., min_length=1, description="System design topic")
    estimations: list[str] = Field(
        default_factory=list,
        description="User-provided back-of-the-envelope estimation items (e.g. one per line)",
    )

    model_config = {"populate_by_name": True}


class CalculationFeedbackItem(BaseModel):
    """Per-line feedback on whether the user's numbers/derivations are reasonable."""

    userLine: str = Field(..., alias="userLine", description="Exact user estimation line")
    reasonable: bool = Field(..., description="True if numbers and derivation are sensible")
    comment: str = Field(default="", description="Brief explanation from LLM")

    model_config = {"populate_by_name": True}


class ValidateEstimationResponse(BaseModel):
    """Response body for POST /validate-estimation. Expected items + matched / missed + calculation feedback."""

    elements: list[str] = Field(
        ...,
        description="Key estimation items that should be considered for this system",
    )
    matched: list[str] = Field(
        default_factory=list,
        description="Expected items that the user's estimations covered (by meaning)",
    )
    missed: list[str] = Field(
        default_factory=list,
        description="Expected items that the user did not include",
    )
    calculationFeedback: list[CalculationFeedbackItem] = Field(
        default_factory=list,
        alias="calculationFeedback",
        description="Per-line feedback on reasonableness of numbers and calculations",
    )

    model_config = {"populate_by_name": True}


class ValidateDataModelRequest(BaseModel):
    """Request body for POST /validate-data-model."""

    topic: str = Field(..., min_length=1, description="System design topic")
    dataModel: list[str] = Field(
        default_factory=list,
        alias="dataModel",
        description="User-provided data model lines (e.g. tables, entities, attributes, one per line)",
    )
    apiDesign: list[str] = Field(
        default_factory=list,
        alias="apiDesign",
        description="API design from interview summary — validate schema against these APIs",
    )

    model_config = {"populate_by_name": True}


class DataModelFeedbackItem(BaseModel):
    """Per-line feedback on the user's data model."""

    userLine: str = Field(..., alias="userLine", description="Exact user data model line")
    reasonable: bool = Field(..., description="True if the element is correct and fits the system")
    comment: str = Field(default="", description="Brief explanation from LLM")

    model_config = {"populate_by_name": True}


class ValidateDataModelResponse(BaseModel):
    """Response body for POST /validate-data-model. Expected elements + matched / missed + feedback."""

    elements: list[str] = Field(
        ...,
        description="Key data model elements that should be considered for this system",
    )
    matched: list[str] = Field(
        default_factory=list,
        description="Expected elements that the user's data model covered (by meaning)",
    )
    missed: list[str] = Field(
        default_factory=list,
        description="Expected elements that the user did not include",
    )
    feedback: list[DataModelFeedbackItem] = Field(
        default_factory=list,
        description="Per-line feedback on the user's data model",
    )
    suggestedMissingTables: list[str] = Field(
        default_factory=list,
        alias="suggestedMissingTables",
        description="Tables suggested by feedback LLM based on API design (missing from user's schema)",
    )

    model_config = {"populate_by_name": True}