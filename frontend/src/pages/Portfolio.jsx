// Portfolio Dashboard — fetches GET /portfolio/{investor_id} and displays holdings + cash yield
import { useState } from "react";
import "./Portfolio.css";
import { formatEurInt } from "../utils";

const API_BASE = "http://localhost:8000";
const API_KEY  = "pvr-key-alphawealth-001";

// Consistent colour per fund for the allocation bar segments
const SEGMENT_COLOURS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
];

const STATUS_STYLES = {
  active:  { bg: "#dcfce7", text: "#15803d", label: "Active"  },
  pending: { bg: "#fef3c7", text: "#b45309", label: "Pending" },
  exited:  { bg: "#f3f4f6", text: "#6b7280", label: "Exited"  },
};

function pct(part, total) {
  return total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";
}

// Stacked horizontal allocation bar
function AllocationBar({ positions, totalInvested }) {
  return (
    <div className="allocation-section">
      <h3 className="section-title">Allocation Breakdown</h3>
      <div className="alloc-bar">
        {positions.map((pos, i) => (
          <div
            key={pos.fund_id}
            className="alloc-segment"
            style={{
              width: `${pct(pos.amount_invested, totalInvested)}%`,
              backgroundColor: SEGMENT_COLOURS[i % SEGMENT_COLOURS.length],
            }}
            title={`${pos.fund_name}: ${pct(pos.amount_invested, totalInvested)}%`}
          />
        ))}
      </div>
      <div className="alloc-legend">
        {positions.map((pos, i) => (
          <div key={pos.fund_id} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: SEGMENT_COLOURS[i % SEGMENT_COLOURS.length] }}
            />
            <span className="legend-name">{pos.fund_name}</span>
            <span className="legend-pct">{pct(pos.amount_invested, totalInvested)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Summary stat cards row
function SummaryCards({ data }) {
  const totalCurrentValue = data.positions.reduce((s, p) => s + p.current_value, 0);
  const totalGain = totalCurrentValue - data.total_invested;
  const gainPositive = totalGain >= 0;

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <span className="summary-label">Total Invested</span>
        <span className="summary-value">{formatEurInt(data.total_invested)}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Current Value</span>
        <span className="summary-value">{formatEurInt(totalCurrentValue)}</span>
        <span className={`summary-gain ${gainPositive ? "gain-pos" : "gain-neg"}`}>
          {gainPositive ? "+" : ""}{formatEurInt(totalGain)}
        </span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Positions</span>
        <span className="summary-value">{data.positions.length}</span>
      </div>
      <div className="summary-card summary-card-cash">
        <span className="summary-label">Cash Pending Deployment</span>
        <span className="summary-value">{formatEurInt(data.cash_pending_deployment)}</span>
        <span className="summary-yield">
          Earning {data.estimated_interest_yield_pct}% p.a. ·{" "}
          {formatEurInt(data.estimated_interest_yield_amount)}/yr
        </span>
      </div>
    </div>
  );
}

// Individual position row
function PositionRow({ pos, index, totalInvested }) {
  const style = STATUS_STYLES[pos.status] ?? STATUS_STYLES.active;
  const gain  = pos.current_value - pos.amount_invested;
  const gainPos = gain >= 0;

  return (
    <div className="position-row">
      <div className="pos-colour" style={{ backgroundColor: SEGMENT_COLOURS[index % SEGMENT_COLOURS.length] }} />
      <div className="pos-main">
        <div className="pos-top">
          <span className="pos-name">{pos.fund_name}</span>
          <span
            className="pos-badge"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {style.label}
          </span>
        </div>
        <div className="pos-bar-wrap">
          <div
            className="pos-bar-fill"
            style={{
              width: `${pct(pos.amount_invested, totalInvested)}%`,
              backgroundColor: SEGMENT_COLOURS[index % SEGMENT_COLOURS.length],
            }}
          />
        </div>
        <div className="pos-numbers">
          <span className="pos-stat">
            <span className="pos-stat-label">Invested</span>
            <span className="pos-stat-value">{formatEurInt(pos.amount_invested)}</span>
          </span>
          <span className="pos-stat">
            <span className="pos-stat-label">Current Value</span>
            <span className="pos-stat-value">{formatEurInt(pos.current_value)}</span>
          </span>
          <span className="pos-stat">
            <span className="pos-stat-label">Allocation</span>
            <span className="pos-stat-value">{pct(pos.amount_invested, totalInvested)}%</span>
          </span>
          <span className="pos-stat">
            <span className="pos-stat-label">Unrealised</span>
            <span className={`pos-stat-value ${gainPos ? "gain-pos" : "gain-neg"}`}>
              {gainPos ? "+" : ""}{formatEurInt(gain)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Investor ID lookup with summary cards, allocation bar, and position list
function Portfolio() {
  const [investorId, setInvestorId] = useState("inv_demo001");
  const [portfolio, setPortfolio]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // Fetches portfolio data for the entered investor ID from /portfolio/{id}
  async function loadPortfolio(e) {
    e.preventDefault();
    if (!investorId.trim()) return;
    setLoading(true);
    setError(null);
    setPortfolio(null);
    try {
      const res = await fetch(`${API_BASE}/portfolio/${encodeURIComponent(investorId.trim())}`, {
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? `API ${res.status}`);
      setPortfolio(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>Portfolio Dashboard</h1>
          <p className="page-subtitle">View allocations, positions, and cash yield by investor</p>
        </div>
      </div>

      {/* Investor ID lookup bar */}
      <form className="lookup-bar" onSubmit={loadPortfolio}>
        <label htmlFor="investor-id-input" className="lookup-label">Investor ID</label>
        <input
          id="investor-id-input"
          type="text"
          className="lookup-input"
          value={investorId}
          onChange={(e) => setInvestorId(e.target.value)}
          placeholder="e.g. inv_demo001"
        />
        <button className="btn-load" type="submit" disabled={loading}>
          {loading ? "Loading…" : "Load Portfolio"}
        </button>
        <span className="lookup-hint">
          Demo IDs: inv_demo001 · inv_demo002 · inv_demo003
        </span>
      </form>

      {/* Loading */}
      {loading && (
        <div className="state-container">
          <div className="spinner" />
          <p className="state-message">Loading portfolio…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="state-container error-state">
          <p className="state-message">⚠ Could not load portfolio: {error}</p>
          <p className="state-hint">Make sure the Privora API is running on port 8000.</p>
        </div>
      )}

      {/* Portfolio data */}
      {portfolio && !loading && (
        <div className="portfolio-content">
          <div className="portfolio-investor-name">{portfolio.name}</div>

          <SummaryCards data={portfolio} />

          <AllocationBar
            positions={portfolio.positions}
            totalInvested={portfolio.total_invested}
          />

          <div className="positions-section">
            <h3 className="section-title">Positions</h3>
            <div className="positions-list">
              {portfolio.positions.map((pos, i) => (
                <PositionRow
                  key={pos.fund_id}
                  pos={pos}
                  index={i}
                  totalInvested={portfolio.total_invested}
                />
              ))}
            </div>
          </div>

          {/* Cash pending deployment callout */}
          <div className="cash-callout">
            <div className="cash-callout-left">
              <span className="cash-callout-label">Cash Pending Deployment</span>
              <span className="cash-callout-desc">
                Uninvested balance earning interest while awaiting allocation
              </span>
            </div>
            <div className="cash-callout-right">
              <span className="cash-amount">{formatEurInt(portfolio.cash_pending_deployment)}</span>
              <span className="cash-yield">
                {portfolio.estimated_interest_yield_pct}% p.a. · {formatEurInt(portfolio.estimated_interest_yield_amount)}/yr
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Portfolio;
