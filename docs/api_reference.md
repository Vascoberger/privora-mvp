# Privora API Reference

**Base URL:** `http://localhost:8000`  
**Interactive docs (Swagger UI):** `http://localhost:8000/docs`  
**Version:** 1.0.0

---

## Authentication

Every endpoint except the health check (`/`) and the Swagger UI (`/docs`, `/openapi.json`, `/redoc`) requires an API key in the request header:

```
X-API-Key: <your-key>
```

Missing or invalid keys return `401 Unauthorized`.

**Demo API keys**

| Key | Platform |
|-----|---------|
| `pvr-key-alphawealth-001` | AlphaWealth |
| `pvr-key-nordea-invest-002` | Nordea Invest |
| `pvr-key-gamma-capital-003` | Gamma Capital Management |

**401 — Missing key**
```json
{
  "detail": "Missing API key. Include your key in the X-API-Key request header. Contact Privora to obtain a key for your platform."
}
```

**401 — Unrecognised key**
```json
{
  "detail": "Unrecognised API key. Contact Privora to verify your credentials."
}
```

---

## Endpoints

### 1. GET /funds

Returns the full catalogue of ELTIF 2.0-eligible private market funds available on the Privora platform. Wealth platforms use this to populate their fund discovery UIs. Each fund includes both fee types (management fee and placement fee) so the client-facing fee calculator can be driven entirely from this response.

**Authentication:** Required

**Request parameters:** None

**Example request**
```bash
curl http://localhost:8000/funds \
  -H "X-API-Key: pvr-key-alphawealth-001"
```

**Response schema**

Returns an array of Fund objects.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique fund identifier |
| `name` | string | Full fund name |
| `asset_class` | string | Asset class (e.g. Infrastructure, Private Credit) |
| `minimum_investment` | number | Minimum subscription amount in EUR |
| `expected_return` | number | Target annual return (%) |
| `annual_fee` | number | Ongoing management fee (% per year) |
| `placement_fee` | number | One-time placement fee charged at subscription (%) |
| `eltif_eligible` | boolean | Whether the fund qualifies for ELTIF 2.0 retail distribution |
| `description` | string | Plain-language fund description |

**Example response** `200 OK`
```json
[
  {
    "id": "fund_001",
    "name": "Privora European Infrastructure Fund I",
    "asset_class": "Infrastructure",
    "minimum_investment": 10000,
    "expected_return": 8.5,
    "annual_fee": 1.75,
    "placement_fee": 2.0,
    "eltif_eligible": true,
    "description": "A diversified portfolio of European infrastructure assets including renewable energy, digital infrastructure, and transport. Targets stable, inflation-linked cash flows over a 10-year horizon under ELTIF 2.0 regulations."
  },
  {
    "id": "fund_002",
    "name": "Privora Private Credit Opportunities Fund",
    "asset_class": "Private Credit",
    "minimum_investment": 5000,
    "expected_return": 9.2,
    "annual_fee": 1.5,
    "placement_fee": 1.5,
    "eltif_eligible": true,
    "description": "Senior secured direct lending to mid-market European companies. Floating rate exposure provides natural inflation hedging with quarterly income distributions and a 7-year fund life."
  }
]
```

---

### 2. POST /onboard

Runs a mock KYC check and ELTIF 2.0 retail suitability assessment for a prospective investor. Returns a pass/fail result with a plain-English explanation. On success, issues an `investor_id` that must be passed to `POST /invest` and `GET /portfolio/{investor_id}`.

**ELTIF 2.0 eligibility rules applied:**
- **Pass** if `net_worth >= 100,000` OR `annual_income >= 100,000` (EUR)
- **Cap flag** set if investor passes but `net_worth < 500,000` — the regulation caps ELTIF exposure at 10% of the financial portfolio in this case
- **Fail** if neither threshold is met

