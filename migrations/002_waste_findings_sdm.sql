-- Add waste, findings, SDM tracking, and webhook fields
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS total_waste INTEGER DEFAULT 0;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS findings JSONB DEFAULT '[]';
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS sdm_name TEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS sdm_email TEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS webhook_sent BOOLEAN DEFAULT false;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS webhook_sent_at TIMESTAMPTZ;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS shared_with_email TEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
