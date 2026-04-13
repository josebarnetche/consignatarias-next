import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false // Cost optimization: static at build time

const PLANS = {
  gratuito: {
    id: 'gratuito',
    name: 'Gratuito',
    price: 0,
    currency: 'ARS',
    billing: 'monthly',
    description: 'Presencia básica en el directorio de consignatarias argentinas.',
    features: [
      'Perfil básico en el directorio',
      'Calendario de remates visible',
      'Datos de mercado limitados',
    ],
    limits: {
      remates_per_month: 5,
      logo: false,
      analytics: false,
      api_access: true,
      api_rate_limit: '1 req/min',
      priority_support: false,
    },
    cta: null,
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    price: 45000,
    currency: 'ARS',
    billing: 'monthly',
    description: 'Perfil destacado con badge PRO, analytics de visitas y soporte prioritario.',
    features: [
      'Perfil verificado y destacado',
      'Analytics de perfil (vistas, clicks)',
      'Remates con badge PRO',
      'Logo y descripción personalizada',
      'Soporte prioritario por email',
      'Hasta 50 remates/mes',
    ],
    limits: {
      remates_per_month: 50,
      logo: true,
      analytics: true,
      api_access: true,
      api_rate_limit: '100 req/min',
      priority_support: true,
    },
    cta: {
      text: 'Suscribirse',
      url: '/planes',
    },
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Contact for pricing
    currency: 'ARS',
    billing: 'custom',
    description: 'Soluciones a medida para grandes operadores del mercado ganadero.',
    features: [
      'Dashboard personalizado',
      'API de datos de mercado completa',
      'Integración con sistemas propios',
      'Soporte dedicado con SLA',
      'Remates ilimitados',
      'Webhooks en tiempo real',
    ],
    limits: {
      remates_per_month: -1, // unlimited
      logo: true,
      analytics: true,
      api_access: true,
      api_rate_limit: 'unlimited',
      priority_support: true,
      webhooks: true,
      custom_integration: true,
    },
    cta: {
      text: 'Contactar ventas',
      url: 'mailto:agro@memola.com.ar?subject=Consulta%20Plan%20Enterprise',
    },
  },
};

export async function GET() {
  return NextResponse.json({
    success: true,
    plans: Object.values(PLANS),
    metadata: {
      default_currency: 'ARS',
      payment_provider: 'Rebill',
      contact_email: 'agro@memola.com.ar',
      updated_at: new Date().toISOString(),
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json({
    endpoints: {
      'GET /api/planes': {
        description: 'Lista todos los planes de suscripción disponibles',
        response: {
          plans: 'Array de planes con precios, features y límites',
          metadata: 'Información del proveedor de pagos y moneda',
        },
      },
    },
  });
}
