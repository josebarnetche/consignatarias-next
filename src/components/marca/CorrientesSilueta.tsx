/* Silueta real de la provincia de Corrientes (trazado oficial Natural Earth 10m,
   simplificado a 68 puntos, normalizado a un viewBox 0 0 100 100). Reutilizable. */

const CORRIENTES_PATH =
  'M35.4 6.9 L42.7 7.3 L53.3 10.8 L57.7 10.7 L61.6 12.6 L68.4 10.9 L71.6 13.1 L77.2 11.8 L80.8 15.1 L83.4 12.4 L83.8 10.2 L87 8.3 L91.5 8.8 L90.3 11.7 L93.8 18.2 L94.7 22.9 L97.2 26.9 L100 28.8 L96.3 31 L99 33.3 L98.2 35.1 L94.6 33.8 L93 34.6 L93.1 36.7 L90.4 37.5 L89.7 40.3 L86.1 43.6 L83.6 44.5 L83.3 47 L81 48.8 L80.1 51.7 L75.4 53.9 L73.7 58.1 L71.7 59.3 L65.5 66.8 L63.2 68.9 L58.8 70.1 L58 74.2 L53.5 78.2 L50.1 79.4 L49.9 82.8 L44 88.2 L46 93.1 L41.6 89.5 L39.6 85 L34.9 80.3 L25.8 78.4 L19.7 80.2 L16.5 79.7 L10.7 83.1 L7 82.2 L0.3 83 L0.1 81.9 L1.9 75.9 L0 70.9 L2 65.1 L2.2 59.3 L4 55.1 L11.7 50.5 L14.5 40.7 L14.5 29.6 L15.1 28.4 L19.2 27 L20.5 23.2 L21.2 18.3 L19.4 12.4 L28.7 7.4 L35.4 6.9 Z'

export default function CorrientesSilueta({ className, title = 'Provincia de Corrientes' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title} fill="currentColor">
      <title>{title}</title>
      <path d={CORRIENTES_PATH} />
    </svg>
  )
}
