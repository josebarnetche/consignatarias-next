import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { armarInformeCanon } from '@/lib/informes/canon'
import { armarParteSemanal } from '@/lib/informes/semanal'
import { generateInformeCanonPDF } from './generateInformeCanonPDF'
import { generateParteSemanalPDF } from './generateParteSemanalPDF'

describe('PDF downloads with the resolved jsPDF dependencies', () => {
  it('produces a readable canon report using the sample-download path', async () => {
    const data = armarInformeCanon('corrientes', 'pdf-test@example.invalid')
    expect(data).not.toBeNull()
    const doc = generateInformeCanonPDF(data!)
    const parsed = await PDFDocument.load(doc.output('arraybuffer'))
    expect(parsed.getPageCount()).toBeGreaterThan(0)
    expect(parsed.getPage(0).getWidth()).toBeCloseTo(595.28, 0)
  })

  it('preserves the two-page weekly report', async () => {
    const data = armarParteSemanal('pdf-test@example.invalid', new Date('2026-10-12T12:00:00Z'))
    const doc = generateParteSemanalPDF(data)
    const parsed = await PDFDocument.load(doc.output('arraybuffer'))
    expect(parsed.getPageCount()).toBe(2)
  })
})
