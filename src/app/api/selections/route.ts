import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ChannelRow = {
  stream_id: number
  name: string
  category_id: string
  category_name: string
  logo_url: string
  epg_id: string
}

// GET /api/selections — return saved channel objects
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('user_playlists')
    .select('channels')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ channels: (row?.channels as ChannelRow[]) || [] })
}

// POST /api/selections — save full channel objects as one JSON blob (one upsert, no row limits)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { channels } = await request.json() as { channels: ChannelRow[] }

  if (!Array.isArray(channels)) {
    return NextResponse.json({ error: 'channels must be an array' }, { status: 400 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!cred) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  const { error } = await admin
    .from('user_playlists')
    .upsert(
      { user_id: user.id, credential_id: cred.id, channels, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, count: channels.length })
}
