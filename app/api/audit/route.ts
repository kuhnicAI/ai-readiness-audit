import { NextRequest, NextResponse } from 'next/server'
import { calculateWaste } from '@/lib/waste'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { answers, sdm_name, sdm_email } = body

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  const companyName = (answers.company_name as string)?.trim()
  const contactName = (answers.contact_name as string)?.trim()
  const contactEmail = (answers.contact_email as string)?.trim()

  if (!companyName || !contactName || !contactEmail) {
    return NextResponse.json({ error: 'Company name, contact name, and email are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const waste = calculateWaste(answers)

  const row = {
    company_name: companyName,
    contact_name: contactName,
    contact_email: contactEmail,
    role: answers.role ?? null,
    industry: answers.business_type ?? null,
    employee_count: answers.employee_count ?? null,
    answers,
    scores: waste,
    overall_score: waste.missedRevenueAnnual,
    score_band: waste.missedRevenueAnnual > 500000 ? 'Critical' : waste.missedRevenueAnnual > 200000 ? 'High' : waste.missedRevenueAnnual > 50000 ? 'Moderate' : 'Low',
    total_waste: waste.missedRevenueAnnual,
    findings: {
      businessType: answers.business_type ?? null,
      afterHours: answers.after_hours ?? null,
      urgency: answers.urgency ?? null,
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

  return NextResponse.json({ id: data.id, waste })
}
