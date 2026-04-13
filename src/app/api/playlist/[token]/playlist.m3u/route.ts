import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/playlist/[token]/playlist.m3u — public, no auth needed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  // Look up playlist by token
  const { data: playlist } = await admin
    .from('playlists')
    .select('id, user_id, credential_id')
    .eq('token', token)
    .single()

  if (!playlist) {
    return new NextResponse('Playlist not found', { status: 404 })
  }

  // Get selected stream IDs for this user (paginate past 1000-row default)
  const { data: selections } = await admin
    .from('selections')
    .select('stream_id')
    .eq('user_id', playlist.user_id)
    .range(0, 9999)

  if (!selections || selections.length === 0) {
    return new NextResponse('#EXTM3U\n# No channels selected', {
      headers: { 'Content-Type': 'audio/x-mpegurl' }
    })
  }

  const streamIds = selections.map(s => s.stream_id)

  // Get channel details in batches (large IN clauses can hit URL length limits)
  const BATCH = 500
  let channels: Array<{ stream_id: number; name: string; category_name: string; logo_url: string; epg_id: string }> = []
  for (let i = 0; i < streamIds.length; i += BATCH) {
    const { data } = await admin
      .from('channels')
      .select('stream_id, name, category_name, logo_url, epg_id')
      .eq('credential_id', playlist.credential_id)
      .in('stream_id', streamIds.slice(i, i + BATCH))
    channels = channels.concat(data || [])
  }
  // Sort client-side after batching
  channels.sort((a, b) => a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name))

  if (!channels || channels.length === 0) {
    return new NextResponse('#EXTM3U\n# No channel details cached — re-save your selection', { headers: { 'Content-Type': 'audio/x-mpegurl' } })
  }

  // Build base URL for stream proxy
  const baseUrl = new URL(request.url).origin

  // Build M3U — stream URLs point to our proxy, not the provider directly
  const lines = ['#EXTM3U']
  for (const ch of channels) {
    const streamUrl = `${baseUrl}/api/s/${token}/${ch.stream_id}`
    lines.push(
      `#EXTINF:-1 tvg-id="${ch.epg_id || ''}" tvg-name="${ch.name}" tvg-logo="${ch.logo_url || ''}" group-title="${ch.category_name || ''}",${ch.name}`
    )
    lines.push(streamUrl)
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': 'inline; filename="playlist.m3u"',
      'Cache-Control': 'no-cache',
    }
  })
}
