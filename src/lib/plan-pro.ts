/**
 * plan-pro.ts — PRO abierto: el plan que puede contratar cualquiera.
 *
 * QUÉ CAMBIA RESPECTO DE ANTES
 * PRO Usuario se retiró en julio de 2026 y desde entonces las herramientas del productor
 * son gratis para todos. Eso sigue igual: **no se vuelve atrás con nada de lo que hoy
 * está abierto**. Lo que se abre es un plan que cualquiera —productor, contador, corredor,
 * veterinario, frigorífico— puede contratar para tres cosas puntuales que hasta ahora no
 * existían o estaban sueltas.
 *
 * PRO Consignataria (ARS 45.000/mes) es OTRO producto y no se toca: es B2B, va sobre una
 * firma con perfil reclamado y da leads y alcance. Este es personal y va sobre la cuenta.
 *
 * LA REGLA DE QUÉ SE PUEDE GATEAR
 * Sólo entra acá lo que no rompe el motor de descubrimiento. Queda afuera, y por escrito:
 * el número del día, los precios observados de cada firma con su `DatasetSchema`, los
 * feeds `webcal`, las 52 guías, el comparador y `/mercado/spread`. Esa superficie es la
 * que hace que los asistentes nos citen —799 sesiones de Copilot y ChatGPT en diez
 * semanas— y `/mercado/spread` es además la página más leída del sitio, con 5,7 % de
 * conversión. Cerrar eso sería cambiar conversión por unos pesos.
 */

export interface FuncionPremium {
  clave: string
  nombre: string
  /** Qué se lleva quien paga, concreto. Va en el muro y en la página de PRO. */
  beneficio: string
  /** Qué sigue viendo gratis el que no paga. Se publica: el muro no esconde el límite. */
  gratis: string
}

/** Lo único que se cobra. Si algo no está acá, está abierto. */
export const FUNCIONES_PREMIUM: FuncionPremium[] = [
  {
    clave: 'historico-profundo',
    nombre: 'Las series completas',
    beneficio:
      'El INMAG y la relación maíz/novillo desde 2015, con la estacionalidad de once años. Para ver dónde cae el número de hoy en su propia historia.',
    gratis: 'El número del día y los últimos doce meses de cada serie.',
  },
  {
    clave: 'exportar',
    nombre: 'Exportar los datos',
    beneficio:
      'Bajar las series en CSV para trabajarlas en tu planilla, y el calendario completo de remates.',
    gratis: 'Ver todo en pantalla, y el feed webcal del calendario para suscribirte.',
  },
  {
    clave: 'alertas',
    nombre: 'Todas las alertas',
    beneficio:
      'Alertas por categoría, por zona y por umbral propio, sin límite de cuántas tengas.',
    gratis: 'La alerta del novillo en dólares, que es la que más se usa y no se toca.',
  },
]

/**
 * El plan.
 *
 * Precio en rango, como todo lo del catálogo. El recomendado retoma el punto donde estaba
 * PRO Usuario cuando se retiró: es un número que el mercado ya vio y que queda muy por
 * debajo del piso profesional (ARS 200.000 de suscripción anual a una revista técnica,
 * ARS 450.000 el día de campo de un agrónomo).
 */
export const PRO_ABIERTO = {
  slug: 'pro-abierto',
  nombre: 'PRO',
  tagline: 'Las series completas, la exportación y todas las alertas. Para cualquiera.',
  precioMin: 7900,
  precioMax: 12000,
  precio: 9900,
  /** Meta y fecha de corte, igual que el resto del catálogo. */
  metaArs: 200000,
  fechaCorte: '2026-12-31',
  siNoLlega:
    'Se retira el cobro y las tres funciones vuelven a quedar abiertas con cuenta. No se pierde nada construido: el gate se apaga con un flag y el histórico sigue siendo el activo de citabilidad que ya es.',
} as const

export function esFuncionPremium(clave: string): boolean {
  return FUNCIONES_PREMIUM.some((f) => f.clave === clave)
}
