import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

async function getCredentials(userId: string) {
  const admin = createAdminClient()
  const { data: cred } = await admin
    .from('credentials')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (!cred) return null
  const username = await decrypt(cred.username_enc)
  const password = await decrypt(cred.password_enc)
  const base = `${cred.server_url}${cred.port && cred.port !== '80' ? `:${cred.port}` : ''}`
  return { cred, username, password, base }
}

// GET /api/channels?action=categories     — fetch all categories from Xtream directly
// GET /api/channels?category_id=X         — fetch channels for one category from Xtream directly
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getCredentials(user.id)
  if (!ctx) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  const { username, password, base } = ctx
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')

  // Return channels for a specific category
  if (categoryId) {
    const res = await fetch(
      `${base}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${categoryId}`,
      { signal: AbortSignal.timeout(15000) }
    )
    const streams = await res.json()
    if (!Array.isArray(streams)) return NextResponse.json({ channels: [] })
    return NextResponse.json({
      channels: streams.map((s: {
        stream_id: number; name: string; category_id: string;
        stream_icon: string; epg_channel_id: string
      }) => ({
        stream_id: s.stream_id,
        name: s.name,
        category_id: s.category_id,
        logo_url: s.stream_icon || '',
        epg_id: s.epg_channel_id || '',
      }))
    })
  }

  // Return all categories
  const res = await fetch(
    `${base}/player_api.php?username=${username}&password=${password}&action=get_live_categories`,
    { signal: AbortSignal.timeout(15000) }
  )
  const categories = await res.json()
  if (!Array.isArray(categories)) return NextResponse.json({ categories: [] })

  return NextResponse.json({
    categories: categories.map((c: { category_id: string; category_name: string }) => ({
      category_id: c.category_id,
      category_name: c.category_name,
    }))
  })
}

// POST /api/channels — save selected channel details into DB (only the picked ones)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getCredentials(user.id)
  if (!ctx) return NextResponse.json({ error: 'No credentials found' }, { status: 404 })

  const admin = createAdminClient()
  const { channels } = await request.json() as {
    channels: Array<{ stream_id: number; name: string; category_id: string; category_name: string; logo_url: string; epg_id: string }>
  }

  if (!Array.isArray(channels) || channels.length === 0) {
    // Clear all channels if nothing selected
    await admin.from('channels').delete().eq('credential_id', ctx.cred.id)
    return NextResponse.json({ success: true, count: 0 })
  }

  // Delete old, insert only selected
  await admin.from('channels').delete().eq('credential_id', ctx.cred.id)

  const rows = channels.map(ch => ({ ...ch, credential_id: ctx.cred.id }))
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await admin.from('channels').insert(rows.slice(i, i + BATCH))
  }

  return NextResponse.json({ success: true, count: rows.length })
}
