import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || typeof id !== 'string' || id.length > 50) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  // Check cookie first (local dev without Supabase)
  const cookie = req.cookies.get(`audit_${id}`)
  if (cookie) {
    try {
      const audit = JSON.parse(cookie.value)
      return NextResponse.json({ audit })
    } catch {
      // fall through to Supabase
    }
  }

  // Try Supabase
  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!hasSupabase) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  const { data, error } = await supabaseAdmin
    .from('audit_responses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  return NextResponse.json({ audit: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { contact_email, company_name, personal_email } = body

  if (!contact_email?.trim() || !company_name?.trim()) {
    return NextResponse.json({ error: 'Email and website are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email.trim())) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!hasSupabase) {
    return NextResponse.json({ ok: true })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  const contactName = contact_email.trim().split('@')[0]

  const { error } = await supabaseAdmin
    .from('audit_responses')
    .update({
      contact_email: contact_email.trim(),
      contact_name: contactName,
      company_name: company_name.trim(),
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update audit contact:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  // Fire webhook now that we have contact info
  const { data: audit } = await supabaseAdmin
    .from('audit_responses')
    .select('*')
    .eq('id', id)
    .single()

  if (audit) {
    const webhookUrl = process.env.WEBHOOK_URL
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_id: id,
          contact_name: contactName,
          contact_email: contact_email.trim(),
          company_name: company_name.trim(),
          business_type: audit.industry ?? null,
          urgency: audit.findings?.urgency ?? null,
          personal_email: personal_email ?? false,
          scores: audit.scores,
          completed_at: new Date().toISOString(),
        }),
      }).then(async (res) => {
        if (res.ok) {
          await supabaseAdmin
            .from('audit_responses')
            .update({ webhook_sent: true, webhook_sent_at: new Date().toISOString() })
            .eq('id', id)
        }
      }).catch(() => {})
    }
  }

  // Scrape website in background
  const websiteUrl = company_name.trim()
  if (websiteUrl) {
    import('@/lib/scrape-website').then(({ scrapeWebsite }) => {
      scrapeWebsite(websiteUrl).then(async (content) => {
        if (content) {
          await supabaseAdmin
            .from('audit_responses')
            .update({ website_content: content })
            .eq('id', id)
        }
      }).catch(() => {})
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
