/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#09090b',       // zinc-950 - main background
          panel: '#18181b',    // zinc-900 - panel/card background
          border: '#27272a',   // zinc-800 - borders
          'border-light': '#3f3f46', // zinc-700 - hover borders
        },
        positive: '#34d399',   // emerald-400 - gains, up
        negative: '#f87171',   // red-400 - losses, down
        warning: '#fbbf24',    // amber-400 - warnings, neutral
        accent: '#38bdf8',     // sky-400 - links, interactive
        'accent-bright': '#0ea5e9', // sky-500 - active states
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
        display: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        sans: [
          'Inter',
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
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 4s linear infinite',
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
      },
    },
  },
  plugins: [],
}
