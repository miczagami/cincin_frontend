/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'cin-black': '#0A0A0A',
        'cin-dark': '#141414',
        'cin-card': '#1A1A1A',
        'cin-border': '#2A2A2A',
        'cin-muted': '#888888', // Priority 6: bumped from #666666 for WCAG AA 4.5:1 contrast
        'cin-text': '#CCCCCC',
        'cin-white': '#FFFFFF',
        'cin-cyan': '#22D3EE',
        'cin-cyan-dim': 'rgba(34,211,238,0.15)',
        'cin-green': '#4ADE80',
        'cin-red': '#F87171',
        'cin-orange': '#FB923C',
      },
      fontFamily: {
        display: ['"Instrument Sans"', '"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'cin': '12px',
      },
    },
  },
  plugins: [],
};
