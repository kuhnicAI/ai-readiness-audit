import { NextRequest, NextResponse } from 'next/server'
import { generatePdfPuppeteer } from '@/lib/pdf-puppeteer'
import { parseReport } from '@/lib/generate-report'
import type { WasteCalculation } from '@/lib/waste'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { companyName, contactName, role, waste, reportRaw, businessType, employeeCount, date } = body as {
    companyName: string
    contactName: string
    role: string
    waste: WasteCalculation
    reportRaw: string
    businessType: string
    employeeCount: string
    date: string
  }

  if (!reportRaw || !waste || !companyName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    console.log('[PDF API] Starting PDF generation for:', companyName)
    console.log('[PDF API] BROWSERLESS_API_KEY set:', !!process.env.BROWSERLESS_API_KEY)

    const report = parseReport(reportRaw)
    console.log('[PDF API] Parsed report - fix1Name:', report.fix1Name, 'month1:', report.month1Milestones.length, 'items')

    const pdfBuffer = await generatePdfPuppeteer({
      companyName,
      contactName,
      role,
      waste,
      report,
      businessType,
      employeeCount,
      date,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AI-Audit-${companyName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
