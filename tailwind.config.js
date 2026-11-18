import { colors } from './src/theme/brand.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Brand palette — see src/theme/brand.js (CinCin Brand Guidelines v1)
      colors: {
        'cin-espresso': colors.espresso,
        'cin-surface': colors.surface,
        'cin-card': colors.card,
        'cin-border': colors.border,
        'cin-muted': colors.muted,
        'cin-text': colors.text,
        'cin-cream': colors.cream,
        'cin-gold': colors.gold,
        'cin-gold-dim': colors.goldDim,
        'cin-merlot': colors.merlot,
        'cin-merlot-bright': colors.merlotBright,
        'cin-wine': colors.wine,
        'cin-green': colors.green,
        'cin-red': colors.red,
        'cin-orange': colors.orange,
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        cin: '16px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-up': 'slide-up 0.45s ease-out both',
      },
    },
  },
  plugins: [],
};
