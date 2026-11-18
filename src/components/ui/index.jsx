import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Brand button (guide §4.1).
 *   primary   — gold; the one main action on screen
 *   secondary — merlot; a second important action
 *   outline   — cream outline; tertiary action
 *   text      — gold text link (e.g. "Skip for now →")
 *   ghost     — muted text; back links / quiet actions
 */
const BUTTON_VARIANTS = {
  primary: 'cin-btn-primary',
  secondary: 'cin-btn-outline',
  outline: 'cin-btn-outline',
  text: 'cin-btn-text',
  ghost: 'cin-btn-ghost',
};

export function Button({ variant = 'primary', loading, children, className = '', ...props }) {
  const base = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  return (
    <button className={`${base} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="cin-label">{label}</label>}
    <input ref={ref} className={`cin-input ${error ? 'border-cin-red/50' : ''} ${className}`} {...props} />
    {error && <p className="text-xs text-cin-red mt-1">{error}</p>}
  </div>
));
Input.displayName = 'Input';

export function Card({ interactive, gradient, className = '', children, ...props }) {
  const cls = [
    interactive ? 'cin-card-interactive' : 'cin-card',
    gradient === 'hero' && 'cin-gradient-card',
    gradient === 'sponsor' && 'cin-gradient-sponsor',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} {...props}>{children}</div>;
}

export function Pill({ color = 'gold', children, className = '', ...props }) {
  const colors = {
    gold: 'bg-cin-gold-dim text-cin-gold',
    merlot: 'bg-cin-merlot text-cin-cream',
    green: 'bg-cin-green/15 text-cin-green',
    red: 'bg-cin-red/15 text-cin-red',
    orange: 'bg-cin-orange/15 text-cin-orange',
    muted: 'bg-cin-surface text-cin-muted border border-cin-border',
  };
  return <span className={`cin-pill ${colors[color] || colors.gold} ${className}`} {...props}>{children}</span>;
}

export function Eyebrow({ children }) {
  return <div className="cin-eyebrow">{children}</div>;
}

export function Toggle({ checked, onChange }) {
  return (
    <div
      className={`cin-toggle ${checked ? 'bg-cin-gold' : 'bg-cin-border'}`}
      onClick={() => onChange?.(!checked)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange?.(!checked); } }}
      role="switch"
      tabIndex={0}
      aria-checked={checked}
    >
      <div className="cin-toggle-knob" style={{ left: checked ? 23 : 3 }} />
    </div>
  );
}

export function Divider({ text }) {
  return (
    <div className="cin-divider">
      <span className="text-xs text-cin-muted font-body">{text}</span>
    </div>
  );
}

export function ScreenHeader({ title, subtitle, back, onBack }) {
  return (
    <div className="px-5 pt-2 pb-3">
      {back && (
        <button onClick={onBack} className="cin-btn-ghost mb-2 text-sm">
          ← {back}
        </button>
      )}
      <h1 className="text-[26px] font-display font-extrabold text-cin-cream leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-cin-muted font-body mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Avatar({ name, size = 32, accent = false }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-bold ${accent ? 'bg-cin-merlot text-cin-cream' : 'bg-cin-border text-cin-text'}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export function Spinner({ size = 24 }) {
  return <Loader2 className="animate-spin text-cin-gold" style={{ width: size, height: size }} />;
}

export function Skeleton({ width, height = 16, className = '' }) {
  return <div className={`cin-skeleton ${className}`} style={{ width: width || '100%', height }} />;
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-display font-bold text-cin-cream">{title}</h3>
      {subtitle && <p className="text-sm text-cin-muted mt-2 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
