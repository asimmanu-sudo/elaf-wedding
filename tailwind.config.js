
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Explicit Gold Palette (for specific usage if needed)
        gold: {
          50: '#FBF8F2',
          100: '#F5EFE0',
          200: '#EADBB3',
          300: '#DEC385',
          400: '#D4AF37', // Classic Metallic Gold
          500: '#B89628',
          600: '#96781C',
          700: '#755C12',
          800: '#57430D',
          900: '#3D2F08',
          950: '#261C03',
        },
        // Explicit Stone Palette (Warm Grey)
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        // Dynamic Brand Colors (Mapped to CSS Variables)
        // This allows bg-brand-500 to be Purple OR Gold instantly
        brand: {
          50: 'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          200: 'rgb(var(--color-brand-200) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          400: 'rgb(var(--color-brand-400) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500) / <alpha-value>)',
          600: 'rgb(var(--color-brand-600) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          800: 'rgb(var(--color-brand-800) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
          950: 'rgb(var(--color-brand-950) / <alpha-value>)',
        },
        // Dynamic Base Colors (Mapped to CSS Variables)
        // This allows bg-slate-950 to be Blue-Grey OR Warm-Stone instantly
        slate: {
          50: 'rgb(var(--color-base-50) / <alpha-value>)',
          100: 'rgb(var(--color-base-100) / <alpha-value>)',
          200: 'rgb(var(--color-base-200) / <alpha-value>)',
          300: 'rgb(var(--color-base-300) / <alpha-value>)',
          400: 'rgb(var(--color-base-400) / <alpha-value>)',
          500: 'rgb(var(--color-base-500) / <alpha-value>)',
          600: 'rgb(var(--color-base-600) / <alpha-value>)',
          700: 'rgb(var(--color-base-700) / <alpha-value>)',
          800: 'rgb(var(--color-base-800) / <alpha-value>)',
          900: 'rgb(var(--color-base-900) / <alpha-value>)',
          950: 'rgb(var(--color-base-950) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [],
}
