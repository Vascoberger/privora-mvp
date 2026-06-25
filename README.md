# Privora MVP

Privora is a B2B API infrastructure platform that enables retail wealth platforms to offer their clients access to private market funds via ELTIF 2.0 regulatory wrappers. This MVP demonstrates Privora's core API stack as working software: a FastAPI backend that a wealth platform would integrate on its own infrastructure, and a React frontend simulating what the wealth platform's end client would see in their portal. All data is mocked — there is no real database or live fund connection — but every endpoint, fee calculation, and eligibility check maps directly to how Privora's product works in the actual business model.

---

## What this MVP demonstrates

Each of the five API endpoints represents a distinct layer of Privora's infrastructure offering:

| Method | Endpoint | What it represents |
|--------|----------|--------------------|
| `GET` | `/funds` | The fund catalogue — Privora maintains a curated list of ELTIF 2.0-eligible private market funds (infrastructure, private credit, real estate, private equity, natural capital) that wealth platforms can surface to their clients |
| `POST` | `/onboard` | KYC and suitability gating — before any client can invest, Privora runs a platform suitability check against its own distribution policy criteria (net worth ≥ €100,000 or annual income ≥ €100,000); failed checks return a plain-language explanation |
| `POST` | `/invest` | Subscription order placement — Privora sits between the wealth platform and the fund administrator; this endpoint captures the management fee, placement fee, and expected yield at the moment of subscription |
| `GET` | `/portfolio/{investor_id}` | Investor position tracking — shows current allocations, unrealised gains, and the interest yield earned on cash awaiting deployment, mapping to Privora's cash yield revenue lever |
| `GET` | `/secondary-market` | Liquidity layer — ELTIF 2.0 introduced a mandatory secondary market; Privora charges a 1.5% commission on each secondary transaction, which this endpoint exposes as a live order book |

Every Privora revenue lever from the business plan (management fee, placement fee, secondary market commission, interest yield on cash) is visible somewhere in the running product.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, FastAPI, Pydantic v2, Uvicorn |
| Frontend | React 18, Vite, React Router v6, plain CSS |
| Data | Hardcoded JSON files in `/backend/mock_data/` — no database |
| AI agent | Claude Code (Anthropic) — see [AI agent usage](#ai-agent-usage) |

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone the repository

```bash
git clone <repo-url>
cd privora-mvp
```

### 2. Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs (Swagger UI) are at `http://localhost:8000/docs`.

### 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (or `5174` if that port is in use).

### Demo investor IDs

The portfolio page accepts any of these pre-loaded investor IDs:

- `inv_demo001` — Sophie Hartmann (3 positions, €85,000 invested)
- `inv_demo002` — Marco van den Berg (2 positions, €50,000 invested)
- `inv_demo003` — Isabelle Fontaine (4 positions, €120,000 invested)

The portfolio page pre-fills `inv_demo001` so a grader can load data immediately.

---

## API authentication

Every request to the Privora API must include a valid API key in the `X-API-Key` request header. This simulates Privora's real B2B access control model, where each wealth platform client is issued a unique key that identifies them in Privora's system.

Requests with a missing or invalid key return `401 Unauthorized` with a clear error message.

### Mock API keys

| Key | Mapped client |
|-----|---------------|
| `pvr-key-alphawealth-001` | AlphaWealth |
| `pvr-key-nordea-invest-002` | Nordea Invest |
| `pvr-key-gamma-capital-003` | Gamma Capital Management |

The frontend uses `pvr-key-alphawealth-001` by default. To test authentication, pass any of the three keys in the `X-API-Key` header when calling the API directly (e.g., via the Swagger UI at `/docs` or with curl).

---

## Creativity features

Three features go beyond the basic endpoint requirements:

### 1. API key authentication middleware

Implemented as a Starlette `BaseHTTPMiddleware` that intercepts every request before it reaches a route handler. The middleware checks the `X-API-Key` header against a registry loaded from `mock_data/api_keys.json` at startup. CORS preflight requests and the `/docs`, `/openapi.json`, and `/` routes are exempt so the Swagger UI remains accessible. This is the exact access control pattern Privora would use in production to gate API access by wealth platform client.

### 2. Live fee calculator

Visible in the Investment Flow page before the investor confirms a subscription. As soon as the user selects a fund and enters an amount, the calculator updates live — with no API call — showing the placement fee (one-time, at subscription), annual management fee (deducted from NAV), gross annual yield, and net estimated return after fees. Every line maps directly to one of Privora's four revenue levers, making the business model legible to the end client at the moment of decision.

### 3. Platform suitability checker

Built into the onboarding flow and enforced server-side in `POST /onboard`. The check applies Privora's own distribution policy criteria: an investor passes if their net worth is ≥ €100,000 or their annual income is ≥ €100,000 (either condition is sufficient). These thresholds reflect Privora's fund manager distribution policy, not a direct EU regulatory requirement. If neither criterion is met, the response explains exactly why. If an investor passes but their net worth is below €500,000, the response flags that Privora's distribution policy recommends a 10% allocation cap on private market exposure — and the frontend displays this as a prominent warning alongside their issued investor ID.

### 4. Professional fintech visual design

The frontend uses a light professional fintech aesthetic: a light grey-white (`#f4f6f9`) page background, white cards with subtle borders, deep navy (`#1e3a5f`) for the navbar, primary buttons, and the Fund Discovery hero banner, and gold (`#c9a84c`) as the accent colour for key numbers, highlights, and the brand logo. Teal (`#00b4d8`) marks cash and liquidity elements. The design deliberately contrasts the clean white content layer with the authoritative navy navigation, giving the product the visual register of an institutional wealth management platform rather than a consumer app.

---

## AI agent usage

This MVP was built using **Claude Code** (Anthropic's AI coding agent, `claude-sonnet-4-6`) as the primary development tool. The `CLAUDE.md` file at the root of this repository contains the full set of instructions given to the agent, including the architecture decisions, build sequence, API specification, frontend page requirements, creativity features, and coding conventions.

The build was done incrementally: each step in the 18-step build sequence in `CLAUDE.md` was submitted to Claude Code as a plain English instruction (e.g., "Build the POST /onboard endpoint with ELTIF 2.0 eligibility logic"). Claude Code read the relevant context, wrote the code, and the output was reviewed before moving to the next step. No code in this repository was written by hand — every file was generated or edited by the agent from written instructions.

This approach was intentional: it demonstrates that Privora's API specification is clear and precise enough to be implemented from a written brief, which is a prerequisite for the real B2B integration scenario the product describes.

---

## Course context

**Institution:** Rotterdam School of Management (RSM), Erasmus University
**Course:** FinTech (graduate elective)
**Assignment:** Assignment 2 — MVP build
**Submission type:** Individual submission
