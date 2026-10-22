import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { DatasetSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { FaqList } from '@/components/seo/FaqList'
import LeadCapture from '@/components/leads/LeadCapture'
import { LICENCIA_PROPIA, SITE } from '@/lib/seo/schemas'
import { createServiceClient } from '@/lib/supabase'
import type { LeadFila } from '@/lib/mercado/leads-mesa'
import {
  agregarDemanda,
  COLUMNAS_DEMANDA,
  DEMANDA_VACIA,
  K_MIN,
  VENTANA_DIAS,
  type DemandaAgregada,
  type GrupoDemanda,
  type LadoDemanda,
} from '@/lib/mercado/demanda-agregada'

// ISR: la mesa se recalcula una vez por hora. NO force-dynamic: queremos que la cachee.
export const revalidate = 3600

const PAGE_URL = `${SITE}/mercado/demanda`
const TITULO = 'Demanda de hacienda y campos hoy'
const DESCRIPCION =
  'Cuántos compradores y vendedores de hacienda, y cuántas personas buscando u ofreciendo campo, hay hoy en la mesa de consignatarias.com, por categoría y región. Datos agregados y anónimos, actualizados cada hora.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  keywords: [
    'demanda de hacienda', 'compradores de terneros', 'vender vacas', 'compradores de hacienda',
    'campo para arrendar', 'arrendamiento rural', 'oferta de hacienda', 'mesa de operaciones ganaderas',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITULO, description: DESCRIPCION, url: PAGE_URL, type: 'website' },
}

const FAQ = [
  {
    question: '¿De dónde salen estos números?',
    answer:
      `Son los pedidos abiertos que productores, compradores y dueños de campo dejaron en consignatarias.com en los últimos ${VENTANA_DIAS} días: quién quiere comprar o vender hacienda, y quién busca u ofrece campo. Se cuentan solo los que siguen abiertos y se recalculan cada hora.`,
  },
  {
    question: '¿Por qué no dicen quién compra ni dónde exactamente?',
    answer:
      `Porque los datos de cada persona no se publican. Mostramos rangos de cantidad por región y categoría, sin volumen, y un grupo solo aparece si junta al menos ${K_MIN} pedidos: con uno solo, o con un número exacto, se podría adivinar de quién es.`,
  },
  {
    question: '¿Cómo llego a esos compradores o vendedores?',
    answer:
      'Dejando tu pedido en el grupo que te interesa. Entra a la misma mesa y, cuando hay una contraparte que encaja por categoría, zona y volumen, consignatarias.com arma la operación con las dos puntas. El contacto lo hacemos nosotros: nadie recibe tus datos sin que lo sepas.',
  },
  {
    question: '¿Un agente de IA puede consultar esto?',
    answer:
      'Sí. La tool market_match del servidor MCP de consignatarias.com responde lo mismo para un caso concreto ("¿hay compradores para 80 terneros en Entre Ríos?"), también agregado y sin datos personales. Es gratis y sin cupo.',
  },
]

async function leerDemanda(): Promise<DemandaAgregada> {
  const service = createServiceClient()
  if (!service) return DEMANDA_VACIA
  try {
    const desde = new Date(Date.now() - VENTANA_DIAS * 86_400_000).toISOString()
    const { data, error } = await service
      .from('producer_leads')
      .select(COLUMNAS_DEMANDA)
      .in('status', ['new', 'needs_review', 'routed', 'contacted'])
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error || !data) return DEMANDA_VACIA
    // Las columnas de contacto ni se piden: la agregación no las necesita.
    const filas: LeadFila[] = (data as Array<Partial<LeadFila>>).map((r) => ({
      id: Number(r.id),
      created_at: String(r.created_at),
      intent: String(r.intent ?? ''),
      category: r.category ?? null,
      head_count: r.head_count ?? null,
      hectareas: r.hectareas ?? null,
      province: r.province ?? null,
      name: null,
      phone: null,
      email: null,
      status: String(r.status ?? ''),
      fee_ars: null,
      // Sin el origen, la agregación no puede dejar afuera los pedidos sin verificar.
      source: r.source ?? null,
    }))
    return agregarDemanda(filas)
  } catch {
    return DEMANDA_VACIA
  }
}

