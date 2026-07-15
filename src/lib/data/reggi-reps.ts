import localidadesData from './corrientes-localidades.json'

/* ------------------------------------------------------------------ */
/*  REPS DE REGGI & CÍA POR ZONA (Corrientes)                          */
/*                                                                     */
/*  Del catálogo del 34° Remate El Tigre: Reggi divide Corrientes en   */
/*  zonas con su representante. Ruteamos el lead localidad → depto →    */
/*  zona → rep, para que la pre-oferta vetada llegue al rep correcto.   */
/*  Mapa curado (las divisiones exactas son de Reggi) — ajustable.     */
/* ------------------------------------------------------------------ */

export interface Rep { nombre: string; tel: string }
export interface Zona { zona: string; departamentos: string[]; reps: Rep[] }

export const REGGI_ZONAS: Zona[] = [
  {
    zona: 'Mercedes',
    departamentos: ['Mercedes', 'Curuzú Cuatiá', 'General Alvear'],
    reps: [
      { nombre: 'Facundo Montiel', tel: '(3773) 450031' },
      { nombre: 'Nicolás Lacour', tel: '(3773) 417922' },
    ],
  },
  {
    zona: 'Goya',
    departamentos: ['Goya', 'Lavalle', 'San Roque'],
    reps: [{ nombre: 'Juan Bautista Morando', tel: '(3777) 598888' }],
  },
  {
    zona: 'Paso de los Libres',
    departamentos: ['Paso de los Libres', 'Monte Caseros'],
    reps: [{ nombre: 'Francisco Salinas', tel: '(3772) 523832' }],
  },
  {
    zona: 'Santo Tomé',
    departamentos: ['Santo Tomé', 'San Martín', 'Ituzaingó'],
    reps: [{ nombre: 'Alvaro Pellegrini', tel: '(3756) 61 5809' }],
  },
  {
    zona: 'Norte de Corrientes',
    departamentos: ['Capital', 'San Luis del Palmar', 'Empedrado', 'San Cosme', 'Itatí',
      'Berón de Astrada', 'General Paz', 'San Miguel', 'Concepción', 'Mburucuyá', 'Saladas', 'Bella Vista'],
    reps: [
      { nombre: 'Francisco Benitez Hardoy', tel: '(3794) 350550' },
      { nombre: 'Osvaldo Benitez Hardoy', tel: '(3794) 635585' },
      { nombre: 'Mariano Pita', tel: '(3794) 254356' },
    ],
  },
  {
    zona: 'Esquina',
    departamentos: ['Esquina', 'Sauce'],
    reps: [{ nombre: 'Marcelo Charles', tel: '(3777) 411341' }],
  },
]

const LOCALIDADES = localidadesData as Array<{ nombre: string; departamento: string }>

/** Departamento de una localidad de Corrientes (o null). */
export function departamentoDeLocalidad(localidad: string): string | null {
  const l = LOCALIDADES.find((x) => x.nombre.toLowerCase() === (localidad || '').toLowerCase())
  return l?.departamento ?? null
}

/** Rep(s) de Reggi sugeridos para una localidad de Corrientes. */
export function repPorLocalidad(localidad: string): { zona: string; reps: Rep[] } | null {
  const dep = departamentoDeLocalidad(localidad)
  if (!dep) return null
  const z = REGGI_ZONAS.find((z) => z.departamentos.includes(dep))
  return z ? { zona: z.zona, reps: z.reps } : null
}

/** Lista de localidades (nombre) para el select del formulario. */
export function localidadesCorrientes(): string[] {
  return LOCALIDADES.map((l) => l.nombre)
}
