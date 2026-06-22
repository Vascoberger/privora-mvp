# CLAUDE.md — Privora MVP

## Project Overview

Privora is a **B2B API infrastructure platform** that enables retail wealth platforms to offer their clients access to private market funds via ELTIF 2.0 regulatory wrappers. This MVP is built as part of a FinTech course assignment at Rotterdam School of Management (RSM), Erasmus University.

The MVP demonstrates Privora's core API stack in working code. It simulates what a wealth platform would integrate on the backend, and what their end client would see on the frontend.

**Repository:** `privora-mvp` (add your GitHub URL here)
**Team:** Two partners (individual submission, shared codebase)
**Stack:** Python + FastAPI (backend), React (frontend), mock JSON data (no real database)

---

## Architecture

The project is split into two components:

### Backend — FastAPI (Python)
Located in `/backend`. A REST API that represents Privora's infrastructure layer. Wealth platforms would call these endpoints to offer private market fund access to their clients.

### Frontend — React
Located in `/frontend`. A dashboard simulating a wealth platform's client portal, consuming the Privora API.

### Data
Located in `/backend/mock_data`. All data is hardcoded JSON — no database is used. This simulates real fund and investor data for demonstration purposes.

---

## API Endpoints

The backend must implement exactly these five endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/funds` | Returns list of available ELTIF 2.0 private market funds |
| POST | `/onboard` | Runs mock KYC + ELTIF 2.0 suitability check for an investor |
| POST | `/invest` | Places a mock subscription order into a fund |
| GET | `/portfolio/{investor_id}` | Returns investor's current allocations and positions |
| GET | `/secondary-market` | Returns available positions listed for secondary sale |

Each endpoint must include:
- A clear docstring describing what it does
- Typed request and response models using Pydantic
- Realistic mock data in the response
- Proper HTTP status codes

---

## Frontend Pages

The React frontend must implement these views:

1. **Fund Discovery** — Displays available funds from `GET /funds`. Filterable by asset class. Shows fund name, asset class, minimum investment, expected return, annual fee, ELTIF eligibility badge.

2. **Investor Onboarding** — Form collecting name, investor type, annual income, net worth, risk profile. Calls `POST /onboard`. Includes ELTIF 2.0 eligibility check (net worth ≥ €100,000 or annual income ≥ €100,000 per ELTIF 2.0 thresholds). Shows pass/fail result with reason.

3. **Investment Flow** — Fund selector + amount input. Shows fee breakdown before confirming (management fee, placement fee, estimated yield — the fee calculator). Calls `POST /invest` on confirmation.

4. **Portfolio Dashboard** — Calls `GET /portfolio/{investor_id}`. Shows current allocations, amounts invested, a simple allocation chart, and cash pending deployment with estimated interest yield.

5. **Secondary Market** — Calls `GET /secondary-market`. Shows available positions with seller info, price, and a buy button. Displays secondary market commission on transaction.

---

## Creativity Features

Three additional features must be implemented to go beyond the basic requirements:

### 1. API Key Authentication
- Every API request must include a valid API key in the request header: `X-API-Key: <key>`
- The backend maintains a mock registry of API keys mapped to wealth platform client names
- Requests with missing or invalid keys return `401 Unauthorized`
- This simulates Privora's real B2B access control model

### 2. Fee Calculator
- Visible in the Investment Flow page before the investor confirms
- Inputs: investment amount + selected fund
- Outputs: management fee (%), placement fee (%), estimated annual yield, net return estimate
- Maps directly to Privora's four revenue levers from the business plan

### 3. ELTIF 2.0 Eligibility Checker
- Part of the onboarding flow
- Checks investor net worth (≥ €100,000) and/or annual income (≥ €100,000) against ELTIF 2.0 thresholds
- If eligible: proceeds to full onboarding
- If not eligible: returns a clear explanation of why and what threshold was not met
- Partial investment cap logic: if eligible but net worth < €500,000, flag that the ELTIF 2.0 cap of 10% of financial portfolio applies

---

## Revenue Model Mapping (A1 → A2)

Every revenue lever from the business plan must be visible somewhere in the product:

| Revenue Lever | Where it appears in the MVP |
|---------------|----------------------------|
| Management fee | Fund details card + fee calculator |
| Placement fee | Fee calculator + investment confirmation |
| Secondary market commission | Secondary market tab on transaction |
| Interest yield on cash | Portfolio view — "cash pending deployment" line |

---

## API Documentation

- FastAPI auto-generates interactive docs at `/docs` (Swagger UI) — keep all endpoint descriptions and models clean so this looks professional
- A manual `docs/api_reference.md` file must also be written documenting each endpoint with example requests and responses
- The `/docs` page should be shown in the demo video as part of the architecture walkthrough

---

## Repository Standards

- **Commits:** Commit after each meaningful milestone — not at the end. Target 12–18 commits minimum spread across the build. Commit messages should be clear and descriptive (e.g. `add GET /funds endpoint with mock data`, `connect fund discovery page to API`)
- **Comments:** Every function and component must have a brief comment explaining what it does
- **File naming:** snake_case for Python files, PascalCase for React components
- **No secrets:** No real API keys, credentials, or sensitive data anywhere in the repo

---

## Build Sequence

Build in this exact order to avoid blocking dependencies:

1. Repo setup + this CLAUDE.md
2. Backend skeleton (FastAPI app, folder structure, mock data files)
3. `GET /funds` endpoint
4. `POST /onboard` endpoint with ELTIF 2.0 eligibility logic
5. `POST /invest` endpoint with fee calculation logic
6. `GET /portfolio/{investor_id}` endpoint
7. `GET /secondary-market` endpoint
8. API key authentication middleware
9. Write `docs/api_reference.md`
10. React frontend scaffold (routing, layout, navbar)
11. Fund Discovery page
12. Onboarding page
13. Investment Flow page with fee calculator
14. Portfolio Dashboard page
15. Secondary Market page
16. Connect all pages to live API
17. Polish, comments, README
18. Final review and video recording

---

## Coding Conventions

- Python 3.11+
- Use Pydantic models for all request and response schemas
- Use `httpx` or `fetch` on the frontend for API calls
- CORS must be enabled on the FastAPI backend so the React frontend can call it locally
- Keep all mock data in `/backend/mock_data/` as `.json` files
- React components go in `/frontend/src/components/`
- Use React Router for page navigation
- No external UI libraries unless explicitly approved — keep styling clean with plain CSS or Tailwind

---

## Context for the AI Agent

This is an academic MVP, not a production system. The goal is to demonstrate Privora's conceptual innovation clearly and convincingly. Every feature should be explainable in terms of what it represents in the real business model. When in doubt, prioritise clarity and correctness over complexity. The grader is a FinTech professor who understands the domain — the architecture must make business sense, not just technical sense.
