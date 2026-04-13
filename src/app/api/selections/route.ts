import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/selections — get user's selected stream IDs
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('selections')
    .select('stream_id')
    .eq('user_id', user.id)

  return NextResponse.json({ selections: (data || []).map(s => s.stream_id) })
}

// POST /api/selections — save selections + cache selected channel details in DB
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Expect both streamIds and full channel objects for caching
  const { streamIds, channels } = await request.json() as {
    streamIds: number[]
    channels: Array<{
      stream_id: number
      name: string
      category_id: string
      category_name: string
      logo_url: string
      epg_id: string
    }>
  }

  if (!Array.isArray(streamIds)) {
    return NextResponse.json({ error: 'streamIds must be an array' }, { status: 400 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!cred) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  // Replace selections
  await admin.from('selections').delete().eq('user_id', user.id)

  if (streamIds.length > 0) {
    const selRows = streamIds.map((sid: number) => ({
      user_id: user.id,
      credential_id: cred.id,
      stream_id: sid,
    }))
    const BATCH = 500
    for (let i = 0; i < selRows.length; i += BATCH) {
      await admin.from('selections').insert(selRows.slice(i, i + BATCH))
    }
  }

  // Cache only the selected channel details (small set, fast)
  await admin.from('channels').delete().eq('credential_id', cred.id)

  if (channels && channels.length > 0) {
    const chRows = channels.map(ch => ({ ...ch, credential_id: cred.id }))
    const BATCH = 500
    for (let i = 0; i < chRows.length; i += BATCH) {
      await admin.from('channels').insert(chRows.slice(i, i + BATCH))
    }
  }

  return NextResponse.json({ success: true, count: streamIds.length })
}
