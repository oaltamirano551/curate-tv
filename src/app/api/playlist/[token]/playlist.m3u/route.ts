import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ChannelRow = {
  stream_id: number
  name: string
  category_name: string
  logo_url: string
  epg_id: string
}

// GET /api/playlist/[token]/playlist.m3u — public, no auth needed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: playlist } = await admin
    .from('playlists')
    .select('user_id')
    .eq('token', token)
    .single()

  if (!playlist) {
    return new NextResponse('Playlist not found', { status: 404 })
  }

  const { data: row } = await admin
    .from('user_playlists')
    .select('channels')
    .eq('user_id', playlist.user_id)
    .single()

  const channels = ((row?.channels as ChannelRow[]) || [])
    .slice()
    .sort((a, b) => a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name))

  if (channels.length === 0) {
    return new NextResponse('#EXTM3U\n# No channels selected', {
      headers: { 'Content-Type': 'audio/x-mpegurl' }
    })
  }

  const baseUrl = new URL(request.url).origin
  const lines = ['#EXTM3U']
  for (const ch of channels) {
    lines.push(
      `#EXTINF:-1 tvg-id="${ch.epg_id || ''}" tvg-name="${ch.name}" tvg-logo="${ch.logo_url || ''}" group-title="${ch.category_name || ''}",${ch.name}`
    )
    lines.push(`${baseUrl}/api/s/${token}/${ch.stream_id}`)
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': 'inline; filename="playlist.m3u"',
      'Cache-Control': 'no-cache',
    }
  })
}
