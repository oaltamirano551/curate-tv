import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get playlist token
  const { data: playlist } = await admin
    .from('playlists')
    .select('token, epg_updated, credential_id')
    .eq('user_id', user.id)
    .single()

  // If no playlist yet → send to onboarding
  if (!playlist) redirect('/onboarding')

  // Get channel selection — one query, no row limits
  const { data: playlistData } = await admin
    .from('user_playlists')
    .select('channels')
    .eq('user_id', user.id)
    .single()

  const channels = ((playlistData?.channels || []) as Array<{ stream_id: number; name: string; category_name: string }>)
  channels.sort((a, b) => a.category_name.localeCompare(b.category_name))

  const grouped: Record<string, { name: string; count: number }> = {}
  for (const ch of channels) {
    if (!grouped[ch.category_name]) grouped[ch.category_name] = { name: ch.category_name, count: 0 }
    grouped[ch.category_name].count++
  }

  const firstName = user.user_metadata?.first_name || 'there'

  return (
    <DashboardClient
      token={playlist.token}
      selectionCount={channels.length}
      categories={Object.values(grouped)}
      epgUpdated={playlist.epg_updated}
      firstName={firstName}
    />
  )
}
