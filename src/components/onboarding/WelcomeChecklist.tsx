'use client'

import { useRouter } from 'next/navigation'

/**
 * Los primeros pasos de una firma recién reclamada.
 *
 * ORDENADO POR IMPACTO, NO POR CAMPO. La versión anterior listaba cinco datos del
 * perfil con el mismo peso (teléfono, email, sitio, descripción, WhatsApp), y eso
 * fallaba por dos lados:
 *
 *  1. **El WhatsApp no es un campo más.** Sin él, el botón principal de contacto del
 *     perfil directamente no se renderiza. En los datos del sitio al 22-ago-2026, las
 *     firmas con WhatsApp cargado reciben contacto 3,2 veces más seguido (37,8% de
 *     ellas vs 11,8% de las que no lo tienen). Va primero.
 *  2. **Faltaba el paso que trae el tráfico.** Ningún ítem hablaba de publicar un
 *     remate, que es lo que hace que alguien entre al perfil.
 *
 * Y la descripción salió del bloque esencial: **0 de 130 firmas la tienen cargada**.
 * Con ella adentro, el checklist quedaba incompleto para el 100% de las casas para
 * siempre — un progreso que nunca llega a 100% deja de leerse como progreso.
 */

interface WelcomeChecklistProps {
  profileSlug: string
  displayName: string
  completedFields: {
    phone: boolean
    email: boolean
    website: boolean
    description: boolean
    whatsapp: boolean
  }
  /** ¿Tiene al menos un remate publicado (propio o encontrado por el scrape)? */
  tieneRemate?: boolean
}

type Item = {
  key: string
  label: string
  /** Por qué importa. Sale del dato, no de un catálogo de consejos. */
  porque: string
  done: boolean
  /** A qué pestaña del panel lleva. */
  tab: 'editar' | 'remates'
}

export default function WelcomeChecklist({
  profileSlug: _profileSlug,
  displayName,
  completedFields,
  tieneRemate = false,
}: WelcomeChecklistProps) {
  const router = useRouter()

  const ir = (tab: Item['tab']) => {
    router.push(`/dashboard?tab=${tab}`)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }

  // Lo que de verdad mueve la aguja, en orden.
  const esenciales: Item[] = [
    {
      key: 'whatsapp',
      label: 'Cargá tu WhatsApp',
      porque: 'Sin WhatsApp no aparece el botón de contacto en tu perfil. Las firmas que lo tienen reciben 3 veces más consultas.',
      done: completedFields.whatsapp,
      tab: 'editar',
    },
    {
      key: 'remate',
      label: 'Publicá un remate',
      porque: 'Es lo que trae gente a tu perfil. Sale en el calendario, en tu widget y primero en el newsletter semanal.',
      done: tieneRemate,
      tab: 'remates',
    },
    {
      key: 'phone',
      label: 'Cargá tu teléfono',
      porque: 'Para el productor que prefiere llamar antes que escribir.',
      done: completedFields.phone,
      tab: 'editar',
    },
  ]

  // Suman, pero no son la diferencia entre recibir una consulta y no recibirla.
  const opcionales: Item[] = [
    {
      key: 'description',
      label: 'Contá qué hace tu casa',
      porque: 'Dos o tres líneas. Ayuda a que te encuentren buscando por especialidad.',
      done: completedFields.description,
      tab: 'editar',
    },
    {
      key: 'website',
      label: 'Agregá tu sitio web',
      porque: 'Si tenés uno propio, lo enlazamos desde tu perfil.',
      done: completedFields.website,
      tab: 'editar',
    },
  ]

  const hechos = esenciales.filter((i) => i.done).length
  const total = esenciales.length
  if (hechos >= total && opcionales.every((i) => i.done)) return null

  const Fila = ({ item }: { item: Item }) => (
    <button
      onClick={() => !item.done && ir(item.tab)}
      disabled={item.done}
      className={`flex w-full items-start gap-2 rounded-terminal px-1.5 py-2 text-left transition-colors ${
        item.done ? 'cursor-default' : 'hover:bg-zinc-800/40'
      }`}
    >
      <span className={`text-data font-terminal leading-5 ${item.done ? 'text-positive' : 'text-zinc-500'}`}>
        {item.done ? '✓' : '○'}
      </span>
      <span className="min-w-0">
        <span className={`block text-xxs font-terminal ${item.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
          {item.label}
        </span>
        {!item.done && (
          <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">{item.porque}</span>
        )}
      </span>
    </button>
  )

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="inline-flex w-5 h-5 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/guia-dte.png" alt="" className="w-3.5 h-3.5" />
          </span>
          <span className="text-zinc-200 text-label tracking-widest">PRIMEROS PASOS</span>
        </span>
        <span className="text-xxs font-terminal tabular-nums text-zinc-500">{hechos}/{total}</span>
      </div>

      <div className="px-panel py-3 space-y-3">
        <p className="text-data font-terminal text-zinc-400">
          Tres cosas para que <span className="text-zinc-200">{displayName}</span> empiece a
          recibir consultas. Están en orden: la primera es la que más cambia.
        </p>

        <div className="space-y-0.5">
          {esenciales.map((i) => <Fila key={i.key} item={i} />)}
        </div>

        <div className="gradient-bar w-full max-w-[200px]">
          <div className="gradient-bar-fill" style={{ width: `${(hechos / total) * 100}%` }} />
        </div>

        {/* Los opcionales sólo aparecen cuando lo esencial está resuelto: antes de
            eso son ruido que compite con lo que sí importa. */}
        {hechos >= total && opcionales.some((i) => !i.done) && (
          <div className="border-t border-terminal-border pt-3">
            <p className="mb-1 text-[10px] font-terminal uppercase tracking-widest text-zinc-600">
              Después, si querés
            </p>
            <div className="space-y-0.5">
              {opcionales.map((i) => <Fila key={i.key} item={i} />)}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
          <button
            onClick={() => ir(esenciales.find((i) => !i.done)?.tab ?? 'editar')}
            className="px-3 py-1.5 text-xxs font-terminal text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
          >
            {esenciales.find((i) => !i.done)?.label ?? 'Completar perfil'} →
          </button>
          <a
            href={`https://wa.me/5493773418130?text=${encodeURIComponent(`Hola, necesito ayuda con mi perfil de ${displayName} en consignatarias.com.ar`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xxs font-terminal text-positive/70 hover:text-positive transition-colors"
          >
            ¿Necesitás ayuda? →
          </a>
        </div>
      </div>
    </div>
  )
}
