import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

// EPG XML from provider can be 50MB+ and take 30-60s to fetch
export const maxDuration = 60

// GET /api/playlist/[token]/epg.xml — public EPG endpoint
// Returns filtered XMLTV data for the user's selected channels only
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  // Look up playlist
  const { data: playlist } = await admin
    .from('playlists')
    .select('id, user_id, credential_id, epg_cache, epg_updated')
    .eq('token', token)
    .single()

  if (!playlist) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Return cached EPG if fresh (under 24 hours)
  if (playlist.epg_cache && playlist.epg_updated) {
    const age = Date.now() - new Date(playlist.epg_updated).getTime()
    if (age < 24 * 60 * 60 * 1000) {
      return new NextResponse(playlist.epg_cache, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      })
    }
  }

  // Fetch fresh EPG from provider
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
    // Return stale cache if fetch fails
    if (playlist.epg_cache) {
      return new NextResponse(playlist.epg_cache, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      })
    }
    return new NextResponse('<tv></tv>', { headers: { 'Content-Type': 'application/xml' } })
  }

  // Filter XMLTV to selected channels only (paginate past 1000-row default)
  const { data: selections } = await admin
    .from('selections')
    .select('stream_id')
    .eq('user_id', playlist.user_id)
    .range(0, 9999)

  const streamIds = (selections || []).map(s => s.stream_id)
  const BATCH = 500
  let allChannelRows: Array<{ epg_id: string }> = []
  for (let i = 0; i < streamIds.length; i += BATCH) {
    const { data } = await admin
      .from('channels')
      .select('epg_id')
      .eq('credential_id', playlist.credential_id)
      .in('stream_id', streamIds.slice(i, i + BATCH))
    allChannelRows = allChannelRows.concat(data || [])
  }
  const channels = allChannelRows

  const epgIds = new Set((channels || []).map(c => c.epg_id).filter(Boolean))

  // Simple XML filter — keep only <channel> and <programme> tags matching our epg_ids
  const filteredXml = filterXmltvToChannels(xmlData, epgIds)

  // Cache in DB
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

  // Extract <tv> opening tag with attributes
  const tvMatch = xml.match(/<tv[^>]*>/)
  const tvOpen = tvMatch ? tvMatch[0] : '<tv>'

  // Keep <channel> blocks whose id is in our set
  const channelRegex = /<channel\s[^>]*id="([^"]*)"[^>]*>[\s\S]*?<\/channel>/g
  const keptChannels: string[] = []
  let m
  while ((m = channelRegex.exec(xml)) !== null) {
    if (epgIds.has(m[1])) keptChannels.push(m[0])
  }

  // Keep <programme> blocks whose channel is in our set
  const progRegex = /<programme\s[^>]*channel="([^"]*)"[^>]*>[\s\S]*?<\/programme>/g
  const keptProgs: string[] = []
  while ((m = progRegex.exec(xml)) !== null) {
    if (epgIds.has(m[1])) keptProgs.push(m[0])
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${tvOpen}\n${keptChannels.join('\n')}\n${keptProgs.join('\n')}\n</tv>`
}
