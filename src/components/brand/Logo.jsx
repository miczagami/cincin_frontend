import { LOGO_PATHS, MARK_BOX, WORDMARK_BOX, STACKED_BOX } from './logoPaths';
import { palette } from '../../theme/brand';

// Horizontal lockup: wordmark at 1.4x, letter bodies centred on the mark.
const H_SCALE = 1.4;
const H_X = MARK_BOX.x + MARK_BOX.w + 80;
const H_Y = 103 - 315.5 * H_SCALE;
const HORIZONTAL_BOX = {
  x: MARK_BOX.x,
  y: Math.floor(H_Y + 222.7 * H_SCALE) - 1,
  w: Math.ceil(H_X + 568 * H_SCALE - MARK_BOX.x) + 1,
  h: Math.ceil((411.7 - 222.7) * H_SCALE) + 2,
};

const BOXES = {
  mark: MARK_BOX,
  wordmark: WORDMARK_BOX,
  stacked: STACKED_BOX,
  horizontal: HORIZONTAL_BOX,
};

/**
 * CinCin logo (brand guidelines v1, "Logo Variation").
 *
 * variant:  'stacked' (main logo) | 'horizontal' | 'mark' (icon only) | 'wordmark' (text only)
 * tone:     'light' — cream ink for espresso/merlot backgrounds (default)
 *           'dark'  — espresso ink for cream/gold backgrounds
 * wine:     keep the merlot/gold wine fills (set false for the single-colour mark)
 *
 * Size it with `height` or `width` (px) or a className. Don't render the
 * horizontal lockup narrower than 120px — use variant="mark" instead.
 */
export default function Logo({
  variant = 'stacked',
  tone = 'light',
  wine = true,
  title = 'CinCin',
  height,
  width,
  className = '',
  ...props
}) {
  const box = BOXES[variant] || STACKED_BOX;
  const ink = tone === 'dark' ? palette.espresso : palette.cream;
  const showMark = variant !== 'wordmark';
  const showWord = variant !== 'mark';

  const mark = showMark && (
    <>
      <path fill={ink} d={LOGO_PATHS.glass} />
      {wine && <path fill={palette.merlot} d={LOGO_PATHS.merlot} />}
      {wine && <path fill={palette.gold} d={LOGO_PATHS.gold} />}
    </>
  );
  const word = showWord && <path fill={ink} d={LOGO_PATHS.word} />;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      role="img"
      aria-label={title}
      height={height}
      width={width}
      className={className}
      {...props}
    >
      {mark}
      {variant === 'horizontal'
        ? <g transform={`translate(${H_X} ${H_Y}) scale(${H_SCALE})`}>{word}</g>
        : word}
    </svg>
  );
}

/**
 * Draw the logo ('stacked' | 'mark' | 'wordmark') onto a 2D canvas, centred at (cx, top), `width` px wide.
 * Returns the drawn height.
 */
export function drawLogo(ctx, { cx, top, width, tone = 'light', variant = 'stacked' }) {
  const box = BOXES[variant] || STACKED_BOX;
  const s = width / box.w;
  const ink = tone === 'dark' ? palette.espresso : palette.cream;
  ctx.save();
  ctx.translate(cx - width / 2 - box.x * s, top - box.y * s);
  ctx.scale(s, s);
  if (variant !== 'wordmark') {
    ctx.fillStyle = ink; ctx.fill(new Path2D(LOGO_PATHS.glass));
    ctx.fillStyle = palette.merlot; ctx.fill(new Path2D(LOGO_PATHS.merlot));
    ctx.fillStyle = palette.gold; ctx.fill(new Path2D(LOGO_PATHS.gold));
  }
  if (variant !== 'mark') {
    ctx.fillStyle = ink; ctx.fill(new Path2D(LOGO_PATHS.word));
  }
  ctx.restore();
  return box.h * s;
}
