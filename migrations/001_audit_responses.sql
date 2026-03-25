CREATE TABLE IF NOT EXISTS audit_responses (
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
  score_band TEXT NOT NULL DEFAULT 'AI Beginner',
  pdf_generated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_audit_responses_email ON audit_responses(contact_email);
CREATE INDEX IF NOT EXISTS idx_audit_responses_created ON audit_responses(created_at DESC);
