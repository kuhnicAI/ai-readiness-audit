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
