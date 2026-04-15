import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Cache channel details for one category — data comes from frontend (already fetched
// from Xtream during picker load), so no outbound HTTP call needed here.
// Each call is a single DB upsert: fast, well under Vercel's 10s limit.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { category_id, category_name, channels } = await request.json() as {
    category_id: string
    category_name: string
    channels: Array<{ stream_id: number; name: string; logo_url: string; epg_id: string }>
  }

  if (!category_id || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!cred) return NextResponse.json({ error: 'No credentials' }, { status: 404 })

  const rows = channels.map(ch => ({
    stream_id: ch.stream_id,
    name: ch.name,
    category_id,
    category_name,
    logo_url: ch.logo_url || '',
    epg_id: ch.epg_id || '',
    credential_id: cred.id,
  }))

  const { error } = await admin
    .from('channels')
    .upsert(rows, { onConflict: 'credential_id,stream_id' })

  if (error) {
    console.error(`sync-category ${category_id}:`, error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
