import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateScores } from '@/lib/scoring'
import { calculateWasteAndFindings } from '@/lib/waste'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { answers, sdm_name, sdm_email } = body

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  const companyName = answers.company_name?.trim()
  const contactName = answers.contact_name?.trim()
  const contactEmail = answers.contact_email?.trim()

  if (!companyName || !contactName || !contactEmail) {
    return NextResponse.json({ error: 'Company name, contact name, and email are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const scores = calculateScores(answers)
  const { totalWaste, findings } = calculateWasteAndFindings(answers)

  const { data, error } = await supabaseAdmin
    .from('audit_responses')
    .insert({
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      role: answers.role ?? null,
      industry: answers.industry ?? null,
      employee_count: answers.employee_count ?? null,
      answers,
      scores,
      overall_score: scores.overall,
      score_band: scores.band,
      total_waste: totalWaste,
      findings,
      sdm_name: sdm_name ?? null,
      sdm_email: sdm_email ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save audit:', error)
    return NextResponse.json({ error: 'Failed to save audit response' }, { status: 500 })
  }

  // Fire webhook in background (don't block response)
  const webhookUrl = process.env.WEBHOOK_URL
  if (webhookUrl) {
    fireWebhook(webhookUrl, {
      audit_id: data.id,
      contact_name: contactName,
      contact_email: contactEmail,
      company_name: companyName,
      role: answers.role ?? null,
      industry: answers.industry ?? null,
      employee_count: answers.employee_count ?? null,
      answers,
      overall_score: scores.overall,
      score_band: scores.band,
      total_waste: totalWaste,
      findings,
      categories: scores.categories,
      sdm_name: sdm_name ?? null,
      sdm_email: sdm_email ?? null,
      completed_at: new Date().toISOString(),
    }).then(async (sent) => {
      if (sent) {
        await supabaseAdmin
          .from('audit_responses')
          .update({ webhook_sent: true, webhook_sent_at: new Date().toISOString() })
          .eq('id', data.id)
      }
    }).catch(() => {})
  }

  return NextResponse.json({ id: data.id, scores, totalWaste, findings })
}

async function fireWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.error('Webhook failed:', err)
    return false
  }
}
