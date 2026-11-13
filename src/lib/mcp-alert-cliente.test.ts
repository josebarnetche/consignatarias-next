import { describe, expect, it } from 'vitest'
import { esIpPropia, esProxyLLM, isNoise, nombreDesdeUA, resolverCliente } from './mcp-alert-cliente'

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
