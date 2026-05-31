import type { Metadata } from 'next'
import { promises as fs } from 'fs'
import path from 'path'
import React from 'react'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'El Oráculo — manifiesto fundacional',
  description:
    'Manifiesto fundacional del observatorio del mercado bovino argentino. INMAG como quasi-oracle del 88% del mercado, marco institucional, bibliografía citada (FCV-UBA, Iriarte/CACG, Diez/UNS, Scoponi).',
  alternates: { canonical: `${APP_URL}/el-oraculo` },
  openGraph: {
    title: 'El Oráculo',
    description:
      'El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.',
    url: `${APP_URL}/el-oraculo`,
    type: 'article',
    images: [
      {
        url: `${APP_URL}/el-oraculo/og.png`,
        width: 1200,
        height: 630,
        alt: 'El Oráculo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Oráculo',
    description: 'El precio que el mercado bovino argentino sigue todos los días.',
    images: [`${APP_URL}/el-oraculo/og.png`],
  },
}

// ---------------------------------------------------------------------------
// Minimal markdown → HTML converter. Scoped to features that appear in
// EL-ORACULO-MANIFIESTO.md: headings (##/###), paragraphs, bold/italic,
// blockquotes, bullet/numbered lists, tables, horizontal rules, inline <cite>.
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(raw: string): string {
  // Preserve inline HTML tags we use (<cite class="inline">). Strategy:
  // 1) split on existing HTML tags, only inline-convert the text segments
  const parts = raw.split(/(<[^>]+>)/g)
  return parts
    .map((p) => {
      if (p.startsWith('<') && p.endsWith('>')) return p // pass-through HTML
      let t = escapeHtml(p)
      // bold first to avoid greedy * eat
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-zinc-200 font-medium">$1</strong>')
      t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em class="text-zinc-500 italic">$2</em>')
      t = t.replace(/`([^`]+)`/g, '<code class="font-mono text-sky-400 bg-zinc-900 px-1 py-0.5 rounded">$1</code>')
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-sky-400 hover:text-sky-300 transition-colors underline-offset-2 hover:underline">$1</a>')
      return t
    })
    .join('')
}

interface Block {
  type: 'h2' | 'h3' | 'p' | 'blockquote' | 'ul' | 'ol' | 'table' | 'hr'
  content?: string
  items?: string[]
  rows?: string[][]
}

function parseBlocks(md: string): Block[] {
  // Drop initial H1 and the H2 subtitle (already in page header) plus the
  // very first blockquote (Manifiesto fundacional · consignatarias.com.ar ...
  // edición 01/2026 etc) which is also rendered in the header.
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0
  let droppedH1 = false
  let droppedH2 = false
  let droppedHeaderQuote = false

  while (i < lines.length) {
    const line = lines[i]

    // skip blank lines
    if (line.trim() === '') { i++; continue }

    // first H1 is the title — drop
    if (!droppedH1 && /^#\s+/.test(line)) {
      droppedH1 = true
      i++
      continue
    }

    // first H2 is the tagline — drop only the first one
    if (!droppedH2 && /^##\s+/.test(line)) {
      droppedH2 = true
      i++
      continue
    }

    // horizontal rule
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // h2
    if (/^##\s+/.test(line)) {
      blocks.push({ type: 'h2', content: line.replace(/^##\s+/, '').trim() })
      i++
      continue
    }

    // h3
    if (/^###\s+/.test(line)) {
      blocks.push({ type: 'h3', content: line.replace(/^###\s+/, '').trim() })
      i++
      continue
    }

    // blockquote (consume contiguous > lines)
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      // drop the very first header quote (manifiesto fundacional metadata)
      if (!droppedHeaderQuote) {
        droppedHeaderQuote = true
        continue
      }
      blocks.push({ type: 'blockquote', content: buf.join(' ').trim() })
      continue
    }

    // bullet list
    if (/^-\s+/.test(line) || /^\*\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && (/^[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^[-*]\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // table (line starts with |, next line is separator |---|---|)
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|\s*:?-+/.test(lines[i + 1])) {
      const rows: string[][] = []
      // header
      rows.push(line.split('|').slice(1, -1).map((c) => c.trim()))
      i += 2 // skip header + separator
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      blocks.push({ type: 'table', rows })
      continue
    }

    // paragraph — consume until blank line or block boundary
    const buf: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|>|-|\*|\d+\.|\|)/.test(lines[i])) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', content: buf.join(' ').trim() })
  }

  return blocks
}

function Manifiesto({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'hr':
            return <hr key={idx} className="my-10 border-zinc-800" />
          case 'h2':
            return (
              <h2
                key={idx}
                className="text-zinc-200 text-lg font-medium mt-12 mb-4 scroll-mt-20"
                id={slugify(b.content || '')}
                dangerouslySetInnerHTML={{ __html: inline(b.content || '') }}
              />
            )
          case 'h3':
            return (
              <h3
                key={idx}
                className="text-zinc-300 text-sm font-medium mt-7 mb-3"
                dangerouslySetInnerHTML={{ __html: inline(b.content || '') }}
              />
            )
          case 'p':
            return (
              <p
                key={idx}
                className="text-zinc-400 mb-4 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: inline(b.content || '') }}
              />
            )
          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-sky-500/60 pl-4 my-5 text-zinc-300 italic"
                dangerouslySetInnerHTML={{ __html: inline(b.content || '') }}
              />
            )
          case 'ul':
            return (
              <ul key={idx} className="list-none mb-5 space-y-2">
                {(b.items || []).map((item, i) => (
                  <li key={i} className="text-zinc-400 pl-5 relative leading-relaxed">
                    <span className="absolute left-0 text-sky-400">→</span>
                    <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={idx} className="list-none mb-5 space-y-2 counter-reset-ol">
                {(b.items || []).map((item, i) => (
                  <li key={i} className="text-zinc-400 pl-7 relative leading-relaxed">
                    <span className="absolute left-0 text-sky-400 font-mono text-xs">
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
                  </li>
                ))}
              </ol>
            )
          case 'table': {
            const [header, ...body] = b.rows || []
            return (
              <div key={idx} className="my-5 border border-zinc-800 rounded overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60">
                      {header?.map((cell, ci) => (
                        <th
                          key={ci}
                          className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800"
                          dangerouslySetInnerHTML={{ __html: inline(cell) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {body.map((row, ri) => (
                      <tr key={ri} className="border-b border-zinc-800/50 last:border-0">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-zinc-400"
                            dangerouslySetInnerHTML={{ __html: inline(cell) }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          default:
            return null
        }
      })}
    </>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function loadManifiesto(): Promise<string> {
  const filepath = path.join(process.cwd(), 'docs', 'EL-ORACULO-MANIFIESTO.md')
  return fs.readFile(filepath, 'utf-8')
}

export default async function ElOraculoPage() {
  const md = await loadManifiesto()
  const blocks = parseBlocks(md)

  return (
    <>
      <SectionBreadcrumbSchema section="el-oraculo" sectionName="El Oráculo" />
      <TechArticleSchema
        name="El Oráculo — manifiesto fundacional"
        description="Manifiesto fundacional del observatorio del mercado bovino argentino. Tesis: el INMAG es el quasi-oracle del 88% del mercado. Bibliografía citada (FCV-UBA, CACG, UNS)."
        url={`${APP_URL}/el-oraculo`}
        datePublished="2026-05-11"
        proficiencyLevel="Expert"
        authorName="Mesa de mercado — consignatarias.com.ar"
        citations={[
          { name: 'Mercado Agroganadero de Buenos Aires (INMAG)', url: 'https://www.mercadoagroganadero.com.ar' },
          { name: 'Facultad de Ciencias Veterinarias, UBA' },
          { name: 'Cámara Argentina de Consignatarios de Ganado (CACG)' },
          { name: 'Universidad Nacional del Sur (UNS)' },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 py-12 text-sm leading-relaxed">
        <h1 className="text-zinc-100 text-2xl font-medium mb-2">El Oráculo</h1>
        <p className="text-zinc-500 text-xs mb-6">
          v1.0 — 11 de mayo de 2026 — Mesa de mercado · consignatarias.com
        </p>
        <p className="text-zinc-300 mb-10 italic leading-relaxed">
          El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.
        </p>

        <Manifiesto blocks={blocks} />

        <hr className="my-12 border-zinc-800" />
        <p className="text-zinc-600 text-xs">
          Snapshot citable en PDF (versión 1.0 · 2026-05-11):{' '}
          <a
            href="/el-oraculo/manifiesto.pdf"
            className="text-zinc-500 hover:text-zinc-300 transition-colors underline-offset-2 hover:underline"
          >
            manifiesto.pdf
          </a>
          .
        </p>
        <p className="text-zinc-700 text-xs mt-2">
          Este documento se revisa en sesión ordinaria de la mesa, aproximadamente cada 6 meses.
        </p>
      </article>
    </>
  )
}
