"""
Privora MVP — FastAPI backend
Simulates the Privora B2B API infrastructure layer that wealth platforms integrate
to offer their clients access to ELTIF 2.0 private market funds.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/", tags=["Health"])
def root():
    """Health check — confirms the API is running."""
    return {"status": "ok", "service": "Privora API", "version": "1.0.0"}