const ROTULO_LADO: Record<LadoDemanda, string> = {
  compran: 'Compradores de hacienda',
  venden: 'Vendedores de hacienda',
  buscan: 'Buscan campo',
  ofrecen: 'Ofrecen campo',
}

/** El CTA invita a la punta que falta: si hay compradores, a quien vende, y al revés. */
function Cta({ g }: { g: GrupoDemanda }) {
  const source = `demanda-publica:${g.id}`
  const presetCategory = g.vertical === 'hacienda' ? g.categoria ?? undefined : undefined
  if (g.vertical === 'hacienda') {
    const vende = g.lado === 'compran'
    return (
      <LeadCapture
        source={source}
        variant="card"
        emoji={vende ? '🐂' : '🛒'}
        defaultIntent={vende ? 'vender' : 'comprar'}
        intents={[
          { value: 'vender', label: 'Vender hacienda' },
          { value: 'comprar', label: 'Comprar hacienda' },
        ]}
        askFiscal={vende}
        askCategory={!presetCategory}
        presetCategory={presetCategory}
        quantityField="headCount"
        quantityLabel="Cabezas"
        title={vende ? '¿Tenés para vender?' : '¿Estás comprando?'}
        subtitle="Dejá tu pedido y entra a la misma mesa. Si encaja, armamos la operación con las dos puntas."
        ctaLabel={vende ? 'Dejar mi pedido de venta →' : 'Dejar mi pedido de compra →'}
        submitLabel="Dejar mi pedido →"
      />
    )
  }
  const arriendo = g.categoria === 'arrendamiento'
  const ofrece = g.lado === 'buscan'
  return (
    <LeadCapture
      source={source}
      variant="card"
      emoji="🌾"
      defaultIntent={arriendo ? (ofrece ? 'arrendar_ofrezco' : 'arrendar_busco') : (ofrece ? 'vender' : 'comprar')}
      intents={arriendo
        ? [
            { value: 'arrendar_ofrezco', label: 'Tengo campo para arrendar' },
            { value: 'arrendar_busco', label: 'Busco campo para arrendar' },
          ]
        : [
            { value: 'vender', label: 'Vendo campo' },
            { value: 'comprar', label: 'Busco campo para comprar' },
          ]}
      quantityField="hectareas"
      quantityLabel="Hectáreas"
      title={ofrece ? '¿Tenés el campo?' : '¿Buscás campo?'}
      subtitle="Dejá tu pedido y entra a la misma mesa. Si encaja, armamos la operación con las dos puntas."
      ctaLabel={ofrece ? 'Ofrecer mi campo →' : 'Dejar mi búsqueda →'}
      submitLabel="Dejar mi pedido →"
    />
  )
}

