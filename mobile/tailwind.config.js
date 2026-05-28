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
        primary:    '#B4A7E8', // soft lavender
        secondary:  '#F4ADAD', // soft coral
        success:    '#A8DCC8', // mint
        warning:    '#FFCBA4', // warm peach
        danger:     '#F4ADAD', // soft coral

        // ── Surfaces ───────────────────────────────────
        background: '#FFF8F2', // warm cream
        surface:    '#FFFFFF',
        'surface-alt': '#FFF3EC', // light cream

        // ── Text ───────────────────────────────────────
        'text-primary':   '#3D3256', // deep plum
        'text-secondary': '#8B80A8', // medium purple
        'text-muted':     '#C4B8D4', // light lavender

        // ── Feature ────────────────────────────────────
        diet:    '#A8DCC8', // mint
        workout: '#F4B8A8', // soft peach coral
        stats:   '#FFCBA4', // warm peach
        water:   '#A8C8F0', // soft sky blue
        border:  '#E8E0F5', // light lavender border
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
        card: '0 2px 10px rgba(180, 160, 216, 0.09)',
      },
    },
  },
  plugins: [],
};
