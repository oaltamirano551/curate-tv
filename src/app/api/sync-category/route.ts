import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

// Fetch one category from Xtream, cache selected channels in DB
// Called per-category from the frontend after saving stream IDs
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { category_id, category_name, stream_ids } = await request.json() as {
    category_id: string
    category_name: string
    stream_ids: number[]
  }

  if (!category_id || !Array.isArray(stream_ids) || stream_ids.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('server_url, port, username_enc, password_enc, id')
    .eq('user_id', user.id)
    .single()
  if (!cred) return NextResponse.json({ error: 'No credentials' }, { status: 404 })

  const username = await decrypt(cred.username_enc)
  const password = await decrypt(cred.password_enc)
  const port = cred.port && cred.port !== '80' ? `:${cred.port}` : ''
  const base = `${cred.server_url}${port}`

  // Fetch streams for this one category from Xtream
  let streams: Array<{ stream_id: number; name: string; stream_icon: string; epg_channel_id: string }>
  try {
    const res = await fetch(
      `${base}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${category_id}`,
      { signal: AbortSignal.timeout(15000) }
    )
    streams = await res.json()
    if (!Array.isArray(streams)) return NextResponse.json({ ok: true, count: 0 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Xtream fetch failed' }, { status: 500 })
  }

  // Filter to only the stream_ids the user selected
  const selectedSet = new Set(stream_ids)
  const channels = streams
    .filter(s => selectedSet.has(s.stream_id))
    .map(s => ({
      stream_id: s.stream_id,
      name: s.name,
      category_id,
      category_name,
      logo_url: s.stream_icon || '',
      epg_id: s.epg_channel_id || '',
      credential_id: cred.id,
    }))

  if (channels.length === 0) return NextResponse.json({ ok: true, count: 0 })

  // Upsert — unique constraint on (credential_id, stream_id) handles duplicates cleanly
  const { error } = await admin
    .from('channels')
    .upsert(channels, { onConflict: 'credential_id,stream_id' })

  if (error) {
    console.error(`sync-category ${category_id}:`, error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: channels.length })
}
