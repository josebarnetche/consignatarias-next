/**
 * El texto de error de una respuesta de la API, para mostrarlo en pantalla (18-10-2026).
 *
 * Las rutas devuelven `{ error: 'texto' }`, pero el límite de pedidos del middleware y
 * la API v1 devuelven `{ error: { code, message } }`. Poner ese objeto directo en JSX
 * tira abajo la página entera ("Objects are not valid as a React child"): pasó en el
 * panel de la firma al subir un flyer.
 */
export function mensajeError(data: unknown, porDefecto: string): string {
  const e = (data as { error?: unknown } | null)?.error
  if (typeof e === 'string' && e) return e
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return porDefecto
}
