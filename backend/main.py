"""
Privora MVP — FastAPI backend
Simulates the Privora B2B API infrastructure layer that wealth platforms integrate
to offer their clients access to ELTIF 2.0 private market funds.
"""

import json
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional

# Absolute path to the mock data directory so imports work regardless of cwd
MOCK_DATA_DIR = Path(__file__).parent / "mock_data"


def load_json(filename: str):
    """Load a JSON file from the mock_data directory."""
    path = MOCK_DATA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"Mock data file '{filename}' not found.")
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# App + middleware
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Privora API",
    description=(
        "Privora is a B2B API infrastructure platform enabling retail wealth platforms "
        "to offer clients access to private market funds via ELTIF 2.0 regulatory wrappers."
    ),
    version="1.0.0",
)

# Allow the React dev server to call the API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Fund(BaseModel):
    """Represents a single ELTIF 2.0 private market fund."""
    id: str
    name: str
    asset_class: str
    minimum_investment: float
    expected_return: float       # percentage, e.g. 8.5 means 8.5%
    annual_fee: float            # management fee percentage
    placement_fee: float         # one-time placement fee percentage
    eltif_eligible: bool
    description: str


class OnboardRequest(BaseModel):
    """Investor details submitted for KYC and ELTIF 2.0 suitability assessment."""
    name: str = Field(..., description="Full legal name of the investor")
    investor_type: Literal["retail", "professional"] = Field(
        ..., description="Investor classification under MiFID II"
    )
    annual_income: float = Field(..., gt=0, description="Gross annual income in EUR")
    net_worth: float = Field(..., gt=0, description="Total net worth in EUR excluding primary residence")
    risk_profile: Literal["conservative", "moderate", "aggressive"] = Field(
        ..., description="Self-declared risk tolerance"
    )


class OnboardResponse(BaseModel):
    """Result of the KYC and ELTIF 2.0 eligibility check."""
    status: Literal["pass", "fail"]
    eligibility: bool
    reason: str
    cap_applies: bool = Field(
        False,
        description="True when the ELTIF 2.0 10% portfolio cap applies (net_worth < €500,000)"
    )
    investor_id: Optional[str] = Field(
        None, description="Unique investor ID assigned on successful onboarding"
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    """Health check — confirms the API is running."""
    return {"status": "ok", "service": "Privora API", "version": "1.0.0"}


@app.post("/onboard", response_model=OnboardResponse, tags=["Onboarding"])
def onboard_investor(request: OnboardRequest):
    """
    Runs a mock KYC check and ELTIF 2.0 retail suitability assessment for a new investor.

    ELTIF 2.0 (EU 2023/606) allows retail investors to access private market funds provided
    they meet at least one of the following thresholds:
      - Net worth ≥ €100,000 (excluding primary residence), OR
      - Annual gross income ≥ €100,000

    Additional cap rule: if the investor qualifies but their net worth is below €500,000,
    the regulation caps their ELTIF exposure at 10% of their financial portfolio. This is
    flagged in the response so the wealth platform can enforce it in their UI.

    Args:
        request: Investor profile including income, net worth, and risk tolerance.

    Returns:
        OnboardResponse with pass/fail status, eligibility boolean, plain-English reason,
        cap flag, and — on success — a newly issued investor_id for subsequent API calls.
    """
    income_qualifies = request.annual_income >= 100_000
    wealth_qualifies = request.net_worth >= 100_000

    if not income_qualifies and not wealth_qualifies:
        return OnboardResponse(
            status="fail",
            eligibility=False,
            reason=(
                f"Does not meet ELTIF 2.0 retail eligibility thresholds. "
                f"Annual income €{request.annual_income:,.0f} is below €100,000 "
                f"and net worth €{request.net_worth:,.0f} is below €100,000. "
                f"At least one threshold must be met."
            ),
        )

    # Investor qualifies — check whether the 10% portfolio cap applies
    cap_applies = request.net_worth < 500_000

    if cap_applies:
        reason = (
            f"Eligible for ELTIF 2.0 access. "
            f"Note: net worth €{request.net_worth:,.0f} is below €500,000, so the ELTIF 2.0 "
            f"10% portfolio cap applies — maximum ELTIF exposure is "
            f"€{request.net_worth * 0.10:,.0f}."
        )
    else:
        reason = (
            f"Fully eligible for ELTIF 2.0 access with no investment cap. "
            f"Qualified via: "
            + (f"annual income €{request.annual_income:,.0f}" if income_qualifies else "")
            + (" and " if income_qualifies and wealth_qualifies else "")
            + (f"net worth €{request.net_worth:,.0f}" if wealth_qualifies else "")
            + "."
        )

    return OnboardResponse(
        status="pass",
        eligibility=True,
        reason=reason,
        cap_applies=cap_applies,
        investor_id=f"inv_{uuid.uuid4().hex[:10]}",
    )


@app.get("/funds", response_model=list[Fund], tags=["Funds"])
def get_funds():
    """
    Returns the full catalogue of ELTIF 2.0-eligible private market funds available
    on the Privora platform.

    Wealth platforms call this endpoint to populate their fund discovery UIs. Each
    fund includes fee details (management fee + placement fee) and the expected return
    so the client-facing fee calculator can be driven entirely from this response.

    Returns:
        A list of Fund objects. All funds in the current catalogue are ELTIF 2.0
        eligible and available for retail distribution under the updated regulation.
    """
    return load_json("funds.json")
