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

  // Get selection count + categories (paginate past 1000-row default)
  const { data: selections } = await admin
    .from('selections')
    .select('stream_id')
    .eq('user_id', user.id)
    .range(0, 9999)

  const streamIds = (selections || []).map(s => s.stream_id)

  // Get selected channels grouped by category — batch IN to avoid URL limits
  const BATCH = 500
  let channels: Array<{ stream_id: number; name: string; category_name: string }> = []
  const ids = streamIds.length > 0 ? streamIds : [-1]
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data } = await admin
      .from('channels')
      .select('stream_id, name, category_name')
      .eq('credential_id', playlist.credential_id)
      .in('stream_id', ids.slice(i, i + BATCH))
    channels = channels.concat(data || [])
  }
  channels.sort((a, b) => a.category_name.localeCompare(b.category_name))

  // Group by category
  const grouped: Record<string, { name: string; count: number }> = {}
  for (const ch of channels || []) {
    if (!grouped[ch.category_name]) grouped[ch.category_name] = { name: ch.category_name, count: 0 }
    grouped[ch.category_name].count++
  }

  const firstName = user.user_metadata?.first_name || 'there'

  return (
    <DashboardClient
      token={playlist.token}
      selectionCount={streamIds.length}
      categories={Object.values(grouped)}
      epgUpdated={playlist.epg_updated}
      firstName={firstName}
    />
  )
}
