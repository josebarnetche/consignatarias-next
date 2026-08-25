/**
 * auto-approve.ts — que una consignataria abra su panel sin que nadie la habilite.
 *
 * EL PROBLEMA
 * Reclamar el perfil dejaba el pedido en `pending` y la aprobación la hacía una
 * persona desde /admin/claims. Con eso, cada firma que quiere entrar depende de que
 * alguien mire un mail: si es un domingo, espera al lunes. No escala y, peor, la
 * primera experiencia de la casa con el producto es una sala de espera.
 *
 * POR QUÉ NO SE PODÍA AUTOMATIZAR ANTES
 * El endpoint de claims lo dice sin vueltas: el magic link "cae en el inbox del dueño
 * real si el email es correcto, o en el del atacante si no". Aprobar por el solo hecho
 * de completar un formulario le regalaría el perfil de cualquier casa a cualquiera.
 *
 * LA PRUEBA DE POSESIÓN QUE SÍ SIRVE
 * El registro ya tiene el email de 102 de las 130 firmas, sacado de sus propias
 * fuentes públicas. Si quien reclama **controla ese inbox**, es la firma —o alguien
 * con acceso al correo de la firma, que a estos efectos es lo mismo—. Y controlar el
 * inbox está probado por el magic link: sin abrirlo no hay sesión.
 *
 * Entonces la regla es: hay sesión iniciada + el email de esa sesión coincide con el
 * que el registro ya tenía ⇒ se aprueba sola. Todo lo demás sigue yendo a revisión.
 *
 * DOS NIVELES DE COINCIDENCIA
 *  · **Exacta** — `oficina@kyl.com.ar` reclama `kofman-y-lissarrague`, que tiene
 *    justamente ese email. Vale para las 102 firmas con email cargado.
 *  · **Mismo dominio propio** — `ventas@kyl.com.ar` también sirve, porque el dominio
 *    es de la firma. Vale para las 72 con dominio corporativo. **Nunca** aplica a
 *    gmail/hotmail y compañía: ahí compartir dominio no prueba absolutamente nada.
 *
 * Las 28 firmas sin email registrado siguen pasando por revisión humana. Es la
 * excepción, no la regla.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Dominios de correo masivo. Compartir uno de estos no dice nada sobre pertenecer a
 * la misma empresa, así que con ellos sólo vale la coincidencia exacta.
 */
const DOMINIOS_GENERICOS = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.com.ar', 'hotmail.es',
  'outlook.com', 'outlook.com.ar', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.com.ar', 'yahoo.es',
  'icloud.com', 'me.com',
  'speedy.com.ar', 'fibertel.com.ar', 'arnet.com.ar', 'ciudad.com.ar',
  'protonmail.com', 'proton.me', 'zoho.com', 'aol.com',
])

export type MotivoAprobacion = 'email_exacto' | 'dominio_propio'

export interface ResultadoVerificacion {
  aprobar: boolean
  motivo: MotivoAprobacion | null
  /** Por qué NO se aprobó, para dejarlo escrito en el claim. */
  detalle: string
}

/**
 * Dominio de un email, o '' si la dirección no tiene forma de email.
 *
 * Exige **exactamente un** `@`. La primera versión hacía `split('@')[1]`, y con
 * `oficina@kyl.com.ar@evil.com` eso devuelve `kyl.com.ar` —el pedazo del medio— así
 * que la función creía que el dominio era el de la firma y **aprobaba**. Un email
 * malformado se rechaza de plano en vez de intentar interpretarlo.
 */
function dominio(email: string): string {
  const partes = email.toLowerCase().trim().split('@')
  if (partes.length !== 2) return ''
  const d = partes[1]
  // Un dominio sin punto (o que empieza/termina en punto) no es un dominio real.
  return /^[^.]+(\.[^.]+)+$/.test(d) ? d : ''
}

/**
 * ¿El email de la sesión prueba que quien reclama es de la firma?
 *
 * Pura, sin I/O: recibe el email registrado y el del reclamante, y decide. Así se
 * puede testear cada caso sin base de datos.
 */
