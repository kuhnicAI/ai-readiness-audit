import { NextRequest, NextResponse } from 'next/server'
import { generateReport } from '@/lib/generate-report'
import { scrapeWebsite } from '@/lib/scrape-website'
import { sendReportEmail } from '@/lib/send-email'
import type { WasteCalculation } from '@/lib/waste'

export const maxDuration = 60

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

    // Send simple email to the lead
    if (contactEmail && process.env.RESEND_API_KEY) {
      try {
        console.log('[Email] Sending to:', contactEmail)
        const emailResult = await sendReportEmail({
          to: contactEmail,
          contactName,
          companyName,
          waste,
        })
        console.log('[Email] Result:', JSON.stringify(emailResult))
      } catch (err) {
        console.error('[Email] Failed:', err)
      }

      // Notify Gytis + Jorge about the new lead
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const displayName = companyName.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
        await resend.emails.send({
          from: 'Kuhnic AI <noreply@audit.kuhnic.ai>',
          to: 'gytis@kuhnic.ai',
          cc: 'jorge@kuhnic.ai',
          subject: `New audit lead: ${contactName} from ${displayName}`,
          text: `New lead just completed the audit.

Name: ${contactName}
Email: ${contactEmail}
Website: ${companyName}
Role: ${role}

Total waste identified: ${Math.round(waste.totalWaste / 1000)}k/yr
Revenue at risk: ${Math.round(waste.revenueAtRisk / 1000)}k/yr
Admin cost: ${Math.round(waste.adminCost / 1000)}k/yr

Business type: ${(answers.business_type as string) ?? 'Not specified'}
Weekly inbound: ${(answers.weekly_inbound as string) ?? 'Not specified'}
Missed rate: ${(answers.missed_rate as string) ?? 'Not specified'}
Client value: ${(answers.client_value as string) ?? 'Not specified'}
CRM status: ${(answers.crm_status as string) ?? 'Not specified'}
Urgency: ${(answers.urgency as string) ?? 'Not specified'}

Results page: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://audit.kuhnic.ai'}/results/${audit_id}`,
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log('[Email] Lead notification sent to gytis + jorge')
      } catch (err) {
        console.error('[Email] Lead notification failed:', err)
      }
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('Report generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
