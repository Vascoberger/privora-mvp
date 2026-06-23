// Secondary Market page — fetches GET /secondary-market and renders buyable fund listings
import { useState, useEffect } from "react";
import "./SecondaryMarket.css";
import { ASSET_CLASS_COLOURS, formatEur } from "../utils";

const API_BASE = "http://localhost:8000";
const API_KEY  = "pvr-key-alphawealth-001";

// Confirmation modal shown when the user clicks Buy
function BuyModal({ listing, onConfirm, onCancel }) {
  const totalCost = listing.asking_price + listing.commission_amount;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Purchase</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <p className="modal-fund-name">{listing.fund_name}</p>

        <div className="modal-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-label">Original Investment</span>
            <span className="breakdown-value muted">{formatEur(listing.original_investment)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Asking Price</span>
            <span className="breakdown-value">{formatEur(listing.asking_price)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">
              Privora Commission ({listing.commission_pct}%)
            </span>
            <span className="breakdown-value cost">{formatEur(listing.commission_amount)}</span>
          </div>
          <div className="breakdown-divider" />
          <div className="breakdown-row breakdown-total">
            <span className="breakdown-label">Total Cost</span>
            <span className="breakdown-value total">{formatEur(totalCost)}</span>
          </div>
        </div>

        <p className="modal-disclaimer">
          By confirming, you agree to acquire this ELTIF position at the stated price plus the
          Privora secondary market commission. Settlement is subject to ELTIF transfer regulations.
        </p>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-buy-confirm" onClick={() => onConfirm(listing)}>
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

// Success toast shown briefly after a confirmed purchase
function SuccessToast({ listing, onDismiss }) {
  return (
    <div className="success-toast">
      <span className="toast-icon">✓</span>
      <div className="toast-text">
        <strong>Purchase confirmed</strong>
        <span>{listing.fund_name} — {formatEur(listing.asking_price + listing.commission_amount)}</span>
      </div>
      <button className="toast-dismiss" onClick={onDismiss}>✕</button>
    </div>
  );
}

// Individual listing card
function ListingCard({ listing, onBuy }) {
  const accent   = ASSET_CLASS_COLOURS[listing.asset_class] ?? { bg: "#f3f4f6", text: "#374151" };
  const totalCost = listing.asking_price + listing.commission_amount;

  // discount_pct > 0 means a discount on original price; 0 means at/above par
  const hasDiscount = listing.discount_pct > 0;
  const isPremium   = listing.asking_price > listing.original_investment;

  return (
    <div className="listing-card">
      <div className="listing-card-header">
        <div className="listing-badges">
          <span
            className="badge badge-asset"
            style={{ backgroundColor: accent.bg, color: accent.text }}
          >
            {listing.asset_class}
          </span>
          {hasDiscount && (
            <span className="badge badge-discount">−{listing.discount_pct}% discount</span>
          )}
          {isPremium && !hasDiscount && (
            <span className="badge badge-premium">+{((listing.asking_price / listing.original_investment - 1) * 100).toFixed(1)}% premium</span>
          )}
        </div>
        <h2 className="listing-fund-name">{listing.fund_name}</h2>
        <p className="listing-seller">Seller: <code>{listing.seller_id}</code></p>
      </div>

      <div className="listing-prices">
        <div className="price-col">
          <span className="price-label">Original Investment</span>
          <span className="price-value muted">{formatEur(listing.original_investment)}</span>
        </div>
        <div className="price-arrow">→</div>
        <div className="price-col">
          <span className="price-label">Asking Price</span>
          <span className={`price-value ${hasDiscount ? "price-green" : isPremium ? "price-amber" : ""}`}>
            {formatEur(listing.asking_price)}
          </span>
        </div>
      </div>

      <div className="listing-commission">
        <div className="commission-row">
          <span className="commission-label">
            Privora Commission ({listing.commission_pct}%)
          </span>
          <span className="commission-value">{formatEur(listing.commission_amount)}</span>
        </div>
        <div className="commission-row total-cost-row">
          <span className="commission-label total-cost-label">Total Cost (all-in)</span>
          <span className="commission-value total-cost-value">{formatEur(totalCost)}</span>
        </div>
      </div>

      <button className="btn-buy" onClick={() => onBuy(listing)}>
        Buy Position
      </button>
    </div>
  );
}

// Fetches available secondary listings and manages the buy modal and toast flow
function SecondaryMarket() {
  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [modalListing, setModalListing] = useState(null);  // listing being purchased
  const [toast, setToast]         = useState(null);         // last confirmed listing

  useEffect(() => {
    fetch(`${API_BASE}/secondary-market`, { headers: { "X-API-Key": API_KEY } })
      .then((r) => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then((data) => {
        // Backend already filters to available, but guard client-side too
        setListings(data.filter((l) => l.status === "available"));
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  // Opens the purchase confirmation modal for a listing
  function handleBuyClick(listing) {
    setModalListing(listing);
  }

  // Removes the purchased listing from state and shows the success toast
  function handleConfirm(listing) {
    setModalListing(null);
    setToast(listing);
    // Remove purchased listing from the visible order book
    setListings((prev) => prev.filter((l) => l.listing_id !== listing.listing_id));
  }

  return (
    <div className="page secondary-market-page">
      <div className="sm-header">
        <div>
          <h1>Secondary Market</h1>
          <p className="page-subtitle">
            Acquire existing ELTIF positions from other investors — Privora charges a{" "}
            <strong>1.5% commission</strong> on each secondary transaction
          </p>
        </div>
      </div>

      {toast && (
        <SuccessToast listing={toast} onDismiss={() => setToast(null)} />
      )}

      {loading && (
        <div className="state-container">
          <div className="spinner" />
          <p className="state-message">Loading listings…</p>
        </div>
      )}

      {error && (
        <div className="state-container error-state">
          <p className="state-message">⚠ Could not load listings: {error}</p>
          <p className="state-hint">Make sure the Privora API is running on port 8000.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="results-count">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} available
          </p>
          <div className="listings-grid">
            {listings.map((l) => (
              <ListingCard key={l.listing_id} listing={l} onBuy={handleBuyClick} />
            ))}
          </div>
          {listings.length === 0 && (
            <div className="state-container">
              <p className="state-message">No listings available at this time.</p>
            </div>
          )}
        </>
      )}

      {modalListing && (
        <BuyModal
          listing={modalListing}
          onConfirm={handleConfirm}
          onCancel={() => setModalListing(null)}
        />
      )}
    </div>
  );
}

export default SecondaryMarket;
