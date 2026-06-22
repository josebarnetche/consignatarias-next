import type { ReactNode } from 'react'

/* ================================================================== */
/*  DataTable — tabla terminal canónica (DESIGN-SYSTEM.md §4)          */
/*  Wrapper tipado sobre `.terminal-table` (la primitiva real de       */
/*  globals.css). Fija el contrato: número con `tabular-nums`,          */
/*  alineación `text-right` para columnas numéricas, header sticky      */
/*  opcional, tinte de fila por signo, skeleton/empty obligatorios.    */
/* ================================================================== */

export interface DataColumn<Row> {
  /** Stable key — usa también para `numeric`/`align`. */
  key: string
  /** Header label (uppercase visual ya provisto por `.terminal-table th`). */
  header: ReactNode
  /** Cell renderer. Recibe la fila y su índice. */
  cell: (row: Row, index: number) => ReactNode
  /** Columna numérica → `text-right tabular-nums` (clase `.num` del tema). */
  numeric?: boolean
  /** Oculta la columna por debajo de `sm` (densidad mobile). */
  hideBelowSm?: boolean
  /** Ancho fijo opcional (clase Tailwind, ej. "w-[160px]"). */
  width?: string
  /** Clase extra para `<th>`/`<td>` de esta columna. */
  className?: string
}

interface DataTableProps<Row> {
  columns: DataColumn<Row>[]
  rows: Row[]
  /** Key estable por fila. */
  rowKey: (row: Row, index: number) => string
  /** Href opcional por fila → toda la fila navega (no rompe SEO: <a> real). */
  rowHref?: (row: Row) => string | null | undefined
  /**
   * Tinte de fondo por signo. Devolvé `'positive'|'negative'|'neutral'` o
   * `null` para sin tinte. Pinta `bg-{tone}/[0.03]` — mismo lenguaje que el
   * resto del sistema.
   */
  rowTone?: (row: Row) => 'positive' | 'negative' | 'neutral' | null
  /** Header sticky (para tablas largas con scroll). Default false. */
  stickyHeader?: boolean
  /** Estado de carga → skeleton de N filas. */
  loading?: boolean
  /** Cantidad de filas skeleton. Default 6. */
  skeletonRows?: number
  /** Contenido cuando `rows` está vacío y no hay `loading`. */
  empty?: ReactNode
  /** Anima la entrada de filas (datos en vivo). Default false. */
  animateRows?: boolean
  /** Envoltura con scroll horizontal. Default true. */
  scroll?: boolean
  className?: string
}

const TONE_BG: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'bg-positive/[0.03]',
  negative: 'bg-negative/[0.03]',
  neutral: '',
}

/**
 * Tabla de datos terminal. Una sola forma para precio/serie/categorías.
 *
 *   <DataTable
 *     columns={[
 *       { key: 'cat', header: 'CATEGORIA', cell: r => r.name },
 *       { key: 'price', header: 'ACTUAL', numeric: true, cell: r => fmt(r.current) },
 *       { key: 'var', header: 'VAR %', numeric: true, cell: r => <Delta change={r.change} /> },
 *     ]}
 *     rows={rows}
 *     rowKey={r => r.name}
 *     rowTone={r => signedTone(r.change)}
 *   />
 */
export default function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowHref,
  rowTone,
  stickyHeader = false,
  loading = false,
  skeletonRows = 6,
  empty,
  animateRows = false,
  scroll = true,
  className = '',
}: DataTableProps<Row>) {
  const thClass = (c: DataColumn<Row>) =>
    [
      c.numeric ? 'num' : '',
      c.hideBelowSm ? 'hidden sm:table-cell' : '',
      c.width ?? '',
      c.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')

  const tdClass = (c: DataColumn<Row>) =>
    [
      c.numeric ? 'num' : '',
      c.hideBelowSm ? 'hidden sm:table-cell' : '',
      c.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')

  const table = (
    <table className="terminal-table">
      <thead className={stickyHeader ? '' : '!static'}>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={thClass(c)}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((c, ci) => (
                  <td key={c.key} className={tdClass(c)}>
                    {/* Sweep `.terminal-skeleton` — mismo lenguaje de carga    */}
                    {/* que <Skeleton> (DESIGN-SYSTEM.md §5). Primera col más    */}
                    {/* ancha (label); resto angostas (números).                */}
                    <span
                      className={`terminal-skeleton inline-block h-3 align-middle ${ci === 0 ? 'w-28' : 'w-12'}`}
                    />
                  </td>
                ))}
              </tr>
            ))
          : rows.length === 0 && empty != null
            ? (
                <tr>
                  <td colSpan={columns.length} className="text-center text-zinc-500 py-6">
                    {empty}
                  </td>
                </tr>
              )
            : rows.map((row, i) => {
                const tone = rowTone?.(row) ?? null
                const href = rowHref?.(row)
                const trClass = [
                  tone ? TONE_BG[tone] : '',
                  href ? 'cursor-pointer' : '',
                  animateRows ? 'row-enter' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <tr key={rowKey(row, i)} className={trClass}>
                    {columns.map((c, ci) => {
                      const content = c.cell(row, i)
                      // Primera celda envuelve el href para que toda la fila navegue.
                      const inner =
                        href && ci === 0 ? (
                          // Un solo lenguaje de hover/focus para fila navegable
                          // (DESIGN-SYSTEM.md §5): motion-hover + texto a zinc-100,
                          // focus-visible accesible con el mismo acento del tema.
                          <a
                            href={href}
                            className="group/row block -mx-cell -my-2 px-cell py-2 motion-hover hover:text-zinc-100 focus-visible:outline-none focus-visible:text-zinc-100 focus-visible:ring-1 focus-visible:ring-accent/40 rounded-[2px]"
                          >
                            {content}
                          </a>
                        ) : (
                          content
                        )
                      return (
                        <td key={c.key} className={tdClass(c)}>
                          {inner}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
      </tbody>
    </table>
  )

  if (!scroll) return <div className={className}>{table}</div>
  return <div className={`overflow-x-auto ${className}`.trim()}>{table}</div>
}
