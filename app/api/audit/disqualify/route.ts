import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { business_type, weekly_inbound, missed_rate } = body

  const row = {
    business_type: business_type ?? null,
    weekly_inbound: weekly_inbound ?? null,
    missed_rate: missed_rate ?? null,
    disqualified: true,
    created_at: new Date().toISOString(),
  }

  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!hasSupabase) {
    console.log('[Disqualification]', row)
    return NextResponse.json({ ok: true })
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    await supabaseAdmin.from('audit_disqualifications').insert(row)
  } catch (err) {
    console.error('Failed to log disqualification:', err)
  }

  return NextResponse.json({ ok: true })
}
