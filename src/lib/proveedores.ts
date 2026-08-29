/**
 * proveedores.ts — empresas que le venden a la cadena de la carne.
 *
 * QUÉ ES Y QUÉ NO ES
 * No es publicidad ni un listado paga-y-aparecés. Es una guía de proveedores para que el
 * usuario del sitio —una consignataria, un frigorífico, una marca de carne— pueda decir
 * "quiero que me contacten" sin tener que salir a buscar quién hace ese servicio.
 *
 * REGLA DE CONTACTO: **el teléfono y el email del proveedor NO viven acá.**
 * Están en la tabla `proveedor_contactos` de Supabase, service-role only, y se leen sólo
 * al momento de derivar un lead. **Este repositorio es público**: una casilla en el
 * código queda indexada en GitHub, que es el mismo scraping que se evita al no
 * publicarla en el HTML. La conformidad que dieron fue para aparecer con el nombre de la
 * empresa y recibir consultas — no para que su mail quede en un repo abierto.
 *
 * El interesado deja SUS datos y nosotros se los pasamos.
 *
 * Igual que `guias-premium.ts`, el catálogo es código: entra y sale con un deploy, y el
 * sales page, el formulario y el ruteo del lead leen exactamente lo mismo.
 */

export interface Proveedor {
  slug: string
  /** Nombre comercial, tal como se publica. */
  empresa: string
  /** Qué hace, en las palabras del rubro. Es lo que se indexa. */
  rubro: string
  /** Una línea sobre el servicio. */
  descripcion: string
  /** A quién le sirve. Se muestra como chips. */
  leSirveA: string[]
  provincia: string
  publicado: boolean
}

export const PROVEEDORES: Proveedor[] = [
  {
    slug: 'grafica-fabbro',
    empresa: 'Gráfica Fabbro',
    rubro: 'Etiquetas para la industria frigorífica',
    descripcion:
      'Etiquetas para plantas frigoríficas, marcas de carne y despostaderos: identificación de cortes, trazabilidad y rotulado.',
    leSirveA: ['Frigoríficos', 'Marcas de carne', 'Despostaderos', 'Distribuidoras'],
    provincia: 'Buenos Aires',
    publicado: true,
  },
]

export function getProveedor(slug: string): Proveedor | null {
  return PROVEEDORES.find((p) => p.slug === slug) ?? null
}

export function getProveedoresPublicados(): Proveedor[] {
  return PROVEEDORES.filter((p) => p.publicado)
}

/**
 * Lo único que puede cruzar al cliente.
 *
 * Con el contacto ya fuera del código, esto es casi redundante — y se mantiene igual: es
 * la barrera que hace explícito qué se publica, para que agregar un campo al catálogo no
 * lo mande al navegador sin que nadie lo decida.
 */
export interface ProveedorPublico {
  slug: string
  empresa: string
  rubro: string
  descripcion: string
  leSirveA: string[]
  provincia: string
}

export function aPublico(p: Proveedor): ProveedorPublico {
  return {
    slug: p.slug,
    empresa: p.empresa,
    rubro: p.rubro,
    descripcion: p.descripcion,
    leSirveA: p.leSirveA,
    provincia: p.provincia,
  }
}
