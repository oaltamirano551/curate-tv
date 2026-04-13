'use client'

import Link from "next/link"
import { useState } from "react"
import { logout } from "@/app/actions/auth"

type Category = { name: string; count: number }

type Props = {
  token: string
  selectionCount: number
  categories: Category[]
  epgUpdated: string | null
  firstName: string
}

const PLAYER_GUIDES = [
  { name: "TiviMate", icon: "📱", steps: "Settings → Playlists → Add Playlist → paste M3U URL → Advanced → paste EPG URL" },
  { name: "IPTV Smarters", icon: "📺", steps: "Add User → M3U URL → paste M3U URL → EPG URL → paste EPG URL" },
  { name: "VLC", icon: "🎬", steps: "Media → Open Network Stream → paste M3U URL (EPG not supported)" },
]

export default function DashboardClient({ token, selectionCount, categories, epgUpdated, firstName }: Props) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  const m3uUrl = `${baseUrl}/api/playlist/${token}/playlist.m3u`
  const epgUrl = `${baseUrl}/api/playlist/${token}/epg.xml`

  const [copiedM3u, setCopiedM3u] = useState(false)
  const [copiedEpg, setCopiedEpg] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  async function copyM3u() {
    await navigator.clipboard.writeText(m3uUrl)
    setCopiedM3u(true)
    setTimeout(() => setCopiedM3u(false), 2000)
  }

  async function copyEpg() {
    await navigator.clipboard.writeText(epgUrl)
    setCopiedEpg(true)
    setTimeout(() => setCopiedEpg(false), 2000)
  }

  async function refreshEpg() {
    setRefreshing(true)
    setRefreshMsg(null)
    const res = await fetch(`/api/playlist/${token}/epg.xml`)
    setRefreshing(false)
    setRefreshMsg(res.ok ? '✓ EPG updated' : '✗ Refresh failed — try again')
    setTimeout(() => setRefreshMsg(null), 4000)
  }

  const epgAge = epgUpdated
    ? (() => {
        const mins = Math.round((Date.now() - new Date(epgUpdated).getTime()) / 60000)
        if (mins < 60) return `${mins}m ago`
        if (mins < 1440) return `${Math.round(mins / 60)}h ago`
        return `${Math.round(mins / 1440)}d ago`
      })()
    : 'Never'

  return (
    <div className="min-h-screen flex flex-col bg-base-200">

      {/* Navbar */}
      <nav className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-10">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold">
            <span className="text-primary">Curate</span><span className="text-white">TV</span>
          </Link>
        </div>
        <div className="flex-none gap-3">
          <Link href="/channels" className="btn btn-ghost btn-sm">Edit Channels</Link>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="avatar placeholder btn btn-ghost btn-circle">
              <div className="bg-primary text-primary-content rounded-full w-8">
                <span className="text-sm font-bold">{firstName[0].toUpperCase()}</span>
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box shadow-lg z-10 w-40 mt-2 border border-base-300">
              <li><a>Settings</a></li>
              <li>
                <button onClick={() => logout()} className="text-error">Log out</button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Hey {firstName} 👋</h1>
          <p className="text-base-content/60 mt-1">Your playlist is live. Paste both URLs into your IPTV player.</p>
        </div>

        {/* M3U URL */}
        <div className="card bg-base-100 shadow-sm border border-primary/20">
          <div className="card-body gap-3 p-5">
            <div className="flex items-center gap-2">
              <span>📋</span>
              <h2 className="font-semibold">Playlist URL (M3U)</h2>
              <div className="badge badge-success badge-sm ml-auto">Live</div>
            </div>
            <p className="text-xs text-base-content/50">Paste this into your IPTV player. No credentials visible.</p>
            <div className="flex gap-2">
              <input readOnly value={m3uUrl} className="input input-bordered flex-1 font-mono text-xs" />
              <button className="btn btn-primary btn-sm px-4" onClick={copyM3u}>
                {copiedM3u ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* EPG URL */}
        <div className="card bg-base-100 shadow-sm border border-secondary/20">
          <div className="card-body gap-3 p-5">
            <div className="flex items-center gap-2">
              <span>📡</span>
              <h2 className="font-semibold">TV Guide URL (EPG)</h2>
              <div className={`badge badge-sm ml-auto ${epgUpdated ? 'badge-success' : 'badge-warning'}`}>
                {epgUpdated ? `Updated ${epgAge}` : 'Not loaded yet'}
              </div>
            </div>
            <p className="text-xs text-base-content/50">Paste alongside your M3U URL for a full TV guide. Auto-refreshes every 24h.</p>
            <div className="flex gap-2">
              <input readOnly value={epgUrl} className="input input-bordered flex-1 font-mono text-xs" />
              <button className="btn btn-secondary btn-sm px-4" onClick={copyEpg}>
                {copiedEpg ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-outline btn-xs gap-1" onClick={refreshEpg} disabled={refreshing}>
                {refreshing ? <span className="loading loading-spinner loading-xs" /> : '🔄'}
                {refreshing ? 'Refreshing...' : 'Refresh EPG now'}
              </button>
              {refreshMsg && <span className="text-xs text-base-content/60">{refreshMsg}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat bg-base-100 rounded-2xl shadow-sm p-4">
            <div className="stat-title text-xs">Channels</div>
            <div className="stat-value text-2xl text-primary">{selectionCount}</div>
            <div className="stat-desc">{categories.length} categories</div>
          </div>
          <div className="stat bg-base-100 rounded-2xl shadow-sm p-4">
            <div className="stat-title text-xs">EPG last sync</div>
            <div className="stat-value text-xl">{epgAge}</div>
            <div className="stat-desc">Auto every 24h</div>
          </div>
          <div className="stat bg-base-100 rounded-2xl shadow-sm p-4">
            <div className="stat-title text-xs">Status</div>
            <div className="stat-value text-xl text-success">Live</div>
            <div className="stat-desc">Playlist active</div>
          </div>
        </div>

        {/* Selected categories */}
        {categories.length > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Your Categories</h2>
                <Link href="/channels" className="btn btn-ghost btn-xs">Edit →</Link>
              </div>
              <div className="space-y-1">
                {categories.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between py-1.5 border-b border-base-200 last:border-0">
                    <span className="text-sm">{cat.name}</span>
                    <span className="badge badge-ghost badge-sm">{cat.count} ch</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectionCount === 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center text-center gap-3 py-10">
              <div className="text-4xl">📺</div>
              <h2 className="font-semibold">No channels selected yet</h2>
              <p className="text-sm text-base-content/60">Pick the channels you want to keep.</p>
              <Link href="/channels" className="btn btn-primary btn-sm">Pick Channels</Link>
            </div>
          </div>
        )}

        {/* How to use */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4 p-5">
            <h2 className="font-semibold">How to add to your player</h2>
            <div className="space-y-4">
              {PLAYER_GUIDES.map(p => (
                <div key={p.name} className="flex gap-3 items-start">
                  <div className="text-xl">{p.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-base-content/60 mt-0.5">{p.steps}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
