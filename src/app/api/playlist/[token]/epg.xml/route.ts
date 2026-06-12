import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

export const maxDuration = 60

type ChannelRow = { epg_id: string }

// GET /api/playlist/[token]/epg.xml — public EPG endpoint
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: playlist } = await admin
    .from('playlists')
    .select('id, user_id, credential_id, epg_cache, epg_updated')
    .eq('token', token)
    .single()

  if (!playlist) return new NextResponse('Not found', { status: 404 })

  // Return cached EPG if under 24 hours old
  if (playlist.epg_cache && playlist.epg_updated) {
    const age = Date.now() - new Date(playlist.epg_updated).getTime()
    if (age < 24 * 60 * 60 * 1000) {
      return new NextResponse(playlist.epg_cache, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      })
    }
  }

  const { data: cred } = await admin
    .from('credentials')
    .select('server_url, port, username_enc, password_enc')
    .eq('id', playlist.credential_id)
    .single()

  if (!cred) return new NextResponse('Not found', { status: 404 })

  const username = await decrypt(cred.username_enc)
  const password = await decrypt(cred.password_enc)
  const port = cred.port && cred.port !== '80' ? `:${cred.port}` : ''
  const epgUrl = `${cred.server_url}${port}/xmltv.php?username=${username}&password=${password}`

  let xmlData: string
  try {
    const res = await fetch(epgUrl, { signal: AbortSignal.timeout(30000) })
    xmlData = await res.text()
  } catch {
    if (playlist.epg_cache) {
      return new NextResponse(playlist.epg_cache, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      })
    }
    return new NextResponse('<tv></tv>', { headers: { 'Content-Type': 'application/xml' } })
  }

  // Get epg_ids from user_playlists blob — one query, no row limits
  const { data: row } = await admin
    .from('user_playlists')
    .select('channels')
    .eq('user_id', playlist.user_id)
    .single()

  const epgIds = new Set(
    ((row?.channels as ChannelRow[]) || []).map(c => c.epg_id).filter(Boolean)
  )

  const filteredXml = filterXmltvToChannels(xmlData, epgIds)

  await admin
    .from('playlists')
    .update({ epg_cache: filteredXml, epg_updated: new Date().toISOString() })
    .eq('id', playlist.id)

  return new NextResponse(filteredXml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  })
}

function filterXmltvToChannels(xml: string, epgIds: Set<string>): string {
  if (epgIds.size === 0) return '<tv></tv>'

  const tvMatch = xml.match(/<tv[^>]*>/)
  const tvOpen = tvMatch ? tvMatch[0] : '<tv>'

  const channelRegex = /<channel\s[^>]*id="([^"]*)"[^>]*>[\s\S]*?<\/channel>/g
  const keptChannels: string[] = []
  let m
  while ((m = channelRegex.exec(xml)) !== null) {
    if (epgIds.has(m[1])) keptChannels.push(m[0])
  }

  const progRegex = /<programme\s[^>]*channel="([^"]*)"[^>]*>[\s\S]*?<\/programme>/g
  const keptProgs: string[] = []
  while ((m = progRegex.exec(xml)) !== null) {
    if (epgIds.has(m[1])) keptProgs.push(m[0])
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${tvOpen}\n${keptChannels.join('\n')}\n${keptProgs.join('\n')}\n</tv>`
}
