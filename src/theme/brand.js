/**
 * CinCin brand tokens — single source of truth.
 *
 * Source: CinCin Brand Guidelines v1 (primary palette + app mockups).
 * Tailwind (tailwind.config.js) builds the `cin-*` colour classes from this
 * file, and anything that can't use a class (Recharts, <canvas>, inline
 * styles) should import from here rather than hard-coding hex values.
 *
 * Where the guide's "Button details" table disagrees with its rendered
 * buttons and app screens, the rendered values win (e.g. gold is #CBA135,
 * not #D89A3A).
 */

export const palette = {
  // Primary palette (guide §3.1)
  espresso: '#2E2420',
  merlot: '#63192B',
  gold: '#CBA135',
  cream: '#F0E6D2',

  // Shades used throughout the app mockups
  espressoDeep: '#241C18', // page background; text on gold buttons
  espressoRaised: '#2A201B', // inputs / nav bar
  creamLight: '#F3ECDD', // headings, text on merlot
  merlotBright: '#7A1F3B', // secondary button hover
  merlotLight: '#8C2F45', // merlot on cream (light mode)
  goldDeep: '#D68F2E', // secondary palette amber
};

/** Semantic colours for the dark ("Original") theme. */
export const colors = {
  espresso: palette.espressoDeep, // app background, text on gold
  surface: palette.espressoRaised, // inputs, bottom nav, sunken areas
  card: palette.espresso, // cards and list rows
  border: '#4A3F38',
  muted: '#9C8F85', // secondary text — 5.3:1 on espresso (WCAG AA)
  text: '#DDD2C0', // body copy
  cream: palette.creamLight, // headings and high-emphasis text
  gold: palette.gold, // primary accent / primary actions
  goldDim: 'rgba(203,161,53,0.15)',
  merlot: palette.merlot, // secondary actions, badges
  merlotBright: palette.merlotBright,
  wine: '#B4475F', // merlot that reads on espresso (charts, dots, text)
  green: '#8FBF7A', // success / matched
  red: '#E8796B', // errors / destructive
  orange: palette.goldDeep, // warnings / sponsored
};

/** Per-drink-type swatches (category dots, chart series). */
export const drinkColors = {
  WINE: colors.wine,
  BEER: colors.gold,
  SPIRITS: colors.orange,
  OTHER: colors.muted,
};

/** rgba() helper for a hex colour. */
export function alpha(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const fonts = {
  // Wordmark: Poppins ExtraBold; tagline: Poppins Medium; UI: Poppins.
  family: '"Poppins", system-ui, -apple-system, "Segoe UI", sans-serif',
};
