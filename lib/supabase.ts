import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

// Lazy init — only created when first accessed at runtime, not at build/import time
let _client: SupabaseClient | null = null
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) _client = getClient()
    return (_client as unknown as Record<string | symbol, unknown>)[prop]
  },
})
