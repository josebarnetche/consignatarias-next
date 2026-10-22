import { AdminSection } from '@/components/admin/kit'
import Badge, { type BadgeTone } from '@/components/ui/Badge'
import { ofertaHacienda } from '@/lib/agente/mensajes-contacto'
import { TIPOS_CAMPO_ACTIVOS } from '@/lib/agente/campos-agente'
import { decisionesPendientes, estadoActual, type Gravedad } from '@/lib/agente/decisiones'

/** /admin/agente → lo que el agente no puede resolver solo. Desaparece cuando se resuelve en el código. */

const TONO: Record<Gravedad, { label: string; tone: BadgeTone }> = {
  legal: { label: 'Legal', tone: 'negative' },
  plata: { label: 'Plata', tone: 'warning' },
  producto: { label: 'Producto', tone: 'accent' },
}

export default function Decisiones() {
  const estado = estadoActual({
    tiposActivos: TIPOS_CAMPO_ACTIVOS,
    ofertaDePrueba: (d) =>
      ofertaHacienda({ leadId: 0, ofertaId: 0, lado: 'vende', datos: { cabezas: 100, categoria: 'novillos', zona: 'Azul', ...d }, contraparte: 'X' }).texto,
  })
  const lista = decisionesPendientes(estado)
  if (lista.length === 0) return null
  return (
    <AdminSection title={`Decisiones pendientes · ${lista.length}`} flush>
      <ul className="divide-y divide-terminal-border">
        {lista.map((d) => (
          <li key={d.id} className="px-panel py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONO[d.gravedad].tone}>{TONO[d.gravedad].label}</Badge>
              <span className="text-data font-terminal text-ink">{d.titulo}</span>
            </div>
            <p className="mt-1 text-xxs text-zinc-400 font-terminal">{d.detalle}</p>
            <p className="mt-0.5 text-xxs text-zinc-500 font-terminal">{d.ref}</p>
          </li>
        ))}
      </ul>
    </AdminSection>
  )
}
