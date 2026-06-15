/**
 * <DataStamp> — a machine-readable freshness primitive. Renders a semantic
 * <time dateTime="YYYY-MM-DD"> with the human date, marked .speakable-content so
 * the existing <SpeakableSchema> (h1 + .speakable-content) treats freshness as a
 * speakable unit at no extra schema cost.
 *
 * Honest by construction: if isoDate isn't a clean YYYY-MM-DD, it renders the raw
 * string WITHOUT a dateTime attribute rather than emit an invalid machine date.
 * The T12:00:00 anchor avoids a UTC off-by-one in the displayed day.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function DataStamp({
  isoDate,
  prefix = 'Actualizado',
  className = '',
}: {
  isoDate: string
  prefix?: string
  className?: string
}) {
  const valid = ISO_DATE.test(isoDate)
  const human = valid
    ? new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : isoDate
  const cls = `speakable-content text-zinc-200 tabular-nums${className ? ` ${className}` : ''}`
  return valid ? (
    <time dateTime={isoDate} className={cls}>
      {prefix} {human}
    </time>
  ) : (
    <time className={cls}>
      {prefix} {human}
    </time>
  )
}
