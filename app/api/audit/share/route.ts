import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { audit_id, colleague_email, sender_name } = await req.json()

  if (!audit_id || !colleague_email || !sender_name) {
    return NextResponse.json({ error: 'audit_id, colleague_email, and sender_name are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(colleague_email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  // Update the audit record
  await supabaseAdmin
    .from('audit_responses')
    .update({ shared_with_email: colleague_email, shared_at: new Date().toISOString() })
    .eq('id', audit_id)

  // Fire share webhook (automation tool sends the email with PDF attached)
  const webhookUrl = process.env.WEBHOOK_SHARE_URL ?? process.env.WEBHOOK_URL
  if (webhookUrl) {
    // Fetch the full audit to include in payload
    const { data: audit } = await supabaseAdmin
      .from('audit_responses')
      .select('*')
      .eq('id', audit_id)
      .single()

    if (audit) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'share_with_colleague',
          audit_id,
          sender_name,
          colleague_email,
          company_name: audit.company_name,
          overall_score: audit.overall_score,
          total_waste: audit.total_waste,
          score_band: audit.score_band,
          findings: audit.findings,
        }),
      }).catch(err => console.error('Share webhook failed:', err))
    }
  }

  return NextResponse.json({ success: true })
}