**Authentication:** Required

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Full legal name of the investor |
| `investor_type` | string | Yes | `"retail"` or `"professional"` |
| `annual_income` | number | Yes | Gross annual income in EUR (must be > 0) |
| `net_worth` | number | Yes | Total net worth in EUR, excluding primary residence (must be > 0) |
| `risk_profile` | string | Yes | `"conservative"`, `"moderate"`, or `"aggressive"` |

**Example request — eligible investor**
```bash
curl -X POST http://localhost:8000/onboard \
  -H "X-API-Key: pvr-key-alphawealth-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sophie Hartmann",
    "investor_type": "retail",
    "annual_income": 120000,
    "net_worth": 200000,
    "risk_profile": "moderate"
  }'
```

**Example response — pass with 10% cap** `200 OK`
```json
{
  "status": "pass",
  "eligibility": true,
  "reason": "Eligible for ELTIF 2.0 access. Note: net worth €200,000 is below €500,000, so the ELTIF 2.0 10% portfolio cap applies — maximum ELTIF exposure is €20,000.",
  "cap_applies": true,
  "investor_id": "inv_a501e0e39d"
}
```

**Example request — ineligible investor**
```bash
curl -X POST http://localhost:8000/onboard \
  -H "X-API-Key: pvr-key-alphawealth-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Low",
    "investor_type": "retail",
    "annual_income": 40000,
    "net_worth": 50000,
    "risk_profile": "conservative"
  }'
```

**Example response — fail** `200 OK`
```json
{
  "status": "fail",
  "eligibility": false,
  "reason": "Does not meet ELTIF 2.0 retail eligibility thresholds. Annual income €40,000 is below €100,000 and net worth €50,000 is below €100,000. At least one threshold must be met.",
  "cap_applies": false,
  "investor_id": null
}
```

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"pass"` or `"fail"` |
| `eligibility` | boolean | Whether the investor meets ELTIF 2.0 thresholds |
| `reason` | string | Plain-English explanation citing actual figures |
| `cap_applies` | boolean | `true` if the 10% portfolio cap applies (`net_worth < €500,000`) |
| `investor_id` | string \| null | Issued on pass; `null` on fail |

---

### 3. POST /invest

Places a mock subscription order into an ELTIF 2.0 fund and returns a complete fee breakdown. All four Privora revenue levers are surfaced in the response so the wealth platform can render a transparent pre-confirmation fee calculator. Returns `400` if the amount is below the fund's minimum investment, and `404` if the `fund_id` is not recognised.

**Authentication:** Required

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `investor_id` | string | Yes | ID issued by `POST /onboard` |
| `fund_id` | string | Yes | Fund ID from `GET /funds` |
| `amount` | number | Yes | Gross subscription amount in EUR (must be > 0) |

**Example request**
```bash
curl -X POST http://localhost:8000/invest \
  -H "X-API-Key: pvr-key-alphawealth-001" \
  -H "Content-Type: application/json" \
  -d '{
    "investor_id": "inv_demo001",
    "fund_id": "fund_001",
    "amount": 50000
  }'
