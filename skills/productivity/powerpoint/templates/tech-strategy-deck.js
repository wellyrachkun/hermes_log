// Template: Technical strategy deck — multi-section presentation
// Use case: strategy docs, architecture decisions, migration plans, proposals
// Style: Ocean Gradient (dark navy + cyan accent), Georgia/Calibri fonts
// Structure: Cover → Agenda → Context → Options → Deep-dive → Comparison → Timeline → Conclusion
// Requires: pptxgenjs, react-icons/fa, react, react-dom/server, sharp

const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaRocket, FaDatabase, FaCodeBranch, FaExchangeAlt, FaLightbulb,
  FaCheckCircle, FaTimesCircle, FaArrowRight, FaChartLine,
  FaServer, FaHistory, FaUserFriends, FaBolt, FaShieldAlt
} = require("react-icons/fa");

// —— Icon helpers ——
function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}
async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// —— Color Palette ——
const C = {
  bg:       "0F172A",   // deep navy (title/section slides)
  bgLight:  "1E293B",   // slate dark (content cards on dark bg)
  surface:  "FFFFFF",   // white (content slides)
  accent:   "0891B2",   // cyan (primary accent)
  accent2:  "06B6D4",   // bright cyan (title slide text)
  text:     "1E293B",   // dark text on light bg
  muted:    "64748B",   // muted/gray text
  green:    "059669",   // positive/success
  red:      "DC2626",   // negative/danger
  amber:    "D97706",   // warning/caution
  border:   "E2E8F0",   // subtle borders/dividers
  off:      "F1F5F9",   // off-white card backgrounds
};

// Always use factory for shadows to avoid mutation pitfall
const makeShadow = () => ({
  type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.12
});

async function buildDeck(pres) {
  // Pre-render icons (batch all needed icons upfront)
  // ... icon rendering code ...

  // — SLIDE PATTERNS —

  // 1. TITLE SLIDE: dark bg, centered icon + title + subtitle + divider + meta
  // 2. AGENDA: light bg, numbered circles + item labels
  // 3. BIG STATS: 4 cards in a row (icon + number + label)
  // 4. THREE OPTIONS: 3 side-by-side cards with letter badges, pros/cons
  // 5. SECTION DIVIDER: dark bg, large icon + section number + title
  // 6. REASON DEEP-DIVE: number badge + title + explanation cards + callout bar
  // 7. COMPARISON TABLE: header + alternating row bg
  // 8. PROBLEM GRID: 2×3 cards with accent bars + number badges
  // 9. DECISION TREE: condition → action cards in row
  // 10. TIMELINE: phase cards above timeline bar with dots
  // 11. CONCLUSION: dark bg, two-column summary + bottom callout

  // Full working example: see build_ppt.js in this templates/ directory
  // Key measurements:
  //   Slide: 10" × 5.625" (LAYOUT_16x9)
  //   Minimum margin from edge: 0.5"
  //   Accent bar at top of every slide: x:0, y:0, w:10, h:0.06
  //   Title: x:0.6, y:0.3, w:8.8, h:0.6, fontSize:24-28, Georgia bold
  //   Number badge (circle): diam 1.2-1.4", filled accent, white Georgia text
  //   Card shadow: use makeShadow() factory — never reuse object
  //   Icons: 0.4-0.8" display, rendered at size 256 for crispness

  await pres.writeFile({ fileName: "output.pptx" });
}
