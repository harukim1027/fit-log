/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:    'rgb(var(--color-primary) / <alpha-value>)',
        secondary:  'rgb(var(--color-secondary) / <alpha-value>)',
        success:    'rgb(var(--color-success) / <alpha-value>)',
        warning:    'rgb(var(--color-warning) / <alpha-value>)',
        danger:     'rgb(var(--color-danger) / <alpha-value>)',
        'on-accent':'rgb(var(--color-on-accent) / <alpha-value>)',

        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface:    'rgb(var(--color-surface) / <alpha-value>)',
        'surface-alt':  'rgb(var(--color-surface-alt) / <alpha-value>)',
        'surface-high': 'rgb(var(--color-surface-high) / <alpha-value>)',
        border:     'rgb(var(--color-border) / <alpha-value>)',

        'text-primary':   'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--color-text-muted) / <alpha-value>)',

        diet:    'rgb(var(--color-diet) / <alpha-value>)',
        workout: 'rgb(var(--color-workout) / <alpha-value>)',
        stats:   'rgb(var(--color-stats) / <alpha-value>)',
        water:   'rgb(var(--color-water) / <alpha-value>)',
        carb:    'rgb(var(--color-carb) / <alpha-value>)',
        protein: 'rgb(var(--color-protein) / <alpha-value>)',
        fat:     'rgb(var(--color-fat) / <alpha-value>)',
      },
      fontFamily: { sans: ['System'] },
      borderRadius: { '2xl': '16px', '3xl': '24px', '4xl': '32px' },
    },
  },
  plugins: [],
};
