import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { slugCampo } from '@/lib/campos'
import { revalidatePath } from 'next/cache'

/**
 * Moderación de campos. Todo aviso entra `pendiente` y nada sale sin que un
 * humano lo mire: los datos los declara quien ofrece y publicamos con nuestro
 * nombre al lado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const status = req.nextUrl.searchParams.get('status') || 'pendiente'
  const db = requireServiceClient()

  let q = db.from('campos').select('*').order('created_at', { ascending: false })
  if (status !== 'todos') q = q.eq('status', status)

  const { data, error } = await q
  if (error) {
    console.error('Admin campos fetch error:', error)
    return NextResponse.json({ error: 'Error al obtener campos' }, { status: 500 })
  }
  return NextResponse.json({ campos: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const body = (await req.json().catch(() => ({}))) as {
    id?: number
    accion?: 'publicar' | 'rechazar' | 'pausar' | 'destacar' | 'quitar_destacado'
    notas?: string
  }
  const { id, accion } = body
  if (!id || !accion) return NextResponse.json({ error: 'Falta id o acción' }, { status: 400 })

  const db = requireServiceClient()
  const { data: campo } = await db.from('campos').select('*').eq('id', id).maybeSingle()
  if (!campo) return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 })

  const c = campo as { id: number; slug: string | null; provincia: string; partido: string | null; hectareas: number; operacion: string }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.notas !== undefined) patch.notas_internas = body.notas

  switch (accion) {
    case 'publicar':
      patch.status = 'publicado'
      patch.published_at = new Date().toISOString()
      // El slug se arma acá porque necesita el id, que recién existe tras el insert.
      if (!c.slug) patch.slug = slugCampo(c)
      break
    case 'rechazar':
      patch.status = 'rechazado'
      break
    case 'pausar':
      patch.status = 'pausado'
      break
    case 'destacar':
      patch.destacado = true
      break
    case 'quitar_destacado':
      patch.destacado = false
      break
  }

  const { error } = await db.from('campos').update(patch).eq('id', id)
  if (error) {
    console.error('Admin campos update error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  }

  // El listado y la ficha son estáticos con revalidate: sin esto, un campo
  // aprobado no aparece hasta que caduque el cache.
  revalidatePath('/campos')
  if (patch.slug || c.slug) revalidatePath(`/campos/${patch.slug ?? c.slug}`)

  return NextResponse.json({ ok: true, slug: patch.slug ?? c.slug })
}
