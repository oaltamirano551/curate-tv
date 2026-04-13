import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

// POST /api/credentials — save encrypted Xtream credentials
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverUrl, port, username, password } = await request.json()

  if (!serverUrl || !username || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Test connection before saving
  const testUrl = `${serverUrl}${port ? `:${port}` : ''}/player_api.php?username=${username}&password=${password}`

  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    if (!data?.user_info?.auth) {
      return NextResponse.json({ error: 'Invalid credentials — connection failed' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach server — check your URL and try again' }, { status: 400 })
  }

  // Encrypt credentials
  const username_enc = await encrypt(username)
  const password_enc = await encrypt(password)

  const admin = createAdminClient()

  // Upsert — one credential record per user (MVP)
  const { data: cred, error } = await admin
    .from('credentials')
    .upsert(
      { user_id: user.id, server_url: serverUrl, port: port || '80', username_enc, password_enc, status: 'active', last_tested: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create playlist record with token if not exists
  await admin
    .from('playlists')
    .upsert({ user_id: user.id, credential_id: cred.id }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true, credentialId: cred.id })
}

// GET /api/credentials — get user's credential status (no secrets returned)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('credentials')
    .select('id, server_url, port, status, last_tested, created_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ credential: data })
}
