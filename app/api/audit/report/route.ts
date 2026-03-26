import { NextRequest, NextResponse } from 'next/server'
import { generateReport } from '@/lib/generate-report'
import { scrapeWebsite } from '@/lib/scrape-website'
import { sendReportEmail } from '@/lib/send-email'
import type { WasteCalculation } from '@/lib/waste'

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

    // Send email with report (non-blocking)
    if (contactEmail && process.env.RESEND_API_KEY) {
      sendReportEmail({
        to: contactEmail,
        contactName,
        companyName,
        waste,
        report,
      }).then(result => {
        console.log('Email sent:', result)
      }).catch(err => {
        console.error('Email send failed:', err)
      })
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('Report generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
