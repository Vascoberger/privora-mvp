"""
Privora MVP — FastAPI backend
Simulates the Privora B2B API infrastructure layer that wealth platforms integrate
to offer their clients access to ELTIF 2.0 private market funds.
"""

import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    """Health check — confirms the API is running."""
    return {"status": "ok", "service": "Privora API", "version": "1.0.0"}


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
