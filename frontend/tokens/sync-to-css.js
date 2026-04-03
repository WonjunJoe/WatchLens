#!/usr/bin/env node
/**
 * Tokens Studio JSON → CSS 변수 + chartConfig.ts 변환 스크립트
 *
 * 사용법:
 *   node tokens/sync-to-css.js
 *
 * Figma에서 Tokens Studio로 토큰 수정 → JSON 내보내기 →
 * tokens/tokens.json 덮어쓰기 → 이 스크립트 실행 →
 * index.css + chartConfig.ts 자동 업데이트
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(__dirname, "tokens.json"), "utf-8"));

// ─── 1. CSS 변수 생성 ───

const cssLines = [];

// Colors
const { bg, text, border, accent, status } = tokens.color;
cssLines.push(`  --bg: ${bg.default.value};`);
cssLines.push(`  --bg-subtle: ${bg.subtle.value};`);
cssLines.push(`  --surface: ${bg.surface.value};`);
cssLines.push(`  --text-primary: ${text.primary.value};`);
cssLines.push(`  --text-secondary: ${text.secondary.value};`);
cssLines.push(`  --text-tertiary: ${text.tertiary.value};`);
cssLines.push(`  --border: ${border.default.value};`);
cssLines.push(`  --border-strong: ${border.strong.value};`);
cssLines.push(`  --accent: ${accent.default.value};`);
cssLines.push(`  --accent-hover: ${accent.hover.value};`);
cssLines.push(`  --accent-light: ${accent.light.value};`);
cssLines.push(`  --accent-glow: ${accent.glow.value};`);
cssLines.push(`  --green: ${status.green.value};`);
cssLines.push(`  --green-light: ${status["green-light"].value};`);
cssLines.push(`  --amber: ${status.amber.value};`);
cssLines.push(`  --amber-light: ${status["amber-light"].value};`);
cssLines.push(`  --rose: ${status.rose.value};`);
cssLines.push(`  --rose-light: ${status["rose-light"].value};`);

// Shadows
const { shadow } = tokens;
cssLines.push(`  --shadow-sm: ${shadow.sm.value};`);
cssLines.push(`  --shadow-md: ${shadow.md.value};`);
cssLines.push(`  --shadow-lg: ${shadow.lg.value};`);

const cssBlock = `:root {\n${cssLines.join("\n")}\n}`;

// index.css 의 :root 블록만 교체
const cssPath = join(__dirname, "..", "src", "index.css");
let css = readFileSync(cssPath, "utf-8");
css = css.replace(/:root\s*\{[^}]*\}/, cssBlock);
writeFileSync(cssPath, css, "utf-8");
console.log("✓ src/index.css :root 블록 업데이트 완료");

// body gradient 교체
const gradStart = bg["gradient-start"].value;
const gradMid = bg["gradient-mid"].value;
const gradEnd = bg["gradient-end"].value;
const gradientRegex = /linear-gradient\(160deg,[^)]+\)/;
css = readFileSync(cssPath, "utf-8");
css = css.replace(gradientRegex, `linear-gradient(160deg, ${gradStart} 0%, ${gradMid} 50%, ${gradEnd} 100%)`);
writeFileSync(cssPath, css, "utf-8");
console.log("✓ body gradient 업데이트 완료");

// ─── 2. chartConfig.ts 생성 ───

const chart = tokens.color.chart;
const chartTs = `export const PASTEL_COLORS = [
  "${chart.blue.value}", // primary blue
  "${chart.violet.value}", // violet
  "${chart["light-violet"].value}", // light violet
  "${chart.cyan.value}", // cyan
  "${chart.emerald.value}", // emerald
  "${chart.amber.value}", // amber
  "${chart.slate.value}", // neutral slate
];

export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(8px)",
  borderRadius: "${tokens.borderRadius.md.value}px",
  border: "1px solid ${border.default.value}",
  boxShadow: "${shadow.tooltip.value}",
  fontSize: "${tokens.font.size.base.value}px",
  padding: "10px 14px",
  color: "${text.primary.value}",
};

export const GRID_STROKE = "${chart.grid.value}";

export const AXIS_TICK = {
  fontSize: ${tokens.font.size.xs.value},
  fill: "${text.tertiary.value}",
  fontWeight: ${tokens.font.weight.medium.value},
};
`;

const chartPath = join(__dirname, "..", "src", "utils", "chartConfig.ts");
writeFileSync(chartPath, chartTs, "utf-8");
console.log("✓ src/utils/chartConfig.ts 업데이트 완료");

console.log("\n동기화 완료! 변경된 파일:");
console.log("  - src/index.css");
console.log("  - src/utils/chartConfig.ts");
