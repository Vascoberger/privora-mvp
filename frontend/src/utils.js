// Shared formatting utilities and design constants used across pages

export const ASSET_CLASS_COLOURS = {
  "Infrastructure":  { bg: "#dbeafe", text: "#1d4ed8" },
  "Private Credit":  { bg: "#fef3c7", text: "#b45309" },
  "Real Estate":     { bg: "#ede9fe", text: "#6d28d9" },
  "Private Equity":  { bg: "#fce7f3", text: "#be185d" },
  "Natural Capital": { bg: "#dcfce7", text: "#15803d" },
};

// Format a number as EUR with two decimal places (e.g. 10123.5 → "€10,123.50")
export function formatEur(n) {
  return "€" + Number(n).toLocaleString("en-EU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format a number as whole euros with no decimals (e.g. 85000 → "€85,000")
export function formatEurInt(n) {
  return "€" + Number(n).toLocaleString("en-EU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