```

**Example response** `200 OK`
```json
{
  "order_id": "ord_79881b90ad",
  "investor_id": "inv_demo001",
  "fund_id": "fund_001",
  "amount_invested": 50000,
  "management_fee_pct": 1.75,
  "management_fee_amount": 875.0,
  "placement_fee_pct": 2.0,
  "placement_fee_amount": 1000.0,
  "estimated_annual_yield_pct": 8.5,
  "estimated_annual_yield_amount": 4250.0,
  "net_estimated_return": 3375.0,
  "status": "confirmed"
}
```

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `order_id` | string | Unique subscription order identifier |
| `investor_id` | string | Echoed from request |
| `fund_id` | string | Echoed from request |
| `amount_invested` | number | Gross subscription amount in EUR |
| `management_fee_pct` | number | Annual management fee rate (%) |
| `management_fee_amount` | number | Annual management fee in EUR |
| `placement_fee_pct` | number | One-time placement fee rate (%) |
| `placement_fee_amount` | number | One-time placement fee in EUR |
| `estimated_annual_yield_pct` | number | Fund's target annual return (%) |
| `estimated_annual_yield_amount` | number | Estimated gross yield in EUR per year |
| `net_estimated_return` | number | Gross yield minus annual management fee (first-year view), in EUR |
| `status` | string | `"confirmed"` |

**Error responses**

`400 Bad Request` — amount below minimum:
```json
{
  "detail": "Amount €1,000 is below the minimum investment of €10,000 for this fund."
}
```

`404 Not Found` — unknown fund:
```json
{
  "detail": "Fund 'fund_999' not found."
}
```

---

### 4. GET /portfolio/{investor_id}

Returns the current portfolio for a given investor: all fund positions with current mark-to-model values, plus the cash balance pending deployment and its estimated interest yield. Returns `404` if the investor ID is not found.

**Authentication:** Required

**Path parameter**

| Parameter | Type | Description |
|-----------|------|-------------|
| `investor_id` | string | Investor ID from `POST /onboard`. Demo IDs: `inv_demo001`, `inv_demo002`, `inv_demo003` |

**Example request**
```bash
curl http://localhost:8000/portfolio/inv_demo001 \
  -H "X-API-Key: pvr-key-alphawealth-001"
```

**Example response** `200 OK`
```json
{
  "investor_id": "inv_demo001",
  "name": "Sophie Hartmann",
  "total_invested": 85000,
  "positions": [
    {
      "fund_id": "fund_001",
      "fund_name": "Privora European Infrastructure Fund I",
      "amount_invested": 40000,
      "current_value": 42300,
      "status": "active"
    },
    {
      "fund_id": "fund_002",
      "fund_name": "Privora Private Credit Opportunities Fund",
      "amount_invested": 25000,
      "current_value": 26150,
      "status": "active"
    },
    {
      "fund_id": "fund_003",
      "fund_name": "Privora Real Estate Core Europe Fund",
      "amount_invested": 20000,
      "current_value": 19800,
      "status": "active"
    }
  ],
  "cash_pending_deployment": 15000,
  "estimated_interest_yield_pct": 4.2,
  "estimated_interest_yield_amount": 630
}
```

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `investor_id` | string | Unique investor identifier |
| `name` | string | Investor's full name |
| `total_invested` | number | Total amount deployed into funds in EUR |
| `positions` | array | List of Position objects (see below) |
| `cash_pending_deployment` | number | Uninvested cash balance in EUR; Privora earns an interest spread on this float |
| `estimated_interest_yield_pct` | number | Annualised yield rate on idle cash (%) |
| `estimated_interest_yield_amount` | number | Estimated annual interest earned on cash balance in EUR |

**Position object**

| Field | Type | Description |
|-------|------|-------------|
| `fund_id` | string | Fund identifier |
| `fund_name` | string | Full fund name |
| `amount_invested` | number | Original subscription amount in EUR |
| `current_value` | number | Mark-to-model NAV of the position in EUR |
| `status` | string | `"active"`, `"pending"` (in settlement), or `"exited"` |

**Error response**

`404 Not Found`:
```json
{
  "detail": "Investor 'inv_unknown' not found. Demo IDs: inv_demo001, inv_demo002, inv_demo003."
}
```

---

### 5. GET /secondary-market

Returns all fund positions currently listed for sale on the Privora secondary market. Only listings with `status = "available"` are returned — sold positions are filtered out. Privora charges a commission on each secondary transaction; the `commission_amount` is pre-calculated in every listing so the buyer UI can display the all-in cost (`asking_price + commission_amount`) without additional arithmetic.

**Authentication:** Required

**Request parameters:** None

**Example request**
```bash
curl http://localhost:8000/secondary-market \
  -H "X-API-Key: pvr-key-alphawealth-001"
