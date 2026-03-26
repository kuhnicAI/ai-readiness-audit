import { NextRequest, NextResponse } from 'next/server'
import { generateReport, parseReport } from '@/lib/generate-report'
import { scrapeWebsite } from '@/lib/scrape-website'
import { sendReportEmail } from '@/lib/send-email'
import { generatePdfPuppeteer } from '@/lib/pdf-puppeteer'
import type { WasteCalculation } from '@/lib/waste'

export const maxDuration = 60 // Allow up to 60s for scrape + Claude + PDF + email

export async function POST(req: NextRequest) {
  const { audit_id, answers, waste, companyName, contactName, contactEmail, role } = await req.json() as {
    audit_id: string
    answers: Record<string, string | string[]>
    waste: WasteCalculation
    companyName: string
    contactName: string
    contactEmail: string
    role: string
  }

  if (!answers || !waste || !companyName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    // Scrape their website
    let websiteContent: string | null = null
    const website = companyName?.trim()
    if (website && (website.includes('.') || website.includes('www'))) {
      websiteContent = await scrapeWebsite(website)
    }

    const report = await generateReport({ answers, waste, companyName, contactName, role, websiteContent })

    // Save report to DB
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    if (hasSupabase && audit_id) {
      const { supabaseAdmin } = await import('@/lib/supabase')
      try {
        await supabaseAdmin
          .from('audit_responses')
          .update({ ai_report: report })
          .eq('id', audit_id)
      } catch { /* non-blocking */ }
    }

    // Generate PDF
    let pdfBuffer: Buffer | undefined
    try {
      console.log('[PDF] Generating...')
      const parsedReport = parseReport(report)
      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      pdfBuffer = await generatePdfPuppeteer({
        companyName,
        contactName,
        role,
        waste,
        report: parsedReport,
        businessType: (answers.business_type as string) ?? '',
        employeeCount: (answers.employee_count as string) ?? '',
        date: dateStr,
      })
      console.log('[PDF] Generated:', pdfBuffer.length, 'bytes')
    } catch (err) {
      console.error('[PDF] Generation failed:', err)
    }

    // Send email with PDF attached
    if (contactEmail && process.env.RESEND_API_KEY) {
      try {
        console.log('[Email] Sending to:', contactEmail)
        const emailResult = await sendReportEmail({
          to: contactEmail,
          contactName,
          companyName,
          waste,
          report,
          pdfBuffer,
        })
        console.log('[Email] Result:', JSON.stringify(emailResult))
      } catch (err) {
        console.error('[Email] Failed:', err)
      }
    } else {
      console.log('[Email] Skipped — contactEmail:', contactEmail, 'RESEND_API_KEY:', !!process.env.RESEND_API_KEY)
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('Report generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
