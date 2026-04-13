import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Saving large selections (1000s of channels) requires multiple DB round-trips
export const maxDuration = 60

// GET /api/selections — get user's selected stream IDs + cached channel details
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

  if (streamIds.length === 0) {
    return NextResponse.json({ selections: [], channels: [] })
  }

  // Return cached channel details so picker can pre-populate with full objects
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

// POST /api/selections — save selections and merge channel details into cache
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Frontend sends streamIds + only channels it has loaded (may be partial)
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

  // --- Selections: replace all (parallel inserts) ---
  await admin.from('selections').delete().eq('user_id', user.id)

  if (streamIds.length > 0) {
    const selRows = streamIds.map((sid: number) => ({
      user_id: user.id,
      credential_id: cred.id,
      stream_id: sid,
    }))
    const BATCH = 500
    const insertBatches = []
    for (let i = 0; i < selRows.length; i += BATCH) {
      insertBatches.push(admin.from('selections').insert(selRows.slice(i, i + BATCH)))
    }
    await Promise.all(insertBatches)
  }

  // --- Channels cache: MERGE, never wipe details we already have ---
  //
  // Problem: if user saves with a country filter active, they only send
  // channel details for the visible country. Without merging, all other
  // countries' cached details would be lost.
  //
  // Strategy:
  //   1. Fetch existing channel cache for all currently-selected stream_ids
  //   2. Merge: incoming details (fresh from Xtream) override existing
  //   3. Delete channels that are no longer selected
  //   4. Re-insert merged set
  //
  const streamIdSet = new Set(streamIds)

  // Fetch existing cache for selected stream_ids (parallel)
  const BATCH = 500
  const fetchBatches = []
  for (let i = 0; i < streamIds.length; i += BATCH) {
    fetchBatches.push(
      admin
        .from('channels')
        .select('stream_id, name, category_id, category_name, logo_url, epg_id')
        .eq('credential_id', cred.id)
        .in('stream_id', streamIds.slice(i, i + BATCH))
    )
  }
  const fetchResults = await Promise.all(fetchBatches)
  const existingChannels: Array<{ stream_id: number; name: string; category_id: string; category_name: string; logo_url: string; epg_id: string }> = []
  fetchResults.forEach(r => { existingChannels.push(...(r.data || [])) })

  // Build merged map: existing first, then incoming overrides (incoming = freshly loaded from Xtream)
  const merged = new Map<number, { stream_id: number; name: string; category_id: string; category_name: string; logo_url: string; epg_id: string; credential_id: string }>()
  for (const ch of existingChannels) {
    if (streamIdSet.has(ch.stream_id)) {
      merged.set(ch.stream_id, { ...ch, credential_id: cred.id })
    }
  }
  // Incoming channels (freshly loaded) override existing — but only if they have a name
  for (const ch of (channels || [])) {
    if (ch.name && streamIdSet.has(ch.stream_id)) {
      merged.set(ch.stream_id, { ...ch, credential_id: cred.id })
    }
  }

  // Delete all existing channel cache for this credential (we'll re-insert merged)
  await admin.from('channels').delete().eq('credential_id', cred.id)

  // Re-insert merged set (parallel)
  const finalChannels = Array.from(merged.values())
  if (finalChannels.length > 0) {
    const insertChBatches = []
    for (let i = 0; i < finalChannels.length; i += BATCH) {
      insertChBatches.push(admin.from('channels').insert(finalChannels.slice(i, i + BATCH)))
    }
    await Promise.all(insertChBatches)
  }

  return NextResponse.json({ success: true, count: streamIds.length, cached: finalChannels.length })
}