```

**Example response** `200 OK`
```json
[
  {
    "listing_id": "sec_001",
    "seller_id": "inv_demo003",
    "fund_id": "fund_001",
    "fund_name": "Privora European Infrastructure Fund I",
    "asset_class": "Infrastructure",
    "original_investment": 20000,
    "asking_price": 19400,
    "discount_pct": 3.0,
    "commission_pct": 1.5,
    "commission_amount": 291.0,
    "status": "available"
  },
  {
    "listing_id": "sec_002",
    "seller_id": "inv_demo001",
    "fund_id": "fund_003",
    "fund_name": "Privora Real Estate Core Europe Fund",
    "asset_class": "Real Estate",
    "original_investment": 20000,
    "asking_price": 19800,
    "discount_pct": 1.0,
    "commission_pct": 1.5,
    "commission_amount": 297.0,
    "status": "available"
  },
  {
    "listing_id": "sec_003",
    "seller_id": "inv_demo002",
    "fund_id": "fund_005",
    "fund_name": "Privora Sustainable Forestry & Agriculture Fund",
    "asset_class": "Natural Capital",
    "original_investment": 10000,
    "asking_price": 10300,
    "discount_pct": 0.0,
    "commission_pct": 1.5,
    "commission_amount": 154.5,
    "status": "available"
  },
  {
    "listing_id": "sec_004",
    "seller_id": "inv_demo001",
    "fund_id": "fund_002",
    "fund_name": "Privora Private Credit Opportunities Fund",
    "asset_class": "Private Credit",
    "original_investment": 15000,
    "asking_price": 14250,
    "discount_pct": 5.0,
    "commission_pct": 1.5,
    "commission_amount": 213.75,
    "status": "available"
  }
]
```

**Response schema**

Returns an array of SecondaryListing objects.

| Field | Type | Description |
|-------|------|-------------|
| `listing_id` | string | Unique listing identifier |
| `seller_id` | string | Investor ID of the seller |
| `fund_id` | string | Fund being sold |
| `fund_name` | string | Full fund name |
| `asset_class` | string | Asset class of the underlying fund |
| `original_investment` | number | Amount the seller originally subscribed in EUR |
| `asking_price` | number | Price the seller is asking in EUR |
| `discount_pct` | number | Percentage discount to original investment; `0.0` means at or above par |
| `commission_pct` | number | Privora secondary market commission rate (%) |
| `commission_amount` | number | Commission charged to the buyer at settlement in EUR |
| `status` | string | Always `"available"` in this response (sold listings are filtered out) |

---

## Revenue Model Reference

Every Privora revenue lever is visible somewhere in the API:

| Revenue Lever | Endpoint | Field |
|---------------|----------|-------|
| Management fee | `GET /funds`, `POST /invest` | `annual_fee`, `management_fee_amount` |
| Placement fee | `GET /funds`, `POST /invest` | `placement_fee`, `placement_fee_amount` |
| Secondary market commission | `GET /secondary-market` | `commission_pct`, `commission_amount` |
| Interest yield on cash | `GET /portfolio/{investor_id}` | `estimated_interest_yield_pct`, `estimated_interest_yield_amount` |

---

## Demo Data Quick Reference

**Funds**

| ID | Name | Asset Class | Min. Investment | Expected Return |
|----|------|-------------|----------------|-----------------|
| `fund_001` | European Infrastructure Fund I | Infrastructure | €10,000 | 8.5% |
| `fund_002` | Private Credit Opportunities Fund | Private Credit | €5,000 | 9.2% |
| `fund_003` | Real Estate Core Europe Fund | Real Estate | €10,000 | 7.0% |
| `fund_004` | Growth Equity Fund II | Private Equity | €25,000 | 14.0% |
| `fund_005` | Sustainable Forestry & Agriculture Fund | Natural Capital | €10,000 | 6.5% |

**Investors**

| ID | Name | Positions | Total Invested | Cash |
|----|------|-----------|---------------|------|
| `inv_demo001` | Sophie Hartmann | 3 | €85,000 | €15,000 |
| `inv_demo002` | Marco van den Berg | 2 | €50,000 | €30,000 |
| `inv_demo003` | Isabelle Fontaine | 4 (1 pending) | €120,000 | €5,000 |
