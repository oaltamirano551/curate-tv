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

// POST /api/selections — replace user's selections entirely
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { streamIds } = await request.json()

  if (!Array.isArray(streamIds)) {
    return NextResponse.json({ error: 'streamIds must be an array' }, { status: 400 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!cred) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  // Delete existing selections
  await admin.from('selections').delete().eq('user_id', user.id)

  // Insert new selections
  if (streamIds.length > 0) {
    const rows = streamIds.map((sid: number) => ({
      user_id: user.id,
      credential_id: cred.id,
      stream_id: sid,
    }))
    const BATCH = 500
    for (let i = 0; i < rows.length; i += BATCH) {
      await admin.from('selections').insert(rows.slice(i, i + BATCH))
    }
  }

  return NextResponse.json({ success: true, count: streamIds.length })
}
