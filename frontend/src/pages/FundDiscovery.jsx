// Fund Discovery page — fetches GET /funds and renders filterable fund cards
import { useState, useEffect } from "react";
import "./FundDiscovery.css";
import { ASSET_CLASS_COLOURS, formatEurInt } from "../utils";

const API_BASE = "http://localhost:8000";
const API_KEY = "pvr-key-alphawealth-001";

// Individual fund card showing name, asset class badge, stats, and ELTIF eligibility
function FundCard({ fund }) {
  const accent = ASSET_CLASS_COLOURS[fund.asset_class] || { bg: "#f3f4f6", text: "#374151" };

  return (
    <div className="fund-card">
      <div className="fund-card-header">
        <div className="fund-card-badges">
          <span
            className="badge badge-asset-class"
            style={{ backgroundColor: accent.bg, color: accent.text }}
          >
            {fund.asset_class}
          </span>
          {fund.eltif_eligible && (
            <span className="badge badge-eltif">ELTIF 2.0 Eligible</span>
          )}
        </div>
        <h2 className="fund-card-name">{fund.name}</h2>
        <p className="fund-card-description">{fund.description}</p>
      </div>

      <div className="fund-card-stats">
        <div className="stat stat-highlight">
          <span className="stat-label">Expected Return</span>
          <span className="stat-value stat-value-green">{fund.expected_return}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Min. Investment</span>
          <span className="stat-value">{formatEurInt(fund.minimum_investment)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Annual Fee</span>
          <span className="stat-value stat-value-muted">{fund.annual_fee}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Placement Fee</span>
          <span className="stat-value stat-value-muted">{fund.placement_fee}%</span>
        </div>
      </div>
    </div>
  );
}

// Main page: fetches all funds and renders a filterable card grid
function FundDiscovery() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch(`${API_BASE}/funds`, {
      headers: { "X-API-Key": API_KEY },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFunds(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Derive unique asset classes from the fetched data for the filter dropdown
  const assetClasses = ["All", ...new Set(funds.map((f) => f.asset_class))];
  const visible = filter === "All" ? funds : funds.filter((f) => f.asset_class === filter);

  return (
    <div className="page fund-discovery">

      {/* Hero banner */}
      <div className="fund-hero">
        <div className="hero-body">
          <p className="hero-eyebrow">ELTIF 2.0 Compliant · Privora Platform</p>
          <h1 className="hero-title">
            Private Markets,{" "}
            <span className="hero-accent">Democratised</span>
          </h1>
          <p className="hero-subtitle">
            Access institutional-grade infrastructure, private credit, real estate,
            and private equity — structured under the EU&apos;s ELTIF 2.0 framework
            for eligible retail investors.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">5</span>
              <span className="hero-stat-label">Funds Available</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">€1K</span>
              <span className="hero-stat-label">Min. Investment</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">14.5%</span>
              <span className="hero-stat-label">Max Target Return</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">ELTIF 2.0</span>
              <span className="hero-stat-label">Regulatory Wrapper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="page-header">
        {!loading && !error && (
          <div className="filter-bar">
            <label htmlFor="asset-class-filter" className="filter-label">
              Asset Class
            </label>
            <select
              id="asset-class-filter"
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {assetClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="state-container">
          <div className="spinner" />
          <p className="state-message">Loading funds…</p>
        </div>
      )}

      {error && (
        <div className="state-container error-state">
          <p className="state-message">⚠ Could not load funds: {error}</p>
          <p className="state-hint">Make sure the Privora API is running on port 8000.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="results-count">
            {visible.length} fund{visible.length !== 1 ? "s" : ""}
            {filter !== "All" ? ` in ${filter}` : ""}
          </p>
          <div className="fund-grid">
            {visible.map((fund) => (
              <FundCard key={fund.id} fund={fund} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default FundDiscovery;
