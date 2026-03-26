CREATE TABLE IF NOT EXISTS audit_disqualifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  business_type TEXT,
  weekly_inbound TEXT,
  missed_rate TEXT,
  disqualified BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_audit_dq_created ON audit_disqualifications(created_at DESC);
