/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Todos estos leen variables CSS (src/app/globals.css: :root = tema
        // claro default, [data-theme=dark] = tema oscuro, hex idénticos a los
        // de siempre). Formato de canal suelto para que sigan funcionando los
        // /NN de opacidad (docs/PLAN-TEMA-WHITE.md).
        zinc: {
          50: 'rgb(var(--z-50) / <alpha-value>)',
          100: 'rgb(var(--z-100) / <alpha-value>)',
          200: 'rgb(var(--z-200) / <alpha-value>)',
          300: 'rgb(var(--z-300) / <alpha-value>)',
          400: 'rgb(var(--z-400) / <alpha-value>)',
          500: 'rgb(var(--z-500) / <alpha-value>)',
          600: 'rgb(var(--z-600) / <alpha-value>)',
          700: 'rgb(var(--z-700) / <alpha-value>)',
          800: 'rgb(var(--z-800) / <alpha-value>)',
          900: 'rgb(var(--z-900) / <alpha-value>)',
          950: 'rgb(var(--z-950) / <alpha-value>)',
        },
        // Texto "fuerte" que SÍ debe invertir (blanco en oscuro, casi negro en
        // claro) — reemplaza a los `text-white` que estaban sobre superficies
        // temáticas (terminal-bg/terminal-panel/zinc). Los `text-white` sobre
        // chrome no temático (video, WhatsApp, scrims) se dejaron literales.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        terminal: {
          bg: 'rgb(var(--t-bg) / <alpha-value>)',
          panel: 'rgb(var(--t-panel) / <alpha-value>)',
          border: 'rgb(var(--t-border) / <alpha-value>)',
          'border-light': 'rgb(var(--t-border-light) / <alpha-value>)',
        },
        positive: 'rgb(var(--positive) / <alpha-value>)',
        negative: 'rgb(var(--negative) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-bright': 'rgb(var(--accent-bright) / <alpha-value>)',
        live: 'rgb(var(--live) / <alpha-value>)',
      },
      fontFamily: {
        // font-terminal y font-mono leen --font-ui (globals.css): mono en el tema
        // oscuro, Inter en el claro. El código real (pre/code) fuerza --font-code.
        terminal: ['var(--font-ui)'],
        mono: ['var(--font-ui)'],
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
        // Legibilidad (audiencia mayor, mobile): se subieron los mínimos.
        // xxs 11→12px y data 13→14px — el texto crítico (contacto, precios,
        // CTAs) usaba estos tokens y quedaba ilegible en el celular.
        'xxs': ['0.75rem', { lineHeight: '1.1rem' }],       // 12px (antes 11)
        'data': ['0.875rem', { lineHeight: '1.3rem' }],     // 14px (antes 13)
        'label': ['0.9375rem', { lineHeight: '1.3rem' }],   // 15px (antes 14)
      },
      spacing: {
        'px2': '4px',
        'cell': '10px',   // cell padding — comfortable touch
        'panel': '16px',  // panel internal padding
      },
      borderRadius: {
        'terminal': 'var(--radius-ctl)', // 2px en oscuro, 6px en claro
      },
      // El tracking ancho de la terminal en mono se ve "gritón" en una sans:
      // en claro baja (ver --tracking-* en globals.css); en oscuro, los de siempre.
      letterSpacing: {
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
        widest: 'var(--tracking-widest)',
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
        'panel': '0 0 0 1px rgb(var(--t-border) / 0.5)',
        'panel-hover': '0 0 0 1px rgb(var(--accent) / 0.3)',
        'glow-green': '0 0 8px rgb(var(--positive) / 0.15)',
        'glow-red': '0 0 8px rgb(var(--negative) / 0.15)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.1)',
        'glow-white-sm': '0 0 15px rgba(255, 255, 255, 0.05)',
        'glow-bar': '0 0 10px rgba(255, 255, 255, 0.3)',
        'glow-bar-sm': '0 0 15px rgba(255, 255, 255, 0.2)',
        'live-glow': '0 0 12px rgb(var(--live) / 0.2)',
        'live-glow-lg': '0 0 20px rgb(var(--live) / 0.3)',
        'amber-glow': '0 0 12px rgb(var(--warning) / 0.15)',
        'sky-glow': '0 0 12px rgb(var(--accent) / 0.15)',
      },
    },
  },
  plugins: [
    // Variantes por tema: `claro:` y `oscuro:` (ej. `oscuro:uppercase`). El tema
    // vive en <html data-theme>, no en una clase `dark`, así que el `dark:` de
    // Tailwind no aplica. Usar para lo que difiere de verdad entre temas (la
    // terminal en mayúsculas vs. el claro en minúsculas), no para colores: los
    // colores ya invierten solos vía tokens.
    function ({ addVariant }) {
      addVariant('claro', 'html:not([data-theme="dark"]) &')
      addVariant('oscuro', 'html[data-theme="dark"] &')
    },
  ],
}
