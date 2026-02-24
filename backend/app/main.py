"""FastAPI app: single POST /validate endpoint, CORS for Next.js frontend."""

import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.llm import call_llm1, call_llm2, classify_requirements_coverage
from app.schemas import ValidateRequest, ValidateResponse
from app.validation import combine_top_requirements, find_common_requirements

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Load env and other startup; nothing to do on shutdown."""
    yield


app = FastAPI(
    title="System Design Validation API",
    description="Returns top 5 functional and non-functional requirements for a topic (from two LLMs).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.post("/validate", response_model=ValidateResponse)
async def validate(req: ValidateRequest) -> ValidateResponse:
    """
    Call two LLMs for the given topic, then:
    - Use common requirements (≥2 shared words) if any; else combine top 3 from LLM1 + top 2 from LLM2.
    - Return top 5 functional and top 5 non-functional requirements.
    """
    llm1, llm2 = await asyncio.gather(call_llm1(req.topic), call_llm2(req.topic))

    common_func = find_common_requirements(
        llm1["functional_requirements"],
        llm2["functional_requirements"],
    )
    common_non_func = find_common_requirements(
        llm1["non_functional_requirements"],
        llm2["non_functional_requirements"],
    )

    final_func = (
        common_func
        if common_func
        else combine_top_requirements(
            llm1["functional_requirements"],
            llm2["functional_requirements"],
        )
    )
    final_non_func = (
        common_non_func
        if common_non_func
        else combine_top_requirements(
            llm1["non_functional_requirements"],
            llm2["non_functional_requirements"],
        )
    )

    # Semantic comparison: which of the top 5 did the user cover (by meaning)?
    user_func = req.functionalReqs or []
    user_non_func = req.nonFunctionalReqs or []
    coverage_func, coverage_non_func = await asyncio.gather(
        classify_requirements_coverage(final_func, user_func),
        classify_requirements_coverage(final_non_func, user_non_func),
    )

    return ValidateResponse(
        functional=final_func,
        nonFunctional=final_non_func,
        functionalMatched=coverage_func["matched"],
        functionalMissed=coverage_func["missed"],
        nonFunctionalMatched=coverage_non_func["matched"],
        nonFunctionalMissed=coverage_non_func["missed"],
    )


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple health check for deployment."""
    return {"status": "ok"}
