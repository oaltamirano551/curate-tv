import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

// POST /api/channels — sync channels from Xtream into DB
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get credentials
  const { data: cred } = await admin
    .from('credentials')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!cred) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  const username = await decrypt(cred.username_enc)
  const password = await decrypt(cred.password_enc)
  const base = `${cred.server_url}${cred.port !== '80' ? `:${cred.port}` : ''}`

  // Fetch categories
  const catRes = await fetch(`${base}/player_api.php?username=${username}&password=${password}&action=get_live_categories`)
  const categories = await catRes.json()

  // Fetch all live streams
  const streamRes = await fetch(`${base}/player_api.php?username=${username}&password=${password}&action=get_live_streams`)
  const streams = await streamRes.json()

  if (!Array.isArray(streams)) {
    return NextResponse.json({ error: 'Failed to fetch channels from provider' }, { status: 500 })
  }

  // Build category map
  const catMap: Record<string, string> = {}
  if (Array.isArray(categories)) {
    categories.forEach((c: { category_id: string; category_name: string }) => {
      catMap[c.category_id] = c.category_name
    })
  }

  // Upsert channels in batches of 500
  const rows = streams.map((s: {
    stream_id: number
    name: string
    category_id: string
    stream_icon: string
    epg_channel_id: string
  }) => ({
    credential_id: cred.id,
    stream_id: s.stream_id,
    name: s.name,
    category_id: s.category_id,
    category_name: catMap[s.category_id] || 'Uncategorized',
    logo_url: s.stream_icon || '',
    epg_id: s.epg_channel_id || '',
  }))

  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await admin.from('channels').upsert(rows.slice(i, i + BATCH), { onConflict: 'credential_id,stream_id' })
  }

  return NextResponse.json({ success: true, count: rows.length })
}

// GET /api/channels — get cached channels grouped by category
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: cred } = await admin
    .from('credentials')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!cred) return NextResponse.json({ channels: [], categories: [] })

  // Paginate in chunks of 10,000 to bypass Supabase's 1000-row default limit
  const PAGE = 10000
  let allChannels: Array<{ stream_id: number; name: string; category_id: string; category_name: string; logo_url: string; epg_id: string }> = []
  let from = 0

  while (true) {
    const { data: page } = await admin
      .from('channels')
      .select('stream_id, name, category_id, category_name, logo_url, epg_id')
      .eq('credential_id', cred.id)
      .order('category_name')
      .order('name')
      .range(from, from + PAGE - 1)

    if (!page || page.length === 0) break
    allChannels = allChannels.concat(page)
    if (page.length < PAGE) break
    from += PAGE
  }

  // Group by category
  const grouped: Record<string, { category_id: string; category_name: string; channels: typeof allChannels }> = {}
  for (const ch of allChannels) {
    if (!grouped[ch.category_id]) {
      grouped[ch.category_id] = { category_id: ch.category_id, category_name: ch.category_name, channels: [] }
    }
    grouped[ch.category_id].channels.push(ch)
  }

  return NextResponse.json({ categories: Object.values(grouped) })
}

// Extend Vercel function timeout for the sync (POST) — fetching thousands of channels takes time
export const maxDuration = 60
