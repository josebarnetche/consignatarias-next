import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { getFrigorificoPlanStatus, getConsignatariaPlanStatus } from '@/lib/features'
import DashboardClient, { type FrigoProduct, type FrigoRfq } from './DashboardClient'
import ProductorDashboard from './ProductorDashboard'
import rematesData from '@/lib/data/remates.json'
import { getPerformance, rematesPorMes, type Performance } from '@/lib/reports/performance'
import { getDistribucion, type ResumenDistribucion } from '@/lib/promotion'
import { getBenchmark, type Benchmark } from '@/lib/reports/benchmark'
import { getCartera, type Cartera } from '@/lib/reports/cartera'
import { construirTerritorio, titularTerritorio, type Territorio } from '@/lib/reports/territorio'
import { magIdDeSlug } from '@/lib/reports/mag-lotes'
import { TerritorioPanel } from '@/components/dashboard/TerritorioPanel'
import { PrimerosPasos } from '@/components/onboarding/PrimerosPasos'
import { getParticipacion, type Participacion } from '@/lib/reports/participacion'
import { construirBandeja, type Bandeja } from '@/lib/reports/bandeja'
import { getAgendaRegional, type AgendaRegional } from '@/lib/reports/agenda-regional'
import { intentarAutoAprobar } from '@/lib/claims/auto-approve'
import marketPrices from '@/lib/data/market-prices.json'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mi Panel',
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  if (!service) redirect('/login') // Supabase unavailable

  // Get user's claims
  const { data: claims } = await service
    .from('consignataria_claims')
    .select('*, consignatarias(display_name, canonical_slug)')
    .eq('claimant_email', user.email!)
    .order('created_at', { ascending: false })

  // AUTO-HABILITACIÓN. Si el usuario que acaba de iniciar sesión tiene un claim
  // pendiente y su email prueba que es de la firma (coincide con el del registro, o
  // comparte el dominio propio de la casa), el panel se abre solo. Antes esto pedía
  // que una persona aprobara a mano desde /admin/claims, así que una firma que
  // reclamaba un domingo esperaba al lunes.
  //
  // Corre ANTES de leer la consignataria: si aprueba, la lectura de abajo ya la
  // encuentra reclamada y el panel aparece completo en la misma carga.
  if (user.email) {
    await intentarAutoAprobar(service as unknown as Parameters<typeof intentarAutoAprobar>[0], user.email, user.id)
  }

  // Get user's verified consignataria (if any)
  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug, verified, phone, email, website, description, whatsapp, cuit, logo_url')
    .eq('claimed_by_email', user.email!)
    .single()

  // Get user's verified frigorifico (if any)
  const { data: frigorifico } = await service
    .from('frigorifico_profiles')
    .select('cuit, display_name, verified, phone, email, website, description, whatsapp, location, logo_url, habilitacion_nivel, habilitacion_verificada')
    .eq('claimed_by_email', user.email!)
    .single()

  // Get user's frigorifico claims
  const { data: frigoClaims } = await service
    .from('frigorifico_claims')
    .select('*')
    .eq('claimant_email', user.email!)
    .order('created_at', { ascending: false })

  // PRODUCTOR (la mayoría de los registros): sin perfil B2B reclamado ni claims
  // pendientes → panel de productor (hacienda + consignatarias seguidas + marcas),
  // no el flujo de reclamar consignataria/frigorífico.
  const isProductor = !consignataria && !frigorifico && !(claims?.length) && !(frigoClaims?.length)
  if (isProductor) {
    const hoy = new Date().toISOString().slice(0, 10)
    const [{ data: favs }, { data: ganado }, { count: marksCount }] = await Promise.all([
      service.from('user_favorites').select('consignataria_slug').eq('user_id', user.id),
      service.from('user_ganado').select('items').eq('user_id', user.id).maybeSingle(),
      service.from('remate_marks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const cats = marketPrices.categories as Record<string, { current: number }>
    const ganadoItems = Array.isArray(ganado?.items)
      ? (ganado!.items as { categoria: string; cabezas: number; peso: number }[])
      : []
    let herdValueArs: number | null = null
    let herdCabezas = 0
    if (ganadoItems.length > 0) {
      herdValueArs = 0
      for (const it of ganadoItems) {
        const precio = cats[it.categoria]?.current ?? marketPrices.inmag.current
        herdValueArs += (it.cabezas || 0) * (it.peso || 0) * precio
        herdCabezas += it.cabezas || 0
      }
    }

    const followedSlugs = new Set((favs ?? []).map((f) => f.consignataria_slug))
    const upcoming = (rematesData as { id: number; consignatariaSlug: string; consignatariaName: string; date: string; time: string | null; location: string; status: string }[])
      .filter((r) => r.date >= hoy && r.status === 'scheduled' && followedSlugs.has(r.consignatariaSlug))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        consignatariaName: r.consignatariaName,
        consignatariaSlug: r.consignatariaSlug,
        location: r.location,
      }))

    return (
      <>
        {/* Los primeros pasos van ARRIBA del panel y sólo para el productor: es quien
            llega sin saber qué hay. Se auto-oculta cuando lo descarta. */}
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <PrimerosPasos nombre={user.email?.split('@')[0] ?? null} />
        </div>
        <ProductorDashboard
          email={user.email ?? ''}
          herdValueArs={herdValueArs}
          herdCabezas={herdCabezas}
          followedCount={followedSlugs.size}
          upcoming={upcoming}
          marksCount={marksCount ?? 0}
        />
      </>
    )
  }

  // Get upcoming scraped auctions for this consignataria
  const today = new Date().toISOString().slice(0, 10)
  const scrapedAuctions = consignataria
    ? (rematesData as { consignatariaSlug: string; date: string; title: string; location: string; time: string | null }[])
        .filter(r => r.consignatariaSlug === consignataria.canonical_slug && r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)
    : []

  // Get owner-managed auctions from Supabase
  let ownerAuctions: {
    id: number
    title: string
    date: string
    time: string | null
    location: string | null
    province: string | null
    type: string
    main_category: string
    estimated_heads: number | null
    description: string | null
    catalog_url: string | null
    youtube_url: string | null
    status: string
  }[] = []
  if (consignataria) {
    const { data } = await service
      .from('consignataria_auctions')
      .select('*')
      .eq('consignataria_slug', consignataria.canonical_slug)
      .order('date', { ascending: true })

    ownerAuctions = (data || []).map((a) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      location: a.location,
      province: a.province,
      type: a.type ?? 'general',
      main_category: a.main_category ?? 'mixto',
      estimated_heads: a.estimated_heads,
      description: a.description,
      catalog_url: a.catalog_url,
      youtube_url: a.youtube_url,
      status: a.status ?? 'scheduled',
    }))
  }

  // Get submitted auction results
  const { data: auctionResults } = await service
    .from('auction_results')
    .select('id, auction_date, auction_title, total_heads_sold, average_price')
    .eq('submitted_by', user.id)
    .order('auction_date', { ascending: false })
    .limit(20)

  // Get profile views count (last 30 days)
  let viewCount = 0
  let whatsappClicks = 0
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  
  if (consignataria) {
    const { count } = await service
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('entity_slug', consignataria.canonical_slug)
      .gte('viewed_at', thirtyDaysAgo)

    viewCount = count ?? 0

    // Get WhatsApp clicks (last 30 days)
    try {
      const { count: waCount } = await service
        .from('whatsapp_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)
        .gte('clicked_at', thirtyDaysAgo)

      whatsappClicks = waCount ?? 0
    } catch {
      // Table may not exist yet
      whatsappClicks = 0
    }
  }

  // Get leads count (last 30 days)
  let leadsCount = 0
  let leads: Array<{ id: number; name: string; phone: string | null; email: string | null; message: string | null; source: string | null; status: string | null; created_at: string }> = []
  if (consignataria) {
    try {
      const { count: leadCount } = await service
        .from('consignataria_leads')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)
        .gte('created_at', thirtyDaysAgo)

      leadsCount = leadCount ?? 0

      // Bandeja de leads (últimos 50) — la captura ya existía, faltaba la gestión.
      const { data: leadRows } = await service
        .from('consignataria_leads')
        .select('id, name, phone, email, message, source, status, created_at')
        .eq('consignataria_slug', consignataria.canonical_slug)
        .order('created_at', { ascending: false })
        .limit(50)
      leads = leadRows ?? []
    } catch {
      // Table may not exist yet
      leadsCount = 0
    }
  }

  // Performance del mes vs el anterior (Epic E). Es lo único del panel que responde
  // "¿esto me sirvió?" con una serie y no con una foto — y lo hace sin declarar
  // mejoras que no se distinguen del ruido.
  let performance: Performance | null = null
  if (consignataria) {
    try {
      performance = await getPerformance(service as unknown as Parameters<typeof getPerformance>[0], consignataria.canonical_slug, {
        // Cuenta los remates de las DOS fuentes. Con sólo el scrape, una firma que
        // cargaba su remate desde el panel leía después "no tenés ningún remate
        // publicado este mes" en su propio reporte — la contradicción más directa
        // posible entre lo que hizo y lo que le decimos que hizo.
        rematesPorMes: rematesPorMes(
          [
            ...(rematesData as Array<{ consignatariaSlug?: string; date?: string }>),
            ...ownerAuctions.map((a) => ({
              consignatariaSlug: consignataria.canonical_slug,
              date: a.date,
            })),
          ],
          consignataria.canonical_slug,
        ),
      })
    } catch (e) {
      // El panel no se cae por el bloque de performance.
      console.error('[dashboard] performance falló:', e)
    }
  }

  // Distribución auditable (Epic D): a cuántos les llegaron sus remates.
  let distribucion: ResumenDistribucion | null = null
  if (consignataria) {
    distribucion = await getDistribucion(
      service as unknown as Parameters<typeof getDistribucion>[0],
      consignataria.canonical_slug,
    )
  }

  // Benchmark contra el mercado de Cañuelas. Es lo único del panel que su propio
  // CRM no puede reemplazar: su sistema tiene sus liquidaciones, no las de las otras
  // 21 casas. Devuelve null si la firma no opera en el MAG (la mayoría del interior).
  let benchmark: Benchmark | null = null
  let cartera: Cartera | null = null
  let participacion: Participacion | null = null
  if (consignataria) {
    // En paralelo: son tres lecturas del MAG y no dependen entre sí.
    ;[benchmark, cartera, participacion] = await Promise.all([
      getBenchmark(service as unknown as Parameters<typeof getBenchmark>[0], consignataria.canonical_slug),
      getCartera(service as unknown as Parameters<typeof getCartera>[0], consignataria.canonical_slug),
      getParticipacion(service as unknown as Parameters<typeof getParticipacion>[0], consignataria.canonical_slug),
    ])
  }

  // TERRITORIO — el mapa de dónde la firma NO tiene remitentes, sobre productores que ya
  // van a Cañuelas. Es lo que su propio sistema no puede contestar: el CRM tiene a los
  // que ya son clientes. Sólo Buenos Aires, que es donde el origen del lote se resuelve
  // a partido con precisión.
  let territorio: Territorio | null = null
  if (consignataria) {
    const magId = await magIdDeSlug(
      service as unknown as Parameters<typeof magIdDeSlug>[0],
      consignataria.canonical_slug,
    )
    if (magId != null) {
      territorio = await construirTerritorio(
        service as unknown as Parameters<typeof construirTerritorio>[0],
        magId,
      )
    }
  }

  // AGENDA REGIONAL — el bloque de las 109 casas que NO rematan en Cañuelas y para
  // las que no hay dato transaccional. Sale del calendario, así que sirve para todas;
  // se calcula siempre porque la pregunta que responde (con quién comparto fecha) es
  // distinta de la del MAG.
  let agenda: AgendaRegional | null = null
  if (consignataria) {
    agenda = await getAgendaRegional(
      service as unknown as Parameters<typeof getAgendaRegional>[0],
      consignataria.canonical_slug,
      rematesData as Parameters<typeof getAgendaRegional>[2],
    )
  }

  // BANDEJA — junta todas las señales en una sola lista ordenada por lo que está en
  // juego. Va última en el cálculo porque consume lo que los demás bloques ya
  // resolvieron; es una función pura, no vuelve a consultar nada.
  let bandeja: Bandeja | null = null
  if (consignataria) {
    bandeja = construirBandeja({
      cartera,
      benchmark,
      participacion,
      leadsNuevos: leads
        .filter((l) => (l.status ?? 'new') === 'new')
        .slice(0, 10)
        .map((l) => ({ id: l.id, name: l.name, created_at: l.created_at, message: l.message })),
      proximosRemates: ownerAuctions
        .filter((a) => a.date >= today)
        .map((a) => ({ title: a.title, date: a.date })),
      faltaWhatsapp: !consignataria.whatsapp,
    })
  }

  // Get total remate watchers (demand signal)
  // Demanda directa: productores que SIGUEN a la casa (user_favorites, del
  // FollowButton del perfil) y marcas en sus remates (remate_marks).
  let followersCount = 0
  let marksCount = 0
  if (consignataria) {
    try {
      const [{ count: fc }, { count: mc }] = await Promise.all([
        service
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('consignataria_slug', consignataria.canonical_slug),
        service
          .from('remate_marks')
          .select('*', { count: 'exact', head: true })
          .eq('consignataria_slug', consignataria.canonical_slug),
      ])
      followersCount = fc ?? 0
      marksCount = mc ?? 0
    } catch {
      /* tablas nuevas — el dashboard no se cae por esto */
    }
  }

  let totalWatchers = 0
  if (consignataria) {
    try {
      const { count: watcherCount } = await service
        .from('remate_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)

      totalWatchers = watcherCount ?? 0
    } catch {
      // Table may not exist yet
      totalWatchers = 0
    }
  }

  // Calculate percentile vs other consignatarias (for PRO dashboard)
  let viewPercentile = 0
  if (consignataria && viewCount > 0) {
    // Get view counts for all claimed consignatarias in last 30 days
    const { data: allViews } = await service
      .from('profile_views')
      .select('entity_slug')
      .eq('entity_type', 'consignataria')
      .gte('viewed_at', thirtyDaysAgo)
    
    if (allViews && allViews.length > 0) {
      // Count views per slug
      const viewsBySlug: Record<string, number> = {}
      for (const v of allViews) {
        viewsBySlug[v.entity_slug] = (viewsBySlug[v.entity_slug] || 0) + 1
      }
      
      // Calculate percentile
      const allCounts = Object.values(viewsBySlug).sort((a, b) => a - b)
      const myCount = viewCount
      const belowMe = allCounts.filter(c => c < myCount).length
      viewPercentile = Math.round((belowMe / allCounts.length) * 100)
    }
  }

  // Calculate provincial ranking (by number of remates)
  let provincialRank = { position: 0, total: 0, province: '' }
  if (consignataria) {
    // Get all auctions grouped by consignataria
    const allAuctions = rematesData as { consignatariaSlug: string; province: string }[]
    
    // Find this consignataria's province from their auctions
    const myAuctions = allAuctions.filter(a => 
      a.consignatariaSlug === consignataria.canonical_slug ||
      a.consignatariaSlug?.toLowerCase().includes(consignataria.canonical_slug.toLowerCase())
    )
    const myProvince = myAuctions[0]?.province || ''
    
    if (myProvince) {
      // Count remates per consignataria in this province
      const provinceAuctions = allAuctions.filter(a => a.province === myProvince)
      const remateCounts: Record<string, number> = {}
      
      for (const a of provinceAuctions) {
        if (a.consignatariaSlug) {
          remateCounts[a.consignatariaSlug] = (remateCounts[a.consignatariaSlug] || 0) + 1
        }
      }
      
      // Sort by count descending
      const sorted = Object.entries(remateCounts)
        .sort(([, a], [, b]) => b - a)
      
      const myPosition = sorted.findIndex(([slug]) => 
        slug === consignataria.canonical_slug ||
        slug.toLowerCase().includes(consignataria.canonical_slug.toLowerCase())
      )
      
      provincialRank = {
        position: myPosition >= 0 ? myPosition + 1 : 0,
        total: sorted.length,
        province: myProvince,
      }
    }
  }

  // Fetch subscription data
  let subscription = null
  if (consignataria) {
    const { data: sub } = await service
      .from('subscriptions')
      .select('plan_name, status, current_period_end, rebill_subscription_id')
      .eq('entity_type', 'consignataria')
      .eq('entity_slug', consignataria.canonical_slug)
      .in('status', ['active', 'past_due'])
      .single()

    subscription = sub
  }

  // GATE DE CONTACTO — el teléfono y el email de un lead son LO que se paga, así
  // que no pueden salir del server si la firma no es PRO. Enmascararlos sólo al
  // renderizar no alcanza: los props de un client component viajan en el HTML y se
  // leen desde el inspector. Acá se borran antes de cruzar el límite.
  //
  // Lo que SÍ viaja: nombre, fecha, mensaje y origen. Eso prueba que el lead es
  // real —que es lo que hace que valga la pena pagar— sin entregar lo accionable.
  //
  // Lo mismo vale para los bloques del Mercado: la cartera trae nombres de los
  // productores que le consignan a esa casa —datos de terceros— y es justo lo que se
  // cobra. Al FREE se le muestra la FORMA del bloque con datos de ejemplo
  // (`lib/reports/muestras.ts`), así que el dato verdadero directamente no sale de
  // acá. `hayDatosMag` le dice al cliente si la firma opera en Cañuelas, para saber
  // si tiene sentido ofrecerle la muestra o no mostrar nada.
  let hayDatosMag = false
  if (consignataria) {
    const { isPro } = await getConsignatariaPlanStatus(consignataria.canonical_slug)
    hayDatosMag = !!(cartera || benchmark || participacion)
    if (!isPro) {
      leads = leads.map((l) => ({ ...l, phone: null, email: null }))
      cartera = null
      benchmark = null
      participacion = null
      territorio = null
      // La bandeja se rearma sin las señales del MAG: sus entradas citan nombres de
      // remitentes y cifras de la cartera.
      bandeja = construirBandeja({
        cartera: null,
        benchmark: null,
        participacion: null,
        leadsNuevos: leads
          .filter((l) => (l.status ?? 'new') === 'new')
          .slice(0, 10)
          .map((l) => ({ id: l.id, name: l.name, created_at: l.created_at, message: l.message })),
        proximosRemates: ownerAuctions
          .filter((a) => a.date >= today)
          .map((a) => ({ title: a.title, date: a.date })),
        faltaWhatsapp: !consignataria.whatsapp,
      })
    }
  }

  // Compute completed fields for onboarding checklist
  const completedFields = consignataria
    ? {
        phone: !!consignataria.phone,
        email: !!consignataria.email,
        website: !!consignataria.website,
        description: !!consignataria.description,
        whatsapp: !!consignataria.whatsapp,
      }
    : null

  // Get DTE count for this user
  let dteCount = 0
  const { count: userDteCount } = await service
    .from('user_dtes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  dteCount = userDteCount ?? 0

  // Check if user has already redeemed points for PRO
  let alreadyRedeemed = false
  try {
    const { data: pointRedemption } = await service
      .from('point_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    alreadyRedeemed = !!pointRedemption
  } catch {
    // Table may not exist yet - default to false
    alreadyRedeemed = false
  }

  // Frigorífico PRO — catálogo de carne + pedidos mayoristas (RFQ) para el panel.
  let frigoProducts: FrigoProduct[] = []
  let frigoRfqs: FrigoRfq[] = []
  let frigoIsPro = false
  if (frigorifico) {
    frigoIsPro = (await getFrigorificoPlanStatus(frigorifico.cuit)).isPro
  }
  if (frigorifico) {
    const [prodRes, rfqRes] = await Promise.all([
      service
        .from('frigorifico_products')
        .select('id, producto, categoria, estado, presentacion, unidad_venta, unidades_por_bulto, pedido_minimo, precio_modo, precio_desde, precio_kg, segmento, disponibilidad, interprovincial, status')
        .eq('frigorifico_cuit', frigorifico.cuit)
        .order('created_at', { ascending: false }),
      service
        .from('frigorifico_rfq')
        .select('id, provincia_entrega, tipo_comprador, nombre, empresa, whatsapp, email, mensaje, producto_snapshot, estado, created_at')
        .eq('frigorifico_cuit', frigorifico.cuit)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    frigoProducts = (prodRes.data as FrigoProduct[]) || []
    frigoRfqs = (rfqRes.data as FrigoRfq[]) || []
  }

  return (
    <DashboardClient
      email={user.email!}
      consignataria={consignataria}
      claims={claims || []}
      scrapedAuctions={scrapedAuctions}
      ownerAuctions={ownerAuctions}
      auctionResults={auctionResults || []}
      viewCount={viewCount}
      whatsappClicks={whatsappClicks}
      leadsCount={leadsCount}
      followersCount={followersCount}
      marksCount={marksCount}
      leads={leads}
      totalWatchers={totalWatchers}
      viewPercentile={viewPercentile}
      provincialRank={provincialRank}
      completedFields={completedFields}
      subscription={subscription}
      frigorifico={frigorifico}
      frigoClaims={frigoClaims || []}
      frigoProducts={frigoProducts}
      frigoRfqs={frigoRfqs}
      frigoIsPro={frigoIsPro}
      performance={performance}
      benchmark={benchmark}
      cartera={cartera}
      territorio={territorio}
      territorioTitular={territorio ? titularTerritorio(territorio) : ''}
      participacion={participacion}
      bandeja={bandeja}
      hayDatosMag={hayDatosMag}
      agenda={agenda}
      distribucion={distribucion}
      dteCount={dteCount}
      alreadyRedeemed={alreadyRedeemed}
    />
  )
}
