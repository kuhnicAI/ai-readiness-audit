import jsPDF from 'jspdf'
import type { WasteCalculation } from './waste'

interface AuditData {
  company_name: string
  contact_name: string
  scores: WasteCalculation
  total_waste: number
  created_at: string
  report?: string
}

const fmt = (n: number) => '\u00A3' + n.toLocaleString('en-GB')

export async function generatePdf(audit: AuditData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const m = 20
  const cw = pw - m * 2
  const w = audit.scores

  const DARK = [26, 26, 46] as const
  const GREEN = [0, 208, 132] as const
  const GREY = [140, 140, 140] as const
  const LIGHT_GREY = [200, 200, 200] as const

  const dateStr = new Date(audit.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ═══ PAGE 1: COVER ═══
  doc.setTextColor(...DARK)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('KUHNIC  \u00B7  TRANSPUTEC', pw / 2, 35, { align: 'center' })

  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('AI Readiness', pw / 2, 72, { align: 'center' })
  doc.text('Audit Report', pw / 2, 86, { align: 'center' })

  doc.setFontSize(18)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(audit.company_name, pw / 2, 110, { align: 'center' })

  doc.setTextColor(...GREEN)
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(w.totalWaste), pw / 2, 160, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('estimated annual cost of inefficiency', pw / 2, 175, { align: 'center' })

  // Two-part breakdown
  doc.setFontSize(12)
  doc.setTextColor(...DARK)
  doc.text(`${fmt(w.revenueAtRisk)} revenue at risk from missed enquiries`, pw / 2, 200, { align: 'center' })
  doc.text(`${fmt(w.receptionistCost)} cost of manual processes`, pw / 2, 210, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(...LIGHT_GREY)
  doc.text(`Prepared for ${audit.contact_name}  \u00B7  ${dateStr}`, pw / 2, ph - 20, { align: 'center' })

  // ═══ PAGE 2: BREAKDOWN ═══
  doc.addPage()

  let y = 30
  doc.setTextColor(...DARK)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('How we calculated this', m, y)
  y += 18

  doc.setFontSize(14)
  doc.text('Revenue at risk', m, y)
  y += 10

  const revDetails = [
    ['Daily inbound calls', String(w.dailyCalls)],
    ['Missed rate', `${Math.round(w.missedRate * 100)}%${w.missedRateAssumed ? ' (estimated)' : ''}`],
    ['Missed calls per day', String(Math.round(w.missedCallsPerDay))],
    ['Assumed conversion rate', `${Math.round(w.conversionRate * 100)}%`],
    ['Client value', fmt(w.clientValue)],
    ['Annual revenue at risk', fmt(w.revenueAtRisk)],
  ]

  for (const [label, value] of revDetails) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(label, m, y)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, pw - m, y, { align: 'right' })
    y += 9
  }

  y += 10
  doc.setTextColor(...DARK)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Manual process cost', m, y)
  y += 10

  const adminDetails = [
    ['Current receptionist cost', '\u00A328,000/yr'],
    ['AI voice agent cost', '\u00A33,000 to \u00A36,000/yr'],
    ['Estimated saving', fmt(w.netOpportunity)],
    ['Missed calls annually', w.missedCallsAnnual.toLocaleString('en-GB')],
    ['Annual hours lost', w.missedCallsAnnual.toLocaleString('en-GB')],
    ['Annual admin cost', fmt(w.receptionistCost)],
  ]

  for (const [label, value] of adminDetails) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(label, m, y)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, pw - m, y, { align: 'right' })
    y += 9
  }

  y += 15
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.5)
  doc.line(m, y, pw - m, y)
  y += 10
  doc.setFontSize(16)
  doc.setTextColor(...GREEN)
  doc.text('Total annual waste', m, y)
  doc.text(fmt(w.totalWaste), pw - m, y, { align: 'right' })

  // ═══ PAGES 3+: AI REPORT ═══
  if (audit.report) {
    doc.addPage()
    y = 30

    const cleanReport = audit.report
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#{1,6}\s+/gm, '')

    const lines = cleanReport.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { y += 4; continue }

      // Check if we need a new page
      if (y > ph - 25) {
        doc.addPage()
        y = 30
      }

      if (trimmed.startsWith('SECTION') || trimmed.startsWith('AUDIT REPORT')) {
        const title = trimmed.replace(/^SECTION \d+:\s*/, '').replace(/^AUDIT REPORT FOR\s*/, '')
        y += 6
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...DARK)
        doc.text(title, m, y)
        y += 10
      } else if (trimmed.startsWith('Fix ') && trimmed.includes(':')) {
        y += 6
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...DARK)
        const fixLines = doc.splitTextToSize(trimmed, cw)
        doc.text(fixLines, m, y)
        y += fixLines.length * 5.5 + 4
      } else if (trimmed.startsWith('Estimated annual impact:')) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GREEN)
        doc.text(trimmed, m, y)
        y += 7
      } else if (trimmed.startsWith('Now:') || trimmed.startsWith('The problem:')) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(217, 119, 6) // amber
        doc.text('RIGHT NOW', m, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        const content = trimmed.replace(/^(Now|The problem):\s*/, '')
        const wrapped = doc.splitTextToSize(content, cw)
        doc.text(wrapped, m, y)
        y += wrapped.length * 4.5 + 4
      } else if (trimmed.startsWith('After:') || trimmed.startsWith('The fix:')) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GREEN)
        doc.text('AFTER THE FIX', m, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        const content = trimmed.replace(/^(After|The fix):\s*/, '')
        const wrapped = doc.splitTextToSize(content, cw)
        doc.text(wrapped, m, y)
        y += wrapped.length * 4.5 + 4
      } else {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const wrapped = doc.splitTextToSize(trimmed, cw)
        doc.text(wrapped, m, y)
        y += wrapped.length * 4.5 + 3
      }
    }
  }

  // ═══ LAST PAGE: CTA ═══
  doc.addPage()

  const boxY = 70
  doc.setFillColor(...GREEN)
  doc.roundedRect(m, boxY, cw, 90, 5, 5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Ready to eliminate this waste?', pw / 2, boxY + 25, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const ctaLines = doc.splitTextToSize(
    'Our AI transformation team can turn these findings into action. Most clients see ROI within the first month. Book a free consultation to discuss your personalised roadmap.',
    cw - 30
  )
  doc.text(ctaLines, pw / 2, boxY + 40, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('calendly.com/jorge-linklemon/30min', pw / 2, boxY + 70, { align: 'center' })

  doc.setTextColor(...LIGHT_GREY)
  doc.setFontSize(8)
  doc.text('Powered by Kuhnic AI & Transputec', pw / 2, ph - 15, { align: 'center' })
  doc.text(`Generated ${dateStr}  \u00B7  Confidential`, pw / 2, ph - 10, { align: 'center' })

  const filename = `AI-Audit-${audit.company_name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
  doc.save(filename)
}
