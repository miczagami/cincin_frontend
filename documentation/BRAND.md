# Brand in the app

The app follows **CinCin Brand Guidelines v1** (Espresso, Merlot, Gold, Cream; Poppins; "play your palate").

## Where things live

| What | Where |
|---|---|
| Colour tokens (single source of truth) | `src/theme/brand.js` |
| Tailwind classes built from them | `tailwind.config.js` → `cin-espresso`, `cin-surface`, `cin-card`, `cin-border`, `cin-muted`, `cin-text`, `cin-cream`, `cin-gold`, `cin-gold-dim`, `cin-merlot`, `cin-merlot-bright`, `cin-wine`, `cin-green`, `cin-red`, `cin-orange` |
| Component styles (buttons, inputs, cards) | `src/styles/global.css` |
| Focus rings, reduced motion, skip link | `src/styles/a11y.css` (imported by global.css) |
| Logo component | `src/components/brand/Logo.jsx`: `<Logo variant="stacked\|horizontal\|mark\|wordmark" tone="light\|dark" />` |
| Logo on `<canvas>` (share cards) | `drawLogo(ctx, {...})` from the same file |
| Static logo files / icons | `public/brand/*.svg`, `public/favicon.svg`, `public/icon-*.png`, `public/apple-touch-icon.png`, `public/badge-72.png` |

Don't hard-code hex values in components. Use a `cin-*` class, or import `colors` / `alpha()` from `src/theme/brand.js` when you need a value in JS (Recharts, canvas, inline styles).

## Buttons (`<Button variant=…>`)

| Variant | Look | Use for |
|---|---|---|
| `primary` | Gold pill, espresso text | The one main action on screen |
| `secondary` | Merlot pill, cream text | A second important action ("Join Cellar Club") |
| `outline` | Cream outline, gold on hover | Tertiary actions ("Join with a code", "Play Again") |
| `text` | Gold text | Low-emphasis links ("Skip for now →") |
| `ghost` | Muted text | Back links and quiet actions |

Large buttons are 52px tall and full-width by default.

## Notes on the guideline PDF

- Its "Button details" table lists `#D89A3A` for primary and `#7A1F3B` for secondary, but every rendered button and app mockup uses Gold `#CBA135` and Merlot `#63192B`. The app follows the rendered designs. `#7A1F3B` is used as the secondary button's hover colour.
- The table also swaps the text-button colours. The examples show gold on dark and merlot on light, and the app follows the examples.
- The guide's mockup muted grey `#8A7D73` is 4.2:1 on espresso, which fails WCAG AA. The app uses `#9C8F85` (5.3:1) instead.
- Light ("Cream") mode is described in the guide but not built yet. The tokens are named by brand role, so a light theme would need a semantic layer on top of them.
- The secondary palette in the PDF is still "To be added".

## Voice

Playful, direct, social: "Play your palate", not "Track your tastings". Write for the group at the table: "your table's notes", not "your data".
