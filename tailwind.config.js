/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0f',       // tinted zinc-950 (slight blue)
          panel: '#16161d',    // tinted zinc-900
          border: '#27272a',   // zinc-800 - borders
          'border-light': '#3f3f46', // zinc-700 - hover borders
        },
        positive: '#34d399',   // emerald-400 - gains, up
        negative: '#f87171',   // red-400 - losses, down
        warning: '#fbbf24',    // amber-400 - warnings, neutral
        accent: '#38bdf8',     // sky-400 - links, interactive
        'accent-bright': '#0ea5e9', // sky-500 - active states
        live: '#10b981',       // emerald-500 - live states
      },
      fontFamily: {
        terminal: [
          'SF Mono',
          'Cascadia Code',
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'Monaco',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
        heading: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        sans: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        'xxs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px - smallest allowed
        'data': ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px - data cells
        'label': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - labels, headers
      },
      spacing: {
        'px2': '4px',
        'cell': '10px',   // cell padding — comfortable touch
        'panel': '16px',  // panel internal padding
      },
      borderRadius: {
        'terminal': '2px',
      },
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 4s linear infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'count-up': 'count-up 0.6s ease-out both',
        'ring-pulse': 'ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan-line 8s linear infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'scan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ring-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.8)', opacity: '0' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      // Motion tokens (DESIGN-SYSTEM.md §2.3) — UNA escala de duración + easings.
      // Convención: hover/estado = `fast`·`standard` · superficie/aparición = `base`
      // · barras/datos (gradient-bar, stroke de chart) = `slow`. El reveal de
      // scroll mantiene su 0.8s deliberado; `prefers-reduced-motion` NO se toca.
      transitionDuration: {
        fast: '100ms',
        base: '200ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        // el easing del reveal-init de la landing — para superficies/aparición
        standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
        // easing de los loops "vivos" (pulse-live/ring-pulse)
        live: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      borderWidth: {
        'thin': '0.5px',
      },
      boxShadow: {
        'panel': '0 0 0 1px rgba(39, 39, 42, 0.5)',
        'panel-hover': '0 0 0 1px rgba(56, 189, 248, 0.3)',
        'glow-green': '0 0 8px rgba(52, 211, 153, 0.15)',
        'glow-red': '0 0 8px rgba(248, 113, 113, 0.15)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.1)',
        'glow-white-sm': '0 0 15px rgba(255, 255, 255, 0.05)',
        'glow-bar': '0 0 10px rgba(255, 255, 255, 0.3)',
        'glow-bar-sm': '0 0 15px rgba(255, 255, 255, 0.2)',
        'live-glow': '0 0 12px rgba(16, 185, 129, 0.2)',
        'live-glow-lg': '0 0 20px rgba(16, 185, 129, 0.3)',
        'amber-glow': '0 0 12px rgba(251, 191, 36, 0.15)',
      },
    },
  },
  plugins: [],
}
