import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

// GET /api/s/[token]/[streamId] — stream proxy redirect
// Looks up real credentials and redirects to actual stream URL
// Credentials never appear in the M3U file — only the token does
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; streamId: string }> }
) {
  const { token, streamId } = await params
  const admin = createAdminClient()

  // Validate token
  const { data: playlist } = await admin
    .from('playlists')
    .select('credential_id')
    .eq('token', token)
    .single()

  if (!playlist) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Get credentials
  const { data: cred } = await admin
    .from('credentials')
    .select('server_url, port, username_enc, password_enc')
    .eq('id', playlist.credential_id)
    .single()

  if (!cred) {
    return new NextResponse('Not found', { status: 404 })
  }

  const username = await decrypt(cred.username_enc)
  const password = await decrypt(cred.password_enc)
  const port = cred.port && cred.port !== '80' ? `:${cred.port}` : ''
  const realUrl = `${cred.server_url}${port}/${username}/${password}/${streamId}.ts`

  // 302 redirect — player connects directly to provider, we don't proxy video data
  return NextResponse.redirect(realUrl, { status: 302 })
}
