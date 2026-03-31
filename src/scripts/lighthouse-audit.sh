#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# CinCin Lighthouse Audit Runner — Priority 6 (Phase 5)
# 
# Runs Lighthouse CI against the local dev server and outputs 
# a JSON report + HTML report to ./lighthouse-reports/.
#
# Prerequisites:
#   npm install -D @lhci/cli
#   (or: npx @lhci/cli autorun)
#
# Usage:
#   chmod +x scripts/lighthouse-audit.sh
#   ./scripts/lighthouse-audit.sh
#
# Expects the frontend dev server on http://localhost:3000
# and the backend on http://localhost:4000.
# ═══════════════════════════════════════════════════════════════

set -e

REPORT_DIR="./lighthouse-reports"
URL="${1:-http://localhost:3000}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "╔═══════════════════════════════════════════╗"
echo "║  CinCin Lighthouse Audit — Priority 6     ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Target URL: $URL"
echo "Reports:    $REPORT_DIR/"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Check if lighthouse is available
if ! npx lighthouse --version > /dev/null 2>&1; then
  echo "Installing Lighthouse..."
  npm install -D lighthouse
fi

echo "Running Lighthouse audit (mobile)..."
echo ""

npx lighthouse "$URL" \
  --output json \
  --output html \
  --output-path "$REPORT_DIR/mobile-$TIMESTAMP" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --preset=perf \
  --form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --only-categories=performance,accessibility,best-practices,pwa \
  --quiet

echo ""
echo "Running Lighthouse audit (desktop)..."
echo ""

npx lighthouse "$URL" \
  --output json \
  --output html \
  --output-path "$REPORT_DIR/desktop-$TIMESTAMP" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --form-factor=desktop \
  --throttling.cpuSlowdownMultiplier=1 \
  --only-categories=performance,accessibility,best-practices,pwa \
  --quiet

echo ""
echo "═══════════════════════════════════════════"
echo "Audit complete!"
echo ""
echo "Reports saved to:"
echo "  Mobile:  $REPORT_DIR/mobile-$TIMESTAMP.report.html"
echo "  Desktop: $REPORT_DIR/desktop-$TIMESTAMP.report.html"
echo ""

# Extract scores from JSON
echo "── Mobile Scores ──"
node -e "
  const r = require('./$REPORT_DIR/mobile-$TIMESTAMP.report.json');
  const cats = r.categories;
  console.log('  Performance:     ' + Math.round(cats.performance.score * 100));
  console.log('  Accessibility:   ' + Math.round(cats.accessibility.score * 100));
  console.log('  Best Practices:  ' + Math.round(cats['best-practices'].score * 100));
  console.log('  PWA:             ' + Math.round(cats.pwa.score * 100));
  const allAbove90 = Object.values(cats).every(c => c.score >= 0.9);
  console.log('');
  console.log(allAbove90 ? '  ✅ ALL SCORES 90+ — Phase 5 exit criteria MET' : '  ⚠️  Some scores below 90 — review report for details');
" 2>/dev/null || echo "  (Install Node.js to see inline scores)"

echo ""
echo "═══════════════════════════════════════════"
