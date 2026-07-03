import { describe, it, expect } from 'vitest'
import { parseTypes, parseSql, extractRefs } from './check-db-refs.mjs'

// Fixture con el formato del generador de tipos de Supabase.
const TYPES_FIXTURE = `export type Database = {
  public: {
    Tables: {
      alertas: {
        Row: { id: string }
      }
      user_favorites: {
        Row: { id: string }
      }
    }
    Views: {
      consignataria_followers: {
        Row: { follower_count: number }
      }
    }
    Functions: {
      increment_api_usage: {
        Args: { p: string }
      }
    }
    Enums: {
      some_enum: "a" | "b"
    }
  }
}`

describe('parseTypes', () => {
  const { tables, fns } = parseTypes(TYPES_FIXTURE)
  it('extrae tablas y vistas como targets de .from()', () => {
    expect(tables.has('alertas')).toBe(true)
    expect(tables.has('user_favorites')).toBe(true)
    expect(tables.has('consignataria_followers')).toBe(true) // view
  })
  it('extrae funciones como targets de .rpc()', () => {
    expect(fns.has('increment_api_usage')).toBe(true)
  })
  it('NO confunde enums con tablas', () => {
    expect(tables.has('some_enum')).toBe(false)
    expect(fns.has('some_enum')).toBe(false)
  })
})

describe('parseSql', () => {
  it('detecta create table (con y sin IF NOT EXISTS / public.)', () => {
    const { tables } = parseSql(
      'CREATE TABLE IF NOT EXISTS public.user_dtes (id uuid);\ncreate table remate_favorites (id int);',
    )
    expect(tables.has('user_dtes')).toBe(true)
    expect(tables.has('remate_favorites')).toBe(true)
  })
  it('detecta views y functions', () => {
    const { tables, fns } = parseSql(
      'CREATE VIEW consignataria_followers AS SELECT 1;\nCREATE OR REPLACE FUNCTION get_remate_watchers(p int) RETURNS bigint AS $$ $$;',
    )
    expect(tables.has('consignataria_followers')).toBe(true)
    expect(fns.has('get_remate_watchers')).toBe(true)
  })
})

describe('extractRefs', () => {
  it('captura .from() y .rpc() literales', () => {
    const refs = extractRefs(`
      const a = supabase.from('alertas').select('*')
      const b = service.rpc('increment_api_usage', {})
    `)
    expect(refs).toContainEqual(expect.objectContaining({ kind: 'from', name: 'alertas' }))
    expect(refs).toContainEqual(expect.objectContaining({ kind: 'rpc', name: 'increment_api_usage' }))
  })
  it('IGNORA .from() dentro de comentarios (// y /* */)', () => {
    const refs = extractRefs(`
      // supabase.from('comentado_linea')
      /* supabase.from('comentado_bloque') */
      const ok = db.from('real')
    `)
    const names = refs.map((r) => r.name)
    expect(names).toContain('real')
    expect(names).not.toContain('comentado_linea')
    expect(names).not.toContain('comentado_bloque')
  })
  it('NO captura nombres con guion (ej. buckets de storage)', () => {
    const refs = extractRefs(`supabase.storage.from('consignataria-assets')`)
    expect(refs.map((r) => r.name)).not.toContain('consignataria-assets')
  })
  it('preserva el número de línea real', () => {
    const refs = extractRefs(`line1\nline2\nconst x = db.from('alertas')`)
    expect(refs[0].line).toBe(3)
  })
})
