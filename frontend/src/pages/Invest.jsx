// Investment Flow page — fund selector, live fee calculator, and POST /invest confirmation
import { useState, useEffect } from "react";
import "./Invest.css";
import { formatEur, formatEurInt } from "../utils";

const API_BASE = "http://localhost:8000";
const API_KEY  = "pvr-key-alphawealth-001";

// Computes all fee lines from a fund object and a raw amount
function calcFees(fund, amount) {
  const mgmtFeePct      = fund.annual_fee;
  const placementFeePct = fund.placement_fee;
  const yieldPct        = fund.expected_return;

  const mgmtFeeAmount  = amount * mgmtFeePct / 100;
  const placementFeeAmt = amount * placementFeePct / 100;
  const yieldAmount    = amount * yieldPct / 100;
  const netReturn      = yieldAmount - mgmtFeeAmount;

  return { mgmtFeePct, mgmtFeeAmount, placementFeePct, placementFeeAmt, yieldPct, yieldAmount, netReturn };
}

// The live fee breakdown panel shown before confirmation
function FeeCalculator({ fund, amount, onConfirm, submitting }) {
  const parsed = parseFloat(amount);
  const valid  = !isNaN(parsed) && parsed > 0;
  const fees   = valid ? calcFees(fund, parsed) : null;
  const belowMin = valid && parsed < fund.minimum_investment;

  return (
    <div className="fee-calculator">
      <div className="calc-fund-header">
        <span className="calc-fund-label">Selected Fund</span>
        <span className="calc-fund-name">{fund.name}</span>
        <span className="calc-fund-meta">
          {fund.asset_class} · Min. {formatEurInt(fund.minimum_investment)}
        </span>
      </div>

      {!valid && (
        <p className="calc-placeholder">Enter an amount to see the fee breakdown.</p>
      )}

      {valid && fees && (
        <div className="fee-rows">
          <div className="fee-row">
            <div className="fee-row-left">
              <span className="fee-name">Placement Fee</span>
              <span className="fee-desc">One-time, charged at subscription</span>
            </div>
            <div className="fee-row-right">
              <span className="fee-pct">{fees.placementFeePct}%</span>
              <span className="fee-eur fee-cost">{formatEur(fees.placementFeeAmt)}</span>
            </div>
          </div>

          <div className="fee-row">
            <div className="fee-row-left">
              <span className="fee-name">Management Fee</span>
              <span className="fee-desc">Annual, deducted from fund NAV</span>
            </div>
            <div className="fee-row-right">
              <span className="fee-pct">{fees.mgmtFeePct}%</span>
              <span className="fee-eur fee-cost">{formatEur(fees.mgmtFeeAmount)} / yr</span>
            </div>
          </div>

          <div className="fee-divider" />

          <div className="fee-row">
            <div className="fee-row-left">
              <span className="fee-name">Gross Annual Yield</span>
              <span className="fee-desc">Based on fund target return</span>
            </div>
            <div className="fee-row-right">
              <span className="fee-pct">{fees.yieldPct}%</span>
              <span className="fee-eur fee-yield">{formatEur(fees.yieldAmount)} / yr</span>
            </div>
          </div>

          <div className="fee-row fee-row-net">
            <div className="fee-row-left">
              <span className="fee-name">Net Estimated Return</span>
              <span className="fee-desc">Yield minus management fee, year 1</span>
            </div>
            <div className="fee-row-right">
              <span className="fee-eur fee-net">{formatEur(fees.netReturn)} / yr</span>
            </div>
          </div>
        </div>
      )}

      {belowMin && (
        <p className="calc-min-warning">
          ⚠ Minimum investment for this fund is {formatEurInt(fund.minimum_investment)}.
        </p>
      )}

      <button
        className="btn-confirm"
        onClick={onConfirm}
        disabled={!valid || belowMin || submitting}
      >
        {submitting ? "Placing order…" : "Confirm Investment"}
      </button>
    </div>
  );
}

