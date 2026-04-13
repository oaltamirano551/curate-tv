import { createClient } from '@supabase/supabase-js'

// Admin client — only used in server-side API routes
// Has full DB access, never exposed to browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
