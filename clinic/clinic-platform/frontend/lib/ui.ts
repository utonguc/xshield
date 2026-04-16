/**
 * Shared responsive style helpers.
 * All touch targets ≥ 48px, inputs use 16px font (prevents iOS auto-zoom).
 */
import type { CSSProperties } from "react";

export const inp: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d0d5dd",
  background: "var(--surface, white)",
  color: "var(--text, #101828)",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
  minHeight: 48,
  fontFamily: "inherit",
  WebkitAppearance: "none",
  appearance: "none",
};

export const btn = (
  color: string,
  background: string,
  border?: string,
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 12,
  border: border ?? "none",
  background,
  color,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  whiteSpace: "nowrap",
  userSelect: "none",
  WebkitUserSelect: "none",
  flexShrink: 0,
});