export function verificarPosesion(
  emailRegistrado: string | null | undefined,
  emailReclamante: string,
): ResultadoVerificacion {
  const reclamante = emailReclamante.toLowerCase().trim()
  const registrado = emailRegistrado?.toLowerCase().trim()

  if (!registrado) {
    return {
      aprobar: false,
      motivo: null,
      detalle: 'La firma no tiene email en el registro: no hay contra qué verificar.',
    }
  }

  const dReg = dominio(registrado)
  const dRec = dominio(reclamante)

  // Una dirección malformada no se compara con nada: va a revisión.
  if (!dReg || !dRec) {
    return { aprobar: false, motivo: null, detalle: 'El email no tiene un formato verificable.' }
  }

  if (registrado === reclamante) {
    return { aprobar: true, motivo: 'email_exacto', detalle: 'Coincide con el email del registro.' }
  }

  if (dReg && dReg === dRec && !DOMINIOS_GENERICOS.has(dReg)) {
    return {
      aprobar: true,
      motivo: 'dominio_propio',
      detalle: `Mismo dominio propio de la firma (@${dReg}).`,
    }
  }

  if (dReg && dReg === dRec) {
    return {
      aprobar: false,
      motivo: null,
      detalle: `Coinciden en @${dReg}, que es un correo masivo y no prueba pertenencia.`,
    }
  }

  return {
    aprobar: false,
    motivo: null,
    detalle: `El email no coincide con el del registro (@${dReg}).`,
  }
}

export interface AutoAprobacion {
  aprobado: boolean
  slug: string | null
  motivo: MotivoAprobacion | null
  detalle: string
}

/**
 * Intenta habilitar sola a la firma del usuario que acaba de iniciar sesión.
 *
 * Se llama al entrar al panel: si hay un claim pendiente para ese email y la posesión
 * se puede probar, hace exactamente lo mismo que hacía el admin a mano (marcar la
 * firma como reclamada y verificada, rechazar los otros pedidos por la misma casa y
 * dar el rol de owner) y devuelve el panel ya abierto.
 *
 * Nunca lanza: si algo falla, el claim se queda pendiente y lo resuelve una persona,
 * que es el comportamiento de antes.
 */
export async function intentarAutoAprobar(
  db: SupabaseClient,
  emailUsuario: string,
  userId: string,
): Promise<AutoAprobacion> {
  const nada: AutoAprobacion = { aprobado: false, slug: null, motivo: null, detalle: '' }
  try {
    const { data: claim } = await db
      .from('consignataria_claims')
      .select('id, consignataria_slug, claimant_email')
      .eq('claimant_email', emailUsuario)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!claim) return nada
    const c = claim as { id: string; consignataria_slug: string; claimant_email: string }

    // Si la casa ya tiene dueño, este pedido no puede prosperar solo.
    const { data: firma } = await db
      .from('consignatarias')
      .select('email, claimed_by_email, display_name')
      .eq('canonical_slug', c.consignataria_slug)
      .maybeSingle()
    const f = firma as { email: string | null; claimed_by_email: string | null; display_name: string } | null

    if (!f) return nada
    if (f.claimed_by_email && f.claimed_by_email !== emailUsuario) {
      return { ...nada, detalle: 'La firma ya fue reclamada por otra persona.' }
    }

    const veredicto = verificarPosesion(f.email, emailUsuario)
    if (!veredicto.aprobar) {
      // Queda pendiente, pero con el motivo escrito para que la revisión humana no
      // tenga que volver a razonarlo.
      await db
        .from('consignataria_claims')
        .update({ admin_notes: `Auto-verificación: ${veredicto.detalle}` })
        .eq('id', c.id)
      return { ...nada, slug: c.consignataria_slug, detalle: veredicto.detalle }
    }

    // --- Aprobación (mismos pasos que la ruta de admin) ---
    await db
      .from('consignataria_claims')
      .update({ status: 'approved', admin_notes: `Auto-aprobado: ${veredicto.detalle}` })
      .eq('id', c.id)

    await db
      .from('consignatarias')
      .update({
        verified: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: emailUsuario,
      })
      .eq('canonical_slug', c.consignataria_slug)

    await db
      .from('consignataria_claims')
      .update({ status: 'rejected', admin_notes: 'Otra solicitud fue aprobada' })
      .eq('consignataria_slug', c.consignataria_slug)
      .eq('status', 'pending')
      .neq('id', c.id)

    await db
      .from('user_roles')
      .upsert({ user_id: userId, email: emailUsuario, role: 'owner' }, { onConflict: 'user_id' })

    return {
      aprobado: true,
      slug: c.consignataria_slug,
      motivo: veredicto.motivo,
      detalle: veredicto.detalle,
    }
  } catch (e) {
    console.error('[auto-approve] falló, el claim queda pendiente:', e)
    return nada
  }
}
