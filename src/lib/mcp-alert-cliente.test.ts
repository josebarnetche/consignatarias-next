import { describe, expect, it } from 'vitest'
import { diaART, diasHabilesPrevios, esFirmaMisiones, esIpPropia, esProxyLLM, evaluarMisiones, isNoise, nombreDesdeUA, resolverCliente } from './mcp-alert-cliente'

const vacio = new Map<string, { name: string; version: string | null }>()

describe('resolverCliente', () => {
  it('usa el clientInfo del initialize del mismo origen (tools/call nunca trae client)', () => {
    const m = new Map([['abcd1234ef', { name: 'mi-agente', version: '2.0' }]])
    expect(resolverCliente({ origen: 'abcd1234ef', ua: '' }, m)).toEqual({ name: 'mi-agente', version: '2.0' })
  })
  it('cae al user-agent con nombre si el origen no tiene initialize', () => {
    expect(resolverCliente({ origen: 'zz', ua: 'Claude-User (claude.ai)' }, vacio)?.name).toBe('Claude-User')
  })
  it('anónimo (Misiones: sin UA ni clientInfo) → null', () => {
    expect(resolverCliente({ origen: '57eba678f1f81a31', ua: '' }, vacio)).toBeNull()
  })
})

describe('nombreDesdeUA', () => {
  it('ignora librerías HTTP genéricas', () => {
    for (const ua of ['python-requests/2.34.2', 'python-httpx/0.28.1', 'curl/8.17.0', 'Go-http-client/2.0']) {
      expect(nombreDesdeUA(ua)).toBeNull()
    }
  })
  it('toma el primer token', () => {
    expect(nombreDesdeUA('trazabilidad-simple/1.0 (+https://trazabilidadsimple.com.ar)')).toBe('trazabilidad-simple')
  })
})

describe('isNoise', () => {
  it('excluye proyectos propios, sesiones Claude de José, pruebas propias y escáneres', () => {
    for (const n of ['trazabilidad-simple', 'verif-39', 'smoke-39', 'MCPCheckup-Probe', 'BrickBlueBot', 'supermarket-probe', 'agent-index-prober', 'aisonar', 'evyAI MCP Check', 'agent-collector', 'mcpyp-incremental', 'creora-verified-execution', 'rokmcp-probe', 'mcp-checkup-prober', 'claude-code', 'Claude-User', 'claude-ai', 'Anthropic/ClaudeAI', 'Agoranome-seller-tools', 'polly-catalog-verify', 'dollardollardollar-signals', 'mcp-index', 'mcp-discovery-measurement', 'memola-civ']) {
      expect(isNoise(n)).toBe(true)
    }
  })
  it('deja pasar agentes reales', () => {
    for (const n of ['cursor-vscode', 'cline', 'windsurf']) expect(isNoise(n)).toBe(false)
  })
})

describe('esProxyLLM', () => {
  it('detecta args con model o messages (objeto o string JSON)', () => {
    expect(esProxyLLM({ query: '17*23=? just the number', model: 'gpt-4o-mini' })).toBe(true)
    expect(esProxyLLM('{"messages":[{"role":"user","content":"hola"}]}')).toBe(true)
  })
  it('deja pasar args normales, null y strings no-JSON', () => {
    expect(esProxyLLM({ provincia: 'Misiones' })).toBe(false)
    expect(esProxyLLM(null)).toBe(false)
    expect(esProxyLLM('no es json')).toBe(false)
    expect(esProxyLLM([1, 2])).toBe(false)
  })
})

describe('esIpPropia', () => {
  it('45.175.x es propia; el resto y lo que no es string, no', () => {
    expect(esIpPropia('45.175.150.23')).toBe(true)
    expect(esIpPropia('190.2.112.4')).toBe(false)
    expect(esIpPropia(undefined)).toBe(false)
  })
})

describe('vigilancia de Misiones', () => {
  const firma = { tool: 'get_indice_novillo', ip: '172.70.1.1' }
  it('esFirmaMisiones: alias, sin UA, IP no propia, no probe', () => {
    expect(esFirmaMisiones(firma)).toBe(true)
    expect(esFirmaMisiones({ ...firma, ua: '' })).toBe(true)
    expect(esFirmaMisiones({ ...firma, ua: 'curl/8' })).toBe(false)
    expect(esFirmaMisiones({ ...firma, ip: '45.175.150.23' })).toBe(false)
    expect(esFirmaMisiones({ ...firma, probe: true })).toBe(false)
    expect(esFirmaMisiones({ ...firma, tool: 'cattle_price_index' })).toBe(false)
  })
  it('diaART corta el día a la medianoche de Argentina', () => {
    expect(diaART('2026-11-13T02:59:00Z')).toBe('2026-11-12')
    expect(diaART('2026-11-13T03:00:00Z')).toBe('2026-11-13')
  })
  it('diasHabilesPrevios saltea el fin de semana', () => {
    expect(diasHabilesPrevios('2026-11-16', 2)).toEqual(['2026-11-13', '2026-11-12']) // lunes
    expect(diasHabilesPrevios('2026-11-13', 2)).toEqual(['2026-11-12', '2026-11-11'])
  })
  it('evaluarMisiones: un día bajo no alarma; dos seguidos sí', () => {
    // serie real: 09/11 = 68, 10/11 = 108
    const real = new Map([['2026-11-09', 68], ['2026-11-10', 108], ['2026-11-06', 84]])
    expect(evaluarMisiones(real, '2026-11-10').alarma).toBe(false)
    expect(evaluarMisiones(real, '2026-11-11').alarma).toBe(false)
    const caida = new Map([['2026-11-11', 40], ['2026-11-12', 0]])
    const r = evaluarMisiones(caida, '2026-11-13')
    expect(r.alarma).toBe(true)
    expect(r.clave).toBe('2026-11-12|2026-11-11')
    expect(r.dias).toEqual([{ dia: '2026-11-12', n: 0 }, { dia: '2026-11-11', n: 40 }])
  })
})

describe('escáneres que se presentan con otro nombre en el initialize (30 días al 15-11-2026)', () => {
  it('vouch-census, agoranome-mcp-scan y catalog-verify son ruido', () => {
    // el nombre del initialize gana sobre el UA: "agoranome-seller-tools" y
    // "polly-catalog-verify" (sus UA) ya estaban en la lista, pero no alcanzaba
    expect(isNoise('vouch-census')).toBe(true)
    expect(isNoise('agoranome-mcp-scan')).toBe(true)
    expect(isNoise('catalog-verify')).toBe(true)
  })
  it('no se lleva puestos nombres comunes', () => {
    expect(isNoise('scandinavia-agro')).toBe(false)
    expect(isNoise('mi-agente')).toBe(false)
    expect(isNoise('trazabilidad-ganadera')).toBe(false)
  })
})