// Order confirmation shown after a successful POST /invest
function OrderConfirmation({ order, fund, onReset }) {
  return (
    <div className="order-confirmation">
      <div className="order-icon">✓</div>
      <h2 className="order-title">Order Confirmed</h2>
      <p className="order-subtitle">Your subscription has been placed successfully.</p>

      <div className="order-id-box">
        <span className="order-id-label">Order ID</span>
        <span className="order-id-value">{order.order_id}</span>
      </div>

      <div className="order-summary">
        <div className="summary-row">
          <span>Fund</span>
          <span>{fund.name}</span>
        </div>
        <div className="summary-row">
          <span>Amount Invested</span>
          <span>{formatEur(order.amount_invested)}</span>
        </div>
        <div className="summary-row">
          <span>Placement Fee</span>
          <span className="cost">{formatEur(order.placement_fee_amount)}</span>
        </div>
        <div className="summary-row">
          <span>Annual Management Fee</span>
          <span className="cost">{formatEur(order.management_fee_amount)} / yr</span>
        </div>
        <div className="summary-row">
          <span>Gross Annual Yield</span>
          <span className="yield">{formatEur(order.estimated_annual_yield_amount)} / yr</span>
        </div>
        <div className="summary-row summary-row-net">
          <span>Net Estimated Return</span>
          <span className="net">{formatEur(order.net_estimated_return)} / yr</span>
        </div>
      </div>

      <button className="btn-secondary" onClick={onReset}>
        Place Another Order
      </button>
    </div>
  );
}

// Fund selector, amount input, live fee calculator, and subscription confirmation
function Invest() {
  const [funds, setFunds]           = useState([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [fundsError, setFundsError] = useState(null);

  const [selectedFundId, setSelectedFundId] = useState("");
  const [investorId, setInvestorId]         = useState("");
  const [amount, setAmount]                 = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [order, setOrder]           = useState(null);

  // Fetch fund list on mount to populate the selector
  useEffect(() => {
    fetch(`${API_BASE}/funds`, { headers: { "X-API-Key": API_KEY } })
      .then((r) => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then((data) => { setFunds(data); setSelectedFundId(data[0]?.id ?? ""); setFundsLoading(false); })
      .catch((err) => { setFundsError(err.message); setFundsLoading(false); });
  }, []);

  const selectedFund = funds.find((f) => f.id === selectedFundId) ?? null;
  const showCalculator = selectedFund !== null && order === null;

  // Submits the subscription order to /invest and stores the confirmed order
  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({
          investor_id: investorId,
          fund_id:     selectedFundId,
          amount:      parseFloat(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? `API ${res.status}`);
      setOrder(data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Resets form fields and clears the confirmed order
  function handleReset() {
    setOrder(null);
    setSubmitError(null);
    setAmount("");
    setInvestorId("");
    setSelectedFundId(funds[0]?.id ?? "");
  }

  return (
    <div className="page invest-page">
      <div className="invest-header">
        <div>
          <h1>Invest</h1>
          <p className="page-subtitle">Place a subscription order into an ELTIF 2.0 fund</p>
        </div>
      </div>

      {fundsLoading && (
        <div className="state-container">
          <div className="spinner" />
          <p className="state-message">Loading funds…</p>
        </div>
      )}

      {fundsError && (
        <div className="state-container error-state">
          <p className="state-message">⚠ Could not load funds: {fundsError}</p>
          <p className="state-hint">Make sure the Privora API is running on port 8000.</p>
        </div>
      )}

      {!fundsLoading && !fundsError && (
        <div className="invest-layout">

          {/* ── Left: order form ── */}
          <div className="invest-form-card">
            <div className="form-section-title">Order Details</div>

            <div className="form-field">
              <label htmlFor="fund-select">Fund</label>
              <select
                id="fund-select"
                value={selectedFundId}
                onChange={(e) => { setSelectedFundId(e.target.value); setOrder(null); setSubmitError(null); }}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.asset_class})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="investor-id">Investor ID</label>
              <input
                id="investor-id"
                type="text"
                placeholder="e.g. inv_demo001"
                value={investorId}
                onChange={(e) => setInvestorId(e.target.value)}
              />
              <span className="field-hint">Issued by the Onboarding check</span>
            </div>

            <div className="form-field">
              <label htmlFor="amount">Investment Amount (EUR)</label>
              <div className="amount-input-wrap">
                <span className="amount-prefix">€</span>
                <input
                  id="amount"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setOrder(null); setSubmitError(null); }}
                />
              </div>
              {selectedFund && (
                <span className="field-hint">
                  Minimum for this fund: {formatEurInt(selectedFund.minimum_investment)}
                </span>
              )}
            </div>

            {submitError && (
              <p className="form-error">⚠ {submitError}</p>
            )}
          </div>

          {/* ── Right: fee calculator or confirmation ── */}
          <div className="invest-right-col">
            {order ? (
              <OrderConfirmation order={order} fund={selectedFund} onReset={handleReset} />
            ) : showCalculator ? (
              <FeeCalculator
                fund={selectedFund}
                amount={amount}
                onConfirm={handleConfirm}
                submitting={submitting}
              />
            ) : (
              <div className="calc-placeholder-card">
                <div className="placeholder-icon">📊</div>
                <p className="placeholder-title">Fee Calculator</p>
                <p className="placeholder-body">
                  Select a fund and enter an amount to see the live fee breakdown before confirming.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Invest;
