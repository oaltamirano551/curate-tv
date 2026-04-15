import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/selections — return selected stream IDs + cached channel details
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: selRows } = await admin
    .from('selections')
    .select('stream_id')
    .eq('user_id', user.id)
    .range(0, 9999)

  const streamIds = (selRows || []).map(s => s.stream_id)
  if (streamIds.length === 0) return NextResponse.json({ selections: [], channels: [] })

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let channels: unknown[] = []
  if (cred) {
    const BATCH = 500
    const batches = []
    for (let i = 0; i < streamIds.length; i += BATCH) {
      batches.push(
        admin
          .from('channels')
          .select('stream_id, name, category_id, category_name, logo_url, epg_id')
          .eq('credential_id', cred.id)
          .in('stream_id', streamIds.slice(i, i + BATCH))
      )
    }
    const results = await Promise.all(batches)
    results.forEach(r => { channels = channels.concat(r.data || []) })
  }

  return NextResponse.json({ selections: streamIds, channels })
}

// POST /api/selections — save stream IDs ONLY (fast, tiny body)
// Channel details are synced separately via /api/sync-category
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { streamIds } = await request.json() as { streamIds: number[] }
  if (!Array.isArray(streamIds)) {
    return NextResponse.json({ error: 'streamIds must be an array' }, { status: 400 })
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!cred) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  // DELETE loops until table is clear — Supabase caps each DELETE at 1000 rows
  let rowsDeleted = 0
  do {
    const { count } = await admin
      .from('selections')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
    rowsDeleted = count ?? 0
  } while (rowsDeleted >= 1000)

  // INSERT sequential 500-row batches — safe under all Supabase limits
  // 12,555 IDs ÷ 500 = 26 batches × ~150ms = ~4s (well under Vercel 10s)
  if (streamIds.length > 0) {
    const rows = streamIds.map(sid => ({
      user_id: user.id,
      credential_id: cred.id,
      stream_id: sid,
    }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from('selections').insert(rows.slice(i, i + 500))
      if (error) {
        return NextResponse.json({ error: `Insert failed at row ${i}: ${error.message}` }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true, count: streamIds.length })
}
