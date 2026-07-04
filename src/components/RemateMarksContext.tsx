'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface MarksState {
  counts: Record<string, number>
  mine: Set<string>
  ready: boolean
  bump: (remateId: string, marked: boolean) => void
}

const Ctx = createContext<MarksState>({
  counts: {},
  mine: new Set(),
  ready: false,
  bump: () => {},
})

/**
 * Provider del social proof de remates: trae { counts, mine } de
 * /api/remates/marks/summary una vez y lo comparte con todos los RemateMarkButton,
 * para mostrar "X fueron" y reflejar la marca propia. bump() actualiza optimista.
 */
export function RemateMarksProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/remates/marks/summary', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { counts?: Record<string, number>; mine?: string[] } | null) => {
        if (cancelled || !d) return
        setCounts(d.counts ?? {})
        setMine(new Set(d.mine ?? []))
        setReady(true)
      })
      .catch(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [])

  function bump(remateId: string, marked: boolean) {
    setCounts((c) => ({ ...c, [remateId]: Math.max(0, (c[remateId] ?? 0) + (marked ? 1 : -1)) }))
    setMine((m) => {
      const n = new Set(m)
      if (marked) n.add(remateId)
      else n.delete(remateId)
      return n
    })
  }

  return <Ctx.Provider value={{ counts, mine, ready, bump }}>{children}</Ctx.Provider>
}

export function useRemateMarks() {
  return useContext(Ctx)
}
