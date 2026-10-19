/**
 * Lo único que hace el modelo: LEER. Decide si un lead es una operación de
 * hacienda de verdad y qué quiso decir quien respondió un correo, y saca los
 * datos que vienen en texto libre ("tengo 40 novillos de 380 en Saavedra").
 *
 * No escribe correos ni decide acciones: eso es `reglas.ts` + `motor.ts`, con
 * plantillas fijas. Así el modelo no puede prometer un precio ni filtrar un
 * contacto aunque se equivoque.
 *
 * Va por AI Gateway con el token OIDC del deploy (sin clave en el repo). Si el
 * modelo no responde, el motor cae a reglas deterministas (ACEPTO / BAJA) y
 * escala el resto.
 */
import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { Lado } from './reglas'

const MODELO = process.env.AGENTE_MODELO || 'anthropic/claude-sonnet-5.5'

const datosSchema = z.object({
  cabezas: z.number().int().positive().nullable(),
  categoria: z
    .string()
    .nullable()
    .describe('en plural y minúscula: novillos, novillitos, vaquillonas, vacas, terneros, terneras, toros, invernada'),
  zona: z.string().nullable().describe('localidad o partido'),
  provincia: z.string().nullable(),
  peso_kg: z.number().positive().nullable().describe('peso vivo promedio por cabeza'),
  disponible: z.string().nullable().describe('cuándo está disponible, como lo dijo'),
  precio_pedido_kg: z.number().positive().nullable().describe('solo si el productor dice cuánto pide por kg vivo, en pesos'),
})

export type DatosLeidos = z.infer<typeof datosSchema>

const triageSchema = z.object({
  es_operacion: z.boolean().describe('true solo si alguien quiere vender o comprar hacienda BOVINA en pie'),
  lado: z.enum(['vende', 'compra']).nullable(),
  motivo: z.string().describe('una línea: por qué sí o por qué no'),
  datos: datosSchema,
})

export type Triage = z.infer<typeof triageSchema>

const SISTEMA_TRIAGE = `Sos el filtro de entrada de consignatarias.com, un sitio argentino de mercado ganadero.
Te llega un formulario que completó alguien. Decidí si es una operación de hacienda bovina en pie que podamos ofrecer a compradores o vendedores.
NO es operación: spam o links, proveedores que quieren venderle algo a un frigorífico (maquinaria, insumos), consultas académicas, pedidos de hablar con una persona puntual sin hacienda de por medio, cabras/ovejas/cerdos, campos o arrendamientos.
El formulario a veces dice "comprar" cuando la persona en realidad vende (o al revés): leé el mensaje y decidí el lado real.
Sacá los datos solo si están escritos; no inventes. Respondé en castellano.`

export async function triageLead(lead: {
  intent: string
  category: string | null
  head_count: number | null
  province: string | null
  zona: string | null
  message: string | null
  source: string | null
  desired_price_ars: number | null
}): Promise<Triage | null> {
  try {
    const { output } = await generateText({
      model: MODELO,
      system: SISTEMA_TRIAGE,
      output: Output.object({ schema: triageSchema }),
      prompt: JSON.stringify(lead),
      maxRetries: 1,
    })
    return output
  } catch (e) {
    console.error('[agente] triage sin modelo:', e instanceof Error ? e.message : e)
    return null
  }
}

const respuestaSchema = z.object({
  tipo: z.enum(['acepta', 'rechaza', 'pregunta', 'datos', 'cerrada', 'caida', 'avanzando', 'retira', 'baja', 'automatica', 'otro']),
  escalar: z.boolean().describe('true si hay enojo, reclamo, tema legal, pedido de negociar la comisión o algo que una persona debería ver'),
  motivo: z.string().describe('una línea'),
  pregunta: z.string().nullable().describe('si tipo=pregunta: la pregunta reescrita, clara, sin datos personales de quien escribe'),
  datos: datosSchema.nullable().describe('si trae datos de la hacienda'),
  cierre: z
    .object({
      cabezas: z.number().int().positive().nullable(),
      precio_kg: z.number().positive().nullable(),
      peso_kg: z.number().positive().nullable(),
      bruto_ars: z.number().positive().nullable().describe('total de la operación en pesos si lo dicen'),
    })
    .nullable()
    .describe('si tipo=cerrada'),
})

export type Respuesta = z.infer<typeof respuestaSchema>

const SISTEMA_RESPUESTA = `Leés la respuesta a un correo de consignatarias.com, que conecta productores ganaderos con compradores (frigoríficos, consignatarias, otros productores) a cambio de una comisión del 1% sobre el bruto que paga quien recibe el contacto.
Clasificá la respuesta según quién la escribe y en qué etapa está el caso:
- acepta: la contraparte acepta recibir el contacto con la comisión (dice ACEPTO o equivalente claro).
- rechaza: no le interesa esta hacienda.
- pregunta: pregunta algo sobre la hacienda o el pedido (peso, sanidad, plazo, precio pretendido).
- datos: el productor manda datos que le pedimos (cabezas, categoría, zona, peso).
- cerrada: las partes cerraron la operación (sacá cabezas, precio y total si están).
- caida: la operación no se dio.
- avanzando: siguen hablando.
- retira: el productor ya no quiere vender/comprar o ya lo hizo por otro lado.
- baja: pide que no le escriban más.
- automatica: respuesta automática, fuera de oficina, rebote.
- otro: nada de lo anterior.
Una aceptación con condiciones ("acepto pero al 0,5%") NO es acepta: es pregunta con escalar=true.
No inventes datos. Respondé en castellano.`

export async function leerRespuesta(o: {
  quien: 'productor' | 'contraparte'
  lado: Lado
  etapa: string
  resumen: string
  asunto: string
  texto: string
}): Promise<Respuesta | null> {
  try {
    const { output } = await generateText({
      model: MODELO,
      system: SISTEMA_RESPUESTA,
      output: Output.object({ schema: respuestaSchema }),
      prompt: [
        `Escribe: ${o.quien === 'productor' ? `el productor (que ${o.lado === 'vende' ? 'vende' : 'compra'})` : 'la contraparte a la que le ofrecimos el caso'}`,
        `Etapa del caso: ${o.etapa}`,
        `Caso: ${o.resumen}`,
        `Asunto: ${o.asunto}`,
        '--- respuesta ---',
        o.texto.slice(0, 6000),
      ].join('\n'),
      maxRetries: 1,
    })
    return output
  } catch (e) {
    console.error('[agente] lectura sin modelo:', e instanceof Error ? e.message : e)
    return null
  }
}
