/**
 * Account-nudge bus — the "nudge-first" account layer.
 *
 * Doctrine (CLAUDE.md): the producer pays nothing and is never blocked. So this
 * is NOT a gate. A feature's action ALWAYS completes; afterwards, at high-intent
 * moments (save a consignataria, run a calc, subscribe to an alert, reveal a
 * contact), we softly invite the anonymous user to create a FREE account with
 * Google — for retention, not revenue. The invite is dismissible and snoozed.
 *
 * The root layout mounts the global <AccountNudge /> once (a sibling, like the
 * WhatsApp FAB) which subscribes here. Any client component fires a nudge with a
 * one-liner: `requestAccountNudge({ reason: 'save_follow' })`. No provider/context
 * wrapping is needed, keeping pages SSG and the change purely additive.
 */

export type NudgeReason =
  | 'save_follow'
  | 'calc_result'
  | 'alert_subscribe'
  | 'contact_reveal'
  | 'calendar_export'

export interface NudgePayload {
  reason: NudgeReason
  /** 'strong' = highest-intent (e.g. revealing a 2nd contact). Slightly more insistent copy/style. */
  strength?: 'soft' | 'strong'
}

type Listener = (payload: NudgePayload) => void

const listeners = new Set<Listener>()

/** Subscribe the global toast. Returns an unsubscribe fn. */
export function onAccountNudge(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Fire a nudge. Safe to call unconditionally — the global toast decides whether
 * to actually show it (suppresses for logged-in users and while snoozed). No-op
 * during SSR.
 */
export function requestAccountNudge(payload: NudgePayload): void {
  if (typeof window === 'undefined') return
  listeners.forEach((l) => l(payload))
}
