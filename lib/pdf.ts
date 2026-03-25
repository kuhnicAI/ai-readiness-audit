import jsPDF from 'jspdf'
import type { AuditScores } from './scoring'
import type { Finding } from './waste'

interface AuditData {
  company_name: string
  contact_name: string
  industry: string
  scores: AuditScores
  total_waste: number
  findings: Finding[]
  created_at: string
}

const fmt = (n: number) => '\u00A3' + n.toLocaleString('en-GB')

export async function generatePdf(audit: AuditData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const m = 20 // margin
  const cw = pw - m * 2 // content width

  const DARK = [0, 38, 62] as const
  const RED = [220, 38, 38] as const
  const GREY = [107, 114, 128] as const
  const LIGHT = [240, 242, 245] as const

  const dateStr = new Date(audit.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ═══════════════════════════════════════
  //  PAGE 1: COVER
  // ═══════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pw, ph, 'F')

  // Transputec + Kuhnic header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('TRANSPUTEC  \u00B7  KUHNIC AI', pw / 2, 35, { align: 'center' })

  // Title
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('AI Readiness', pw / 2, 72, { align: 'center' })
  doc.text('Audit Report', pw / 2, 86, { align: 'center' })

  // Company
  doc.setFontSize(18)
  doc.setFont('helvetica', 'normal')
  doc.text(audit.company_name, pw / 2, 108, { align: 'center' })

  if (audit.industry) {
    doc.setFontSize(12)
    doc.setTextColor(180, 190, 200)
    doc.text(audit.industry, pw / 2, 118, { align: 'center' })
  }

  // Score circle
  doc.setFillColor(255, 255, 255)
  doc.circle(pw / 2, 160, 28, 'F')
  doc.setTextColor(...DARK)
  doc.setFontSize(34)
  doc.setFont('helvetica', 'bold')
  doc.text(String(audit.scores.overall), pw / 2, 164, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('out of 100', pw / 2, 174, { align: 'center' })

  // Band label
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(audit.scores.band, pw / 2, 200, { align: 'center' })

  // Waste figure
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 190, 200)
  doc.text('Estimated Annual Waste', pw / 2, 218, { align: 'center' })
  doc.setTextColor(239, 68, 68)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(audit.total_waste), pw / 2, 232, { align: 'center' })

  // Band description
  doc.setTextColor(200, 210, 220)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const bandLines = doc.splitTextToSize(audit.scores.bandDescription, cw - 20)
  doc.text(bandLines, pw / 2, 252, { align: 'center' })

  // Footer
  doc.setFontSize(9)
  doc.setTextColor(120, 130, 140)
  doc.text(`Prepared for ${audit.contact_name}  \u00B7  ${dateStr}`, pw / 2, ph - 20, { align: 'center' })

  // ═══════════════════════════════════════
  //  PAGE 2: CATEGORY BREAKDOWN
  // ═══════════════════════════════════════
  doc.addPage()
  let y = 30

  doc.setTextColor(...DARK)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Category Breakdown', m, y)
  y += 18

  for (const cat of audit.scores.categories) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(cat.label, m, y)

    const scoreColor = cat.score >= 75 ? [16, 185, 129] : cat.score >= 50 ? [...DARK] : cat.score >= 25 ? [245, 158, 11] : [239, 68, 68]
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
    doc.text(`${cat.score}%`, pw - m, y, { align: 'right' })
    y += 6

    // Bar bg
    doc.setFillColor(...LIGHT)
    doc.roundedRect(m, y, cw, 5, 2.5, 2.5, 'F')
    // Bar fill
    const barW = Math.max((cat.score / 100) * cw, 5)
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2])
    doc.roundedRect(m, y, barW, 5, 2.5, 2.5, 'F')
    y += 18
  }

  // ═══════════════════════════════════════
  //  PAGES 3+: FINDINGS
  // ═══════════════════════════════════════
  doc.addPage()
  y = 30

  doc.setTextColor(...DARK)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Findings', m, y)
  y += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(`${audit.findings.length} issue${audit.findings.length !== 1 ? 's' : ''} identified  \u00B7  ${fmt(audit.total_waste)} estimated annual waste`, m, y)
  y += 14

  for (let i = 0; i < audit.findings.length; i++) {
    const f = audit.findings[i]

    // Check if we need a new page (need ~80mm for a full finding card)
    if (y > ph - 90) {
      doc.addPage()
      y = 30
    }

    // Finding header bar
    doc.setFillColor(248, 249, 252)
    doc.roundedRect(m, y - 4, cw, 18, 3, 3, 'F')

    // Number circle
    doc.setFillColor(...DARK)
    doc.circle(m + 7, y + 4, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), m + 7, y + 5.5, { align: 'center' })

    // Title
    doc.setTextColor(...DARK)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const titleLines = doc.splitTextToSize(f.title, cw - 55)
    doc.text(titleLines, m + 15, y + 1 + (titleLines.length > 1 ? 0 : 3))

    // Waste
    doc.setTextColor(...RED)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${fmt(f.annualWaste)}/yr`, pw - m, y + 5, { align: 'right' })

    y += 18

    // Problem
    doc.setTextColor(...GREY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('THE PROBLEM', m + 2, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 66, 87)
    const probLines = doc.splitTextToSize(f.problem, cw - 4)
    doc.text(probLines, m + 2, y)
    y += probLines.length * 4.5 + 4

    // Detail
    doc.setTextColor(...GREY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('THE DETAIL', m + 2, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 66, 87)
    const detLines = doc.splitTextToSize(f.detail, cw - 4)
    doc.text(detLines, m + 2, y)
    y += detLines.length * 4.5 + 4

    // How we'd fix it
    doc.setTextColor(...GREY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('HOW WE\'D FIX IT', m + 2, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 66, 87)
    const fixLines = doc.splitTextToSize(f.fix, cw - 4)
    doc.text(fixLines, m + 2, y)
    y += fixLines.length * 4.5 + 4

    // Next step (highlighted)
    if (y > ph - 30) { doc.addPage(); y = 30 }
    doc.setFillColor(0, 38, 62)
    const nsLines = doc.splitTextToSize(f.nextStep, cw - 12)
    const nsHeight = nsLines.length * 4.5 + 8
    doc.roundedRect(m, y - 2, cw, nsHeight, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('NEXT STEP', m + 5, y + 3)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(nsLines, m + 5, y + 3 + 5)
    y += nsHeight + 10

    // Separator
    if (i < audit.findings.length - 1 && y < ph - 30) {
      doc.setDrawColor(...LIGHT)
      doc.setLineWidth(0.3)
      doc.line(m + 20, y - 3, pw - m - 20, y - 3)
      y += 4
    }
  }

  // ═══════════════════════════════════════
  //  LAST PAGE: CTA
  // ═══════════════════════════════════════
  doc.addPage()

  // CTA box centered on page
  const boxY = 70
  const boxH = 100
  doc.setFillColor(...DARK)
  doc.roundedRect(m, boxY, cw, boxH, 5, 5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Ready to eliminate this waste?', pw / 2, boxY + 25, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const ctaLines = doc.splitTextToSize(
    'Our AI transformation team can turn these findings into action. Most clients see ROI within the first month. Book a free 30-minute consultation to discuss your personalised roadmap.',
    cw - 30
  )
  doc.text(ctaLines, pw / 2, boxY + 40, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('calendly.com/transputec-ai/consultation', pw / 2, boxY + 70, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('hello@transputec.com', pw / 2, boxY + 80, { align: 'center' })

  // Footer
  doc.setTextColor(...GREY)
  doc.setFontSize(8)
  doc.text('Powered by Transputec & Kuhnic AI', pw / 2, ph - 15, { align: 'center' })
  doc.text(`Generated ${dateStr}  \u00B7  Confidential`, pw / 2, ph - 10, { align: 'center' })

  // Save
  const filename = `AI-Readiness-Audit-${audit.company_name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
  doc.save(filename)
}
