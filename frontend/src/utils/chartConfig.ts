export const PASTEL_COLORS = [
  "var(--accent-lavender)",
  "var(--accent-mint)",
  "var(--accent-sky)",
  "var(--accent-rose)",
  "var(--accent-peach)",
];

export const CHART_GRADIENTS = {
  lavender: ["rgba(190, 176, 217, 0.5)", "rgba(190, 176, 217, 0)"],
  mint: ["rgba(163, 212, 198, 0.5)", "rgba(163, 212, 198, 0)"],
  sky: ["rgba(165, 200, 220, 0.5)", "rgba(165, 200, 220, 0)"],
  rose: ["rgba(235, 179, 174, 0.5)", "rgba(235, 179, 174, 0)"],
  peach: ["rgba(240, 200, 172, 0.5)", "rgba(240, 200, 172, 0)"],
};

export const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-glass)",
  backdropFilter: "blur(12px)",
  borderRadius: "20px",
  border: "1px solid var(--border-glass)",
  boxShadow: "var(--shadow-glass)",
  fontSize: "13px",
  padding: "12px 16px",
  color: "var(--text-primary)",
  fontWeight: "bold",
};

export const GRID_STROKE = "var(--border-subtle)";

export const AXIS_TICK = { 
  fontSize: 11, 
  fill: "var(--text-tertiary)", 
  fontWeight: "bold",
  letterSpacing: "0.05em",
};

export const AREA_FILL_OPACITY = 0.4;
