import { ImagenTema } from '@/components/ui/ImagenTema'
/**
 * Estado de carga — la sonda respirando (curva de marca --ease-decay).
 * Pictograma COLOR "onda" en chip hueso, como manda el manual.
 *
 * Ya no es el loading.tsx raíz: ese hacía que casi todo HTML prerenderizado abriera
 * con "Cargando el mercado…" y dejara el contenido en un <div hidden>, que un
 * rastreador sin JS no lee. Se usa solo en segmentos privados y dinámicos
 * (cuenta, dashboard) vía su loading.tsx.
 */
export default function CargandoMarca() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 py-24">
      <style>{`
        @keyframes marca-pulso{0%{transform:scale(.94);opacity:.7}45%{transform:scale(1.05);opacity:1}100%{transform:scale(.94);opacity:.7}}
        @media (prefers-reduced-motion:reduce){.marca-pulso{animation:none}}
      `}</style>
      <span
        className="marca-pulso inline-flex w-14 h-14 rounded-lg bg-zinc-100 items-center justify-center select-none"
        style={{ animation: 'marca-pulso 1.8s cubic-bezier(.16,1,.3,1) infinite' }}
        aria-hidden="true"
      >
                <ImagenTema src="/marca/iconos-color/onda.png" alt="" className="w-9 h-9" />
      </span>
      <p className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">
        Cargando el mercado…
      </p>
    </div>
  )
}