function Seccion({ titulo, grupos }: { titulo: string; grupos: GrupoDemanda[] }) {
  if (!grupos.length) return null
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink mb-3">{titulo}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {grupos.map((g) => (
          <li key={g.id} id={g.id} className="terminal-panel flex flex-col gap-3 p-4">
            <p className="text-xxs uppercase tracking-widest text-zinc-500">{ROTULO_LADO[g.lado]}</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-ink tabular-nums">{g.rango}</span>
              <span className="text-data text-zinc-400">pedidos</span>
            </div>
            <p className="text-data text-zinc-300">{g.frase}.</p>
            <Cta g={g} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function DemandaPage() {
  const d = await leerDemanda()
  const hacienda = d.grupos.filter((g) => g.vertical === 'hacienda')
  const campos = d.grupos.filter((g) => g.vertical === 'campos')
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Mercado', href: '/mercado' }, { name: 'Demanda hoy' }]} />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Mercado · La mesa de consignatarias.com</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink text-balance">{TITULO}</h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          Cuántos compran, cuántos venden y cuántos buscan campo en este momento, por categoría y región.
          Son los pedidos abiertos de los últimos {VENTANA_DIAS} días, recalculados cada hora.
        </p>
      </header>

      <section className="rounded-terminal border border-accent/30 bg-accent/5 p-5">
        {d.hay && d.rangoTotal ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-ink tabular-nums">{d.rangoTotal}</span>
              <span className="text-data text-zinc-400">pedidos abiertos en la mesa</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.totales.map((t) => (
                <li key={`${t.vertical}-${t.lado}`} className="rounded-terminal border border-terminal-border bg-terminal-panel px-3 py-1.5 text-xxs">
                  <span className="text-zinc-500">{ROTULO_LADO[t.lado]}</span>{' '}
                  <span className="text-zinc-100 font-terminal tabular-nums">{t.rango}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-data text-zinc-300">
            Hoy no hay grupos con pedidos suficientes para mostrarlos sin identificar a nadie. Dejá el tuyo y
            entrás primero a la mesa.
          </p>
        )}
        <p className="mt-4 text-xxs text-zinc-500">
          Datos agregados: no publicamos quién ni dónde exactamente. Un grupo aparece solo si junta {K_MIN} pedidos o
          más, y las cantidades van en rangos, sin volumen: un número exacto, comparado hora a hora, deja adivinar de
          quién es un pedido.
        </p>
      </section>

      {/* Anclas fijas: las plantillas con tráfico enlazan a /mercado/demanda#hacienda. Existen
          aunque la sección quede vacía (los grupos k-anónimos aparecen y desaparecen). */}
      <div id="hacienda" className="scroll-mt-24" />
      <Seccion titulo="Hacienda" grupos={hacienda} />
      <div id="campos" className="scroll-mt-24" />
      <Seccion titulo="Campos" grupos={campos} />

      {d.grupos.length === 0 && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Cta g={{ id: 'sin-grupos-hacienda', vertical: 'hacienda', lado: 'compran', categoria: null, zona: '', rango: '', frase: '' }} />
          <Cta g={{ id: 'sin-grupos-campos', vertical: 'campos', lado: 'ofrecen', categoria: 'arrendamiento', zona: '', rango: '', frase: '' }} />
        </section>
      )}

      <section className="mt-10 terminal-panel p-5">
        <h2 className="text-base font-semibold text-ink">Para agentes de IA</h2>
        <p className="mt-2 text-data text-zinc-400">
          Un agente puede hacer la misma pregunta para un caso puntual —«¿hay compradores para 80 terneros en Entre
          Ríos?»— con la tool <code className="text-zinc-200">market_match</code> del servidor MCP de
          consignatarias.com. Responde agregado, con las mismas reglas de anonimato, y puede dejar el pedido en la
          mesa si la persona da su consentimiento.
        </p>
        <Link href="/mcp" className="mt-3 inline-block text-data text-accent hover:underline underline-offset-2">
          Ver el servidor MCP y sus tools →
        </Link>
      </section>

      <FaqList items={FAQ} className="mt-10" />

      <FAQPageSchema items={FAQ} />
      <DatasetSchema
        name="Demanda y oferta abiertas de hacienda y campos — consignatarias.com"
        description="Conteo agregado y anónimo de los pedidos abiertos de compra y venta de hacienda y de búsqueda y oferta de campos en la mesa de consignatarias.com, por categoría y región, en rangos."
        url={PAGE_URL}
        keywords={['demanda de hacienda', 'oferta de hacienda', 'arrendamiento rural', 'compradores de terneros']}
        license={LICENCIA_PROPIA}
        dateModified={d.hay ? hoy : null}
        variableMeasured={{ name: 'Pedidos abiertos en la mesa (rango)', unitText: 'pedidos' }}
        temporalCoverage={`P${VENTANA_DIAS}D`}
        updateFrequency="PT1H"
      />
    </div>
  )
}
