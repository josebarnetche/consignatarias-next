import { NextResponse } from 'next/server'
import { construirPared, hoyArgentina } from '@/lib/remates-en-vivo'

/**
 * El estado de las transmisiones, ahora.
 *
 * Lo consulta el muro de `/remates/en-vivo` cada medio minuto. Existe porque la
 * página es estática con revalidación: sirve para la primera pintada, pero una
 * vez abierta no se entera de que un remate arrancó. Un comprador que deja la
 * pestaña puesta toda la tarde —que es exactamente el uso de esta página— tiene
 * que ver aparecer las ferias solas.
 *
 * Es público y no toca datos de nadie: devuelve qué se está transmitiendo y el
 * teléfono que la propia ficha ya muestra. No lleva lead ni identidad.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const hoy = hoyArgentina()
    const streams = await construirPared(hoy, 30)
    return NextResponse.json(
      {
        generado: new Date().toISOString(),
        hoy,
        alAire: streams.filter((s) => s.enVivoAhora).length,
        streams,
      },
      {
        headers: {
          // 20 s de CDN con ventana de gracia: con varios mirando la misma
          // tarde, YouTube recibe una consulta cada 20 s y no una por visitante.
          'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
        },
      },
    )
  } catch (e) {
    // El muro ya tiene datos en pantalla: ante un fallo se queda con los suyos.
    // Devolver 200 con la lista vacía sería peor — le borraría los players.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'error' },
      { status: 500 },
    )
  }
}
