import { NextRequest, NextResponse } from 'next/server'
import { calculateWaste } from '@/lib/waste'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { answers, sdm_name, sdm_email, skip_scrape } = body

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  const contactEmail = (answers.contact_email as string)?.trim()
  const companyName = (answers.company_name as string)?.trim() // This is now the website URL
  const contactName = (answers.contact_name as string)?.trim() || contactEmail?.split('@')[0] || ''

  if (!contactEmail || !companyName) {
    return NextResponse.json({ error: 'Email and website are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const waste = calculateWaste(answers)

  const isPersonalEmail = answers.personal_email === 'true'

  const row = {
    company_name: companyName,
    contact_name: contactName,
    contact_email: contactEmail,
    role: answers.role ?? null,
    industry: answers.business_type ?? null,
    employee_count: answers.employee_count ?? null,
    answers: {
      ...answers,
      personal_email: isPersonalEmail,
    },
    scores: waste,
    overall_score: waste.revenueAtRisk,
    score_band: waste.revenueAtRisk > 500000 ? 'Critical' : waste.revenueAtRisk > 200000 ? 'High' : waste.revenueAtRisk > 50000 ? 'Moderate' : 'Low',
    total_waste: waste.revenueAtRisk,
    findings: {
      businessType: answers.business_type ?? null,
      afterHours: answers.after_hours ?? null,
      urgency: answers.urgency ?? null,
      personalEmail: isPersonalEmail,
    },
    sdm_name: sdm_name ?? null,
    sdm_email: sdm_email ?? null,
  }

  // If Supabase isn't configured, return a local ID
  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!hasSupabase) {
    const localId = crypto.randomUUID()
    const response = NextResponse.json({ id: localId, waste })
    response.cookies.set(`audit_${localId}`, JSON.stringify({
      id: localId,
      ...row,
      created_at: new Date().toISOString(),
    }), { maxAge: 3600 })
    return response
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  const { data, error } = await supabaseAdmin
    .from('audit_responses')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save audit:', error)
    return NextResponse.json({ error: 'Failed to save audit response' }, { status: 500 })
  }

  // Fire webhook in background
  const webhookUrl = process.env.WEBHOOK_URL
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audit_id: data.id,
        contact_name: contactName,
        contact_email: contactEmail,
        company_name: companyName,
        role: answers.role ?? null,
        employee_count: answers.employee_count ?? null,
        business_type: answers.business_type ?? null,
        urgency: answers.urgency ?? null,
        personal_email: isPersonalEmail,
        answers,
        waste,
        sdm_name: sdm_name ?? null,
        sdm_email: sdm_email ?? null,
        completed_at: new Date().toISOString(),
      }),
    }).then(async (res) => {
      if (res.ok) {
        await supabaseAdmin
          .from('audit_responses')
          .update({ webhook_sent: true, webhook_sent_at: new Date().toISOString() })
          .eq('id', data.id)
      }
    }).catch(() => {})
  }

  // Scrape website in background (unless skip_scrape flag is set from timeout retry)
  if (!skip_scrape && companyName) {
    import('@/lib/scrape-website').then(({ scrapeWebsite }) => {
      scrapeWebsite(companyName).then(async (content) => {
        if (content) {
          await supabaseAdmin
            .from('audit_responses')
            .update({ website_content: content })
            .eq('id', data.id)
        }
      }).catch(() => {})
    }).catch(() => {})
  }

  return NextResponse.json({ id: data.id, waste })
}
