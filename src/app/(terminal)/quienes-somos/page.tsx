import { ImagenTema } from '@/components/ui/ImagenTema'
import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, OrganizationSchema } from '@/components/seo/JsonLd'
import rematesData from '@/lib/data/remates.json'
import frigorificosResumen from '@/lib/data/frigorificos-summary.json'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { vrCobertura, VR_VENTANA_DIAS } from '@/lib/vr'
import { fechaLarga } from '@/lib/datos-frescura'

export const metadata: Metadata = {
  title: 'Quiénes somos',
  description:
    'Consignatarias.com.ar mide cuánto vale la hacienda hoy con lo que realmente se vendió. Quiénes lo hacemos, qué medimos, de dónde salen los datos y cómo calculamos.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Quiénes somos',
    description: 'Cuánto vale la hacienda hoy, medido en lo que realmente se vendió. Quiénes lo hacemos y cómo.',
    url: 'https://www.consignatarias.com.ar/quienes-somos',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/quienes-somos',
  },
}

const fmt = (n: number) => n.toLocaleString('es-AR')

// Cifras desde los datos del build: las escritas a mano ("1.102 plantas",
// "12 provincias") quedaban viejas apenas cambiaba el padrón o el calendario.
function cifras() {
  const hoy = new Date().toISOString().slice(0, 10)
  const remates = rematesData as { province: string; date: string; status: string }[]
  return {
    consignatarias: getAllProfiles().length,
    provincias: new Set(remates.map((r) => r.province).filter(Boolean)).size,
    proximos: remates.filter((r) => r.date >= hoy && r.status === 'scheduled').length,
    frigorificos: (frigorificosResumen as { habilitados: number }).habilitados,
    vr: vrCobertura(),
  }
}

const FUENTES = [
  'Mercado Agroganadero de Cañuelas: el índice INMAG, los precios por categoría y cada lote vendido, con el que armamos el precio por categoría y peso.',
  'Cámara Argentina de Consignatarios de Ganado (CACG) y las páginas de cada consignataria: el calendario de remates.',
  'Ministerio de Agricultura (MAGYP) y SENASA: el precio del maíz y el padrón de frigoríficos habilitados.',
  'dolarapi.com: la cotización del dólar oficial y blue.',
  'Carga manual de fuentes que no están en internet: IderCor, Etchevehere Rural, Cooperativa La Ganadera, Tradición Ganadera y otras.',
]

export default function QuienesSomosPage() {
  const c = cifras()
  const actualizado = fechaLarga()

  return (
    <>
      <SectionBreadcrumbSchema section="quienes-somos" sectionName="Quiénes somos" />
      <OrganizationSchema />
      {/* Hero — el arreo (linocut del universo de marca) */}
      <section className="relative overflow-hidden">
        <ImagenTema
          src="/marca/ilus/ilu-hero-arreo.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/25" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-zinc-950" aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-sm leading-relaxed">
          <h1 className="text-zinc-100 text-2xl font-medium mb-6">Quiénes somos</h1>
          <p className="text-zinc-200 text-base">
            Te decimos cuánto vale tu hacienda hoy, medido en lo que realmente se vendió.
          </p>
          <p className="text-zinc-400 mt-2">
            Consignatarias.com.ar es de Memola Medios S.A.S., una empresa de Mercedes, Corrientes.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Qué hacemos</h2>
        <p className="text-zinc-400 mb-3">
          El productor sabe lo que vale su hacienda cuando la vende. Nosotros queremos que lo sepa antes. Para
          eso juntamos, todos los días, lo que se vendió en el Mercado Agroganadero y lo publicamos como un
          rango por categoría y por peso: entre qué precios se vendieron lotes como el tuyo.
        </p>
        <ul className="space-y-2 text-zinc-400 mb-6">
          <li>
            <Link href="/vr" className="text-accent hover:underline">Precio por categoría y peso</Link>: el rango de
            lo que se pagó en los últimos {VR_VENTANA_DIAS} días, sobre {fmt(c.vr.lotes)} lotes vendidos.
          </li>
          <li>
            <Link href="/mi-ganado" className="text-accent hover:underline">Mi Ganado</Link>: cargás tu rodeo y te
            decimos cuánto vale hoy contra ese rango. Gratis, con tu cuenta.
          </li>
          <li>
            <Link href="/remates" className="text-accent hover:underline">Calendario de remates</Link>: {fmt(c.proximos)}{' '}
            remates por venir de {fmt(c.consignatarias)} consignatarias en {c.provincias} provincias.
          </li>
          <li>
            <Link href="/frigorificos" className="text-accent hover:underline">Frigoríficos</Link>: {fmt(c.frigorificos)}{' '}
            plantas habilitadas por SENASA, con su ficha.
          </li>
          <li>
            <Link href="/mercado" className="text-accent hover:underline">Mercado</Link>: el INMAG desde 2015, en pesos
            y en dólares, el maíz y el dólar.
          </li>
        </ul>
        <p className="text-zinc-500 text-xs mb-6">Cifras al {actualizado || 'último relevamiento'}.</p>

        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Qué medimos y cómo</h2>
        <p className="text-zinc-400 mb-3">
          Publicamos lo que se observa y decimos cuándo no alcanza. Si una categoría no junta lotes suficientes
          en la semana, no publicamos su rango. Si un número es una estimación (como el precio del ternero, que
          el Mercado Agroganadero no opera), lo rotulamos como estimación.
        </p>
        <ul className="space-y-2 text-zinc-400 mb-6">
          <li>
            <Link href="/metodologia/vr" className="text-accent hover:underline">Cómo calculamos el precio por categoría y peso</Link>
          </li>
          <li>
            <Link href="/metodologia" className="text-accent hover:underline">Metodología de todos los datos</Link>
          </li>
          <li>
            <Link href="/calidad" className="text-accent hover:underline">Calidad de los datos</Link>: qué controlamos
            y qué falta.
          </li>
        </ul>

        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">De dónde salen los datos</h2>
        <ul className="space-y-2 text-zinc-400 mb-6">
          {FUENTES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <p className="text-zinc-400 mb-6">
          Un proceso automático baja los datos todos los días a las 14 (hora argentina), los ordena, saca los
          repetidos y los controla antes de publicarlos.
        </p>

        {/* Imagen editorial — la marca a fuego (linocut del universo de marca) */}
        <ImagenTema
          src="/marca/ilus/ilu-c-marca-fuego.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="w-full rounded-xl my-8"
        />

        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Quiénes somos</h2>
        <p className="text-zinc-400 mb-3">
          Consignatarias.com.ar es un producto de <strong className="text-zinc-200">Memola Medios S.A.S.</strong>, con
          base en Mercedes, Corrientes. Su fundador es <strong className="text-zinc-200">José Barnetche</strong>.
        </p>
        <p className="text-zinc-400 mb-6">
          Para el productor todo es gratis. Lo sostienen las empresas que usan el dato en sus sistemas y las
          consignatarias que quieren destacar su firma.
        </p>

        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Contacto</h2>
        <p className="text-zinc-400 mb-6">
          Para consultas, corregir un dato o sumar tu consignataria:{' '}
          <a href="mailto:agro@memola.com.ar" className="text-accent hover:underline">
            agro@memola.com.ar
          </a>
        </p>
      </div>
    </>
  )
}
