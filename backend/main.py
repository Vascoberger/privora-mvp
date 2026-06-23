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


class InvestRequest(BaseModel):
    """Subscription order submitted by an onboarded investor."""
    investor_id: str = Field(..., description="Investor ID returned by POST /onboard")
    fund_id: str = Field(..., description="Fund ID from GET /funds")
    amount: float = Field(..., gt=0, description="Gross subscription amount in EUR")


class InvestResponse(BaseModel):
    """Full fee breakdown and confirmation for a subscription order."""
    order_id: str
    investor_id: str
    fund_id: str
    amount_invested: float          # gross subscription amount
    management_fee_pct: float       # annual management fee %
    management_fee_amount: float    # annual management fee in EUR
    placement_fee_pct: float        # one-time placement fee %
    placement_fee_amount: float     # one-time placement fee in EUR
    estimated_annual_yield_pct: float   # fund's expected return %
    estimated_annual_yield_amount: float  # expected return in EUR per year
    net_estimated_return: float     # yield minus annual management fee, first year
    status: Literal["confirmed", "rejected"]


class Position(BaseModel):
    """A single fund holding within an investor's portfolio."""
    fund_id: str
    fund_name: str
    amount_invested: float
    current_value: float
    status: Literal["active", "pending", "exited"]


class Portfolio(BaseModel):
    """Full portfolio view for an investor, including positions and cash."""
    investor_id: str
    name: str
    total_invested: float
    positions: list[Position]
    cash_pending_deployment: float      # cash not yet deployed into a fund
    estimated_interest_yield_pct: float  # annualised yield earned on idle cash
    estimated_interest_yield_amount: float  # EUR amount earned on cash per year


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


@app.post("/invest", response_model=InvestResponse, tags=["Investment"])
def invest(request: InvestRequest):
    """
    Places a mock subscription order for an investor into an ELTIF 2.0 fund and
    returns a full fee breakdown before committing the position.

    The response surfaces all four Privora revenue levers so the wealth platform
    can render a transparent fee calculator in their UI prior to final confirmation:

      - Management fee  : recurring annual cost, deducted from fund NAV
      - Placement fee   : one-time upfront cost charged at subscription
      - Estimated yield : gross annual return based on the fund's expected return %
      - Net return      : estimated yield minus the first-year management fee

    The fund is looked up from mock data by fund_id; if the fund_id is not
    recognised a 404 is returned so the frontend can surface a clear error.

    Args:
        request: investor_id, fund_id, and gross subscription amount in EUR.

    Returns:
        InvestResponse with order confirmation and complete fee breakdown.
    """
    funds = load_json("funds.json")
    fund = next((f for f in funds if f["id"] == request.fund_id), None)

    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund '{request.fund_id}' not found.")

    if request.amount < fund["minimum_investment"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Amount €{request.amount:,.0f} is below the minimum investment "
                f"of €{fund['minimum_investment']:,.0f} for this fund."
            ),
        )

    mgmt_fee_pct = fund["annual_fee"]
    placement_fee_pct = fund["placement_fee"]
    yield_pct = fund["expected_return"]

    mgmt_fee_amount = round(request.amount * mgmt_fee_pct / 100, 2)
    placement_fee_amount = round(request.amount * placement_fee_pct / 100, 2)
    yield_amount = round(request.amount * yield_pct / 100, 2)
    # Net return: gross yield less the annual management fee (first-year view)
    net_return = round(yield_amount - mgmt_fee_amount, 2)

    return InvestResponse(
        order_id=f"ord_{uuid.uuid4().hex[:10]}",
        investor_id=request.investor_id,
        fund_id=request.fund_id,
        amount_invested=request.amount,
        management_fee_pct=mgmt_fee_pct,
        management_fee_amount=mgmt_fee_amount,
        placement_fee_pct=placement_fee_pct,
        placement_fee_amount=placement_fee_amount,
        estimated_annual_yield_pct=yield_pct,
        estimated_annual_yield_amount=yield_amount,
        net_estimated_return=net_return,
        status="confirmed",
    )


@app.get("/portfolio/{investor_id}", response_model=Portfolio, tags=["Portfolio"])
def get_portfolio(investor_id: str):
    """
    Returns the current portfolio for a given investor, including all fund positions
    and cash pending deployment.

    The response is designed to power the Portfolio Dashboard page and surfaces two
    Privora revenue levers that are not visible in the investment flow:

      - Cash pending deployment : idle capital awaiting allocation into a fund.
        Privora earns an interest spread on this float; the estimated yield is
        returned so the wealth platform can show the client what their cash is earning
        in the interim.
      - Position current_value  : mark-to-model NAV, allowing the dashboard to display
        unrealised gains/losses per position.

    The status field on each position distinguishes active holdings from pending
    subscriptions (still in the settlement window) and exited positions.

    Args:
        investor_id: The ID issued by POST /onboard. Use 'inv_demo001', 'inv_demo002',
                     or 'inv_demo003' to explore sample portfolios.

    Returns:
        Portfolio object with positions list and cash yield details.

    Raises:
        404 if the investor_id is not found in the mock registry.
    """
    portfolios = load_json("portfolios.json")
    portfolio = next((p for p in portfolios if p["investor_id"] == investor_id), None)

    if portfolio is None:
        raise HTTPException(
            status_code=404,
            detail=f"Investor '{investor_id}' not found. "
                   f"Demo IDs: inv_demo001, inv_demo002, inv_demo003."
        )

    return portfolio


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
