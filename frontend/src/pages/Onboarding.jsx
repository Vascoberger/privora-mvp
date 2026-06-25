// Onboarding page — KYC form + platform suitability check via POST /onboard
import { useState } from "react";
import "./Onboarding.css";

const API_BASE = "http://localhost:8000";
const API_KEY  = "pvr-key-alphawealth-001";

const INITIAL_FORM = {
  name:          "",
  investor_type: "retail",
  annual_income: "",
  net_worth:     "",
  risk_profile:  "conservative",
};

// Displays platform suitability result, investor ID, and cap warning if applicable
function ResultPanel({ result, onReset }) {
  const pass = result.status === "pass";

  return (
    <div className={`result-panel ${pass ? "result-pass" : "result-fail"}`}>
      <div className="result-header">
        <span className="result-icon">{pass ? "✓" : "✗"}</span>
        <div>
          <h2 className="result-title">
            {pass ? "Eligibility Confirmed" : "Not Eligible"}
          </h2>
          <p className="result-subtitle">
            Privora Platform Suitability Assessment
          </p>
        </div>
      </div>

      <p className="result-reason">{result.reason}</p>

      {pass && (
        <>
          <div className="investor-id-box">
            <span className="investor-id-label">Investor ID</span>
            <span className="investor-id-value">{result.investor_id}</span>
            <span className="investor-id-hint">
              Use this ID when placing investments
            </span>
          </div>

          {result.cap_applies && (
            <div className="cap-warning">
              <strong>10% Allocation Cap Recommended</strong>
              <p>
                Per Privora's distribution policy, investors with a net worth below
                €500,000 are recommended to limit private market exposure to 10% of
                their financial portfolio. Ensure each subscription stays within
                this guideline.
              </p>
            </div>
          )}
        </>
      )}

      <button className="btn-secondary" onClick={onReset}>
        Run Another Check
      </button>
    </div>
  );
}

// KYC form paired with a right-column platform suitability result panel
function Onboarding() {
  const [form, setForm]       = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  // Updates the corresponding form field in state
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Submits KYC data to /onboard and stores the eligibility result
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          name:          form.name,
          investor_type: form.investor_type,
          annual_income: parseFloat(form.annual_income),
          net_worth:     parseFloat(form.net_worth),
          risk_profile:  form.risk_profile,
        }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Clears result and resets form to initial values
  function handleReset() {
    setResult(null);
    setError(null);
    setForm(INITIAL_FORM);
  }

  return (
    <div className="page onboarding">
      <div className="page-header">
        <h1>Investor Onboarding</h1>
        <p className="page-subtitle">
          KYC verification and platform suitability assessment
        </p>
      </div>

      <div className="onboarding-layout">
        {/* ── Form ── */}
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="form-section-title">Personal Details</div>

          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Sophie Hartmann"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="investor_type">Investor Type</label>
            <select
              id="investor_type"
              name="investor_type"
              value={form.investor_type}
              onChange={handleChange}
            >
              <option value="retail">Individual (Retail)</option>
              <option value="professional">Institutional (Professional)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="risk_profile">Risk Profile</label>
            <select
              id="risk_profile"
              name="risk_profile"
              value={form.risk_profile}
              onChange={handleChange}
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div className="form-section-title">Financial Information</div>

          <div className="form-field">
            <label htmlFor="annual_income">
              Annual Income (EUR)
            </label>
            <input
              id="annual_income"
              name="annual_income"
              type="number"
              min="1"
              placeholder="e.g. 120000"
              value={form.annual_income}
              onChange={handleChange}
              required
            />
            <span className="field-hint">
              Privora distribution policy minimum: ≥ €100,000
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="net_worth">
              Net Worth (EUR, excl. primary residence)
            </label>
            <input
              id="net_worth"
              name="net_worth"
              type="number"
              min="1"
              placeholder="e.g. 250000"
              value={form.net_worth}
              onChange={handleChange}
              required
            />
            <span className="field-hint">
              Privora distribution policy minimum: ≥ €100,000 · 10% cap recommended if &lt; €500,000
            </span>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Checking eligibility…" : "Submit for Assessment"}
          </button>

          {error && (
            <p className="form-error">
              ⚠ Could not reach the API: {error}
            </p>
          )}
        </form>

        {/* ── Result panel ── */}
        <div className="result-column">
          {!result && !loading && (
            <div className="result-placeholder">
              <div className="placeholder-icon">⚖</div>
              <p className="placeholder-title">Eligibility Check</p>
              <p className="placeholder-body">
                Complete the form to run a Privora platform suitability assessment.
                Results appear here instantly.
              </p>
              <ul className="placeholder-rules">
                <li>✓ Pass if annual income ≥ €100,000</li>
                <li>✓ Pass if net worth ≥ €100,000</li>
                <li>⚠ 10% cap recommended if net worth &lt; €500,000</li>
                <li>✗ Fail if neither distribution policy criterion is met</li>
              </ul>
            </div>
          )}

          {loading && (
            <div className="result-placeholder">
              <div className="spinner" />
              <p className="placeholder-body">Running eligibility check…</p>
            </div>
          )}

          {result && <ResultPanel result={result} onReset={handleReset} />}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
