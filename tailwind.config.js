
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
        // 1. BRAND COLORS (Dynamic - controlled by React state)
        // Maps to --color-brand-* variables
        brand: {
          50: 'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          200: 'rgb(var(--color-brand-200) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          400: 'rgb(var(--color-brand-400) / <alpha-value>)',
          500: 'rgb(var(--color-brand-50) / <alpha-value>)',
          600: 'rgb(var(--color-brand-600) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          800: 'rgb(var(--color-brand-800) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
          950: 'rgb(var(--color-brand-950) / <alpha-value>)',
        },
        
        // 2. BASE COLORS (Hijacking 'slate' to be Dynamic)
        // Maps to --color-base-* variables
        // This allows bg-slate-950 to turn Brown/Gold when the theme changes variable values
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
        },
      },
    },
  },
  plugins: [],
}
