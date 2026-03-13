import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  // Check remates data availability
  let rematesCount = 0
  let rematesHoy = 0
  let apiStatus = 'healthy'
  
  try {
    // Quick check of remates data
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.consignatarias.com.ar'}/api/remates/stats`, {
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      rematesCount = data.data?.resumen?.totalRemates || 0
      rematesHoy = data.data?.resumen?.rematesHoy || 0
    } else {
      apiStatus = 'degraded'
    }
  } catch (error) {
    apiStatus = 'degraded'
  }
  
  const responseTime = Date.now() - startTime
  
  return NextResponse.json({
    status: apiStatus,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    metrics: {
      responseTimeMs: responseTime,
      totalRemates: rematesCount,
      rematesHoy: rematesHoy
    },
    endpoints: {
      '/api/remates/proximos': 'active',
      '/api/remates/hoy': 'active',
      '/api/remates/stats': 'active',
      '/api/remates/buscar': 'active',
      '/api/remates/calendario': 'active',
      '/api/consignataria/[slug]': 'active',
      '/api/webhooks/register': 'active',
      '/api/precios': 'active',
      '/api/alertas': 'active',
      '/api/alertas/[alerta_id]': 'active',
      '/api/status': 'active'
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
