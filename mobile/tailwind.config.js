/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────
        primary:    '#6FD3B6', // mint
        secondary:  '#FF9DB0', // pink
        success:    '#9BE3CE', // mint2
        warning:    '#FFC078', // peach
        danger:     '#FF8FA0', // pink-red

        // ── Mint accents ───────────────────────────────
        'mint-ink':   '#2E9E83',
        'mint-deep':  '#46B493',
        'peach-ink':  '#E6932F',
        'pink-ink':   '#E76C86',
        'sky-ink':    '#3F8DD6',
        'yellow-ink': '#D9A100',

        // ── Surfaces ───────────────────────────────────
        background: '#EFFAF4',
        surface:    '#FFFFFF',
        'surface-alt': '#E7F7F0',

        // ── Text ───────────────────────────────────────
        'text-primary':   '#34514A',
        'text-secondary': '#7E9A90',
        'text-muted':     '#B4CFC5',

        // ── Feature ────────────────────────────────────
        diet:    '#6FD3B6', // mint
        workout: '#FFAE96', // warm peach
        stats:   '#FFD36E', // yellow
        water:   '#8FC7F5', // sky blue
        border:  '#D6F0E6',
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 10px 24px rgba(78,191,160,0.20)',
        'card-sm': '0 6px 14px rgba(78,191,160,0.16)',
      },
    },
  },
  plugins: [],
};
