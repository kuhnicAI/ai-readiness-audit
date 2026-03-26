import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })

  const supabase = createClient(url, key)

  // Try to insert and select to see if table exists
  const { error: checkError } = await supabase.from('audit_responses').select('id').limit(1)

  if (checkError?.code === 'PGRST205') {
    // Table doesn't exist — tell user to run SQL
    return NextResponse.json({
      error: 'Table does not exist yet',
      instructions: 'Go to your Supabase dashboard → SQL Editor → paste the migration SQL and run it',
      sql: `CREATE TABLE IF NOT EXISTS audit_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  role TEXT,
  industry TEXT,
  employee_count TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  overall_score INTEGER NOT NULL DEFAULT 0,
  score_band TEXT NOT NULL DEFAULT 'Low',
  pdf_generated BOOLEAN DEFAULT false,
  total_waste INTEGER DEFAULT 0,
  findings JSONB DEFAULT '[]',
  sdm_name TEXT,
  sdm_email TEXT,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMPTZ,
  shared_with_email TEXT,
  shared_at TIMESTAMPTZ,
  ai_report TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_responses_email ON audit_responses(contact_email);
CREATE INDEX IF NOT EXISTS idx_audit_responses_created ON audit_responses(created_at DESC);`,
    }, { status: 400 })
  }

  return NextResponse.json({ success: true, message: 'Table exists and connection works' })
}
