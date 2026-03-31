# Priority 2 — Complete the Palate Profile Experience

## Summary

Priority 2 completes three visual/sharing stubs that were deferred from Phase 4:

1. **Recharts trend chart** — replaces the CSS bar chart in PalateProfilePage
2. **Palate Wrapped image generation** — replaces text-only share in PalateWrappedPage
3. **Season-end shareable card** — replaces text-only share in SeasonEndPage

Plus a bonus fix: the SeasonEndPage "New Season (Modified)" option now opens a
proper season config overlay instead of falling through to same-settings.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/palate/PalateProfilePage.jsx` | **Updated** — CSS bar chart → Recharts AreaChart + LineChart |
| `src/pages/palate/PalateWrappedPage.jsx` | **Updated** — text share → canvas image generation + Web Share API |
| `src/pages/clubs/SeasonEndPage.jsx` | **Updated** — text share → canvas image generation + season config overlay |
| `src/context/palateStore.js` | **Updated** — removed `shareWrapped()` (sharing now in component) |

---

## Detailed Changes

### 1. PalateProfilePage — Recharts Trend Chart

**Before:** Simple CSS `<div>` bars with fixed height percentages. No axis labels,
no tooltips, no data on hover.

**After:** Full Recharts `<AreaChart>` with:
- Cyan gradient fill under the accuracy line
- X-axis (game numbers: G1, G2, ...) and Y-axis (0–100%)
- Custom tooltip showing game number, accuracy %, correct/total, and date
- Dashed average reference line across the chart
- 3-game moving average overlay (green dashed line) for smoothed trend
- Legend at bottom identifying both lines
- `<ResponsiveContainer>` for proper sizing on all screen widths

**New dependency:** `recharts` (already listed in package.json from Phase 2 setup).

### 2. PalateWrappedPage — Canvas Image Generation

**Before:** Text-only Web Share API share with just a string describing stats.
`cardRef` was attached to an HTML preview div but never used for rendering.

**After:** Full client-side canvas rendering pipeline:
- Renders a 1080×1920px (Instagram Story aspect ratio) PNG card
- Design matches CinCin brand: dark background, cyan accents, gradient glow
- Card includes: CinCin branding, period label, big stat row (games/accuracy/best),
  strengths with gradient bars, weaknesses, drink type breakdown with emoji,
  mini sparkline trend, and footer CTA
- Shares via Web Share API with file support (`navigator.canShare({ files })`)
- Falls back to text-only share if file sharing unavailable
- Falls back to PNG download if Web Share API unavailable
- On-screen HTML preview card remains for the in-app viewing experience

**No S3 upload needed** — everything is generated client-side, keeping the
architecture simple and avoiding backend changes.

### 3. SeasonEndPage — Shareable Summary Card + Season Config

**Before:** Text-only `navigator.share()` with just champion name and score.
"New Season (Modified)" clicked the same handler as "Same Settings".

**After:**
- Canvas-based 1080×1350px PNG card with: club name, season label,
  champion spotlight with crown, awards list, top 5 final standings
- Same share cascade as PalateWrappedPage (file → text → download)
- New `<SeasonConfigOverlay>` component: bottom sheet with season type
  selector (Fixed Length / Fixed Date / Rolling) and length picker (30–180 days)
- "New Season (Modified)" now opens the overlay instead of falling through

---

## Integration Guide

### Drop-in replacements
All four files are drop-in replacements for their existing counterparts.
No new files need to be created, no routes need changing.

### Dependencies
`recharts` must be available. It should already be in `package.json` from
Phase 2 setup, but verify with:

```bash
npm ls recharts
# If missing:
npm install recharts
```

### Verify

| Feature | How to test |
|---------|-------------|
| Trend chart renders | Navigate to Palate Profile with a Pro account that has 3+ games |
| Tooltip shows on hover/tap | Tap any data point on the trend chart |
| Moving average line appears | Visible after 3+ data points (green dashed line) |
| Wrapped card generates | Navigate to Palate Wrapped, confirm canvas renders |
| Wrapped image shares | Tap "Share as Image" — on iOS/Android should open share sheet with PNG |
| Wrapped image downloads | On desktop browser, should download PNG file |
| Season card shares | End a season in a Cellar Club, tap "Share Results as Image" |
| Modified season config | As admin, in decision phase tap "New Season (Modified)" |
| Season type selector | All three types selectable in the overlay |
| Length picker | Visible only when Fixed Length is selected |
