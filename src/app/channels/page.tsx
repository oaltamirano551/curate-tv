'use client'

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

type Channel = {
  stream_id: number
  name: string
  category_id: string
  category_name: string
  logo_url: string
  epg_id: string
}

type Category = {
  category_id: string
  category_name: string
  channels: Channel[]
}

export default function ChannelsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load channels + existing selections
  useEffect(() => {
    async function load() {
      const [catRes, selRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/selections'),
      ])
      const catData = await catRes.json()
      const selData = await selRes.json()
      setCategories(catData.categories || [])
      setSelected(new Set(selData.selections || []))
      setLoading(false)
    }
    load()
  }, [])

  function toggleChannel(streamId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(streamId) ? next.delete(streamId) : next.add(streamId)
      return next
    })
  }

  function toggleCategory(cat: Category) {
    const allSelected = cat.channels.every(ch => selected.has(ch.stream_id))
    setSelected(prev => {
      const next = new Set(prev)
      cat.channels.forEach(ch => allSelected ? next.delete(ch.stream_id) : next.add(ch.stream_id))
      return next
    })
  }

  function selectAll() {
    const all = new Set<number>()
    categories.forEach(cat => cat.channels.forEach(ch => all.add(ch.stream_id)))
    setSelected(all)
  }

  function clearAll() { setSelected(new Set()) }

  const filteredCategories = useCallback(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        channels: cat.channels.filter(ch => ch.name.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.channels.length > 0 || cat.category_name.toLowerCase().includes(q))
  }, [categories, search])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamIds: Array.from(selected) }),
    })
    if (!res.ok) {
      setError('Failed to save. Try again.')
      setSaving(false)
      return
    }
    router.push('/dashboard')
  }

  const totalChannels = categories.reduce((a, c) => a + c.channels.length, 0)
  const visible = filteredCategories()

  return (
    <div className="min-h-screen flex flex-col bg-base-200">

      {/* Top bar */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-10">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold">
            <span className="text-primary">Curate</span><span className="text-white">TV</span>
          </Link>
        </div>
        <div className="flex-none gap-3 items-center">
          <div className="text-sm text-base-content/60 hidden sm:block">
            <span className="text-white font-semibold">{selected.size}</span> / {totalChannels} selected
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Playlist →'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-base-100 border-b border-base-300 px-6 py-3">
        <ul className="steps steps-horizontal w-full max-w-md mx-auto">
          <li className="step step-primary text-xs">Connect</li>
          <li className="step step-primary text-xs">Pick Channels</li>
          <li className="step text-xs">Get Your URL</li>
        </ul>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-3 flex-col">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-base-content/60 text-sm">Loading your channels...</p>
        </div>
      ) : (
        <div className="flex flex-1 gap-0">

          {/* Sidebar */}
          <aside className="w-60 bg-base-100 border-r border-base-300 flex-shrink-0 sticky top-[113px] h-[calc(100vh-113px)] overflow-y-auto p-4 hidden md:block">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
              {categories.length} Categories
            </p>
            <ul className="menu menu-sm gap-0.5 p-0">
              {categories.map(cat => {
                const catSelected = cat.channels.filter(ch => selected.has(ch.stream_id)).length
                return (
                  <li key={cat.category_id}>
                    <a href={`#cat-${cat.category_id}`} className="flex justify-between text-xs py-1.5">
                      <span className="truncate">{cat.category_name}</span>
                      {catSelected > 0 && (
                        <span className="badge badge-primary badge-xs shrink-0">{catSelected}</span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Main */}
          <main className="flex-1 p-5 space-y-5 max-w-3xl">

            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

            {/* Search + controls */}
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder="Search channels..."
                className="input input-bordered flex-1 min-w-48"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>Select all</button>
              <button className="btn btn-ghost btn-sm text-error" onClick={clearAll}>Clear all</button>
            </div>

            {/* Category cards */}
            {visible.map(cat => {
              const catSelectedCount = cat.channels.filter(ch => selected.has(ch.stream_id)).length
              const allCatSelected = catSelectedCount === cat.channels.length
              const someCatSelected = catSelectedCount > 0 && !allCatSelected

              return (
                <div key={cat.category_id} id={`cat-${cat.category_id}`} className="card bg-base-100 shadow-sm">
                  <div className="card-body gap-3 p-5">

                    {/* Category header */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={allCatSelected}
                          ref={el => { if (el) el.indeterminate = someCatSelected }}
                          onChange={() => toggleCategory(cat)}
                        />
                        <div>
                          <p className="font-semibold text-sm">{cat.category_name}</p>
                          <p className="text-xs text-base-content/50">{cat.channels.length} channels</p>
                        </div>
                      </label>
                      {catSelectedCount > 0 && (
                        <span className="badge badge-primary badge-sm">{catSelectedCount} selected</span>
                      )}
                    </div>

                    {/* Channel chips */}
                    <div className="flex flex-wrap gap-2">
                      {cat.channels.map(ch => (
                        <label key={ch.stream_id} className="cursor-pointer">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selected.has(ch.stream_id)}
                            onChange={() => toggleChannel(ch.stream_id)}
                          />
                          <span className={`badge badge-outline text-xs py-3 px-3 cursor-pointer transition-all hover:badge-primary ${selected.has(ch.stream_id) ? 'badge-primary border-primary' : ''}`}>
                            {ch.name}
                          </span>
                        </label>
                      ))}
                    </div>

                  </div>
                </div>
              )
            })}

            {visible.length === 0 && (
              <div className="text-center py-20 text-base-content/40">
                No channels match &quot;{search}&quot;
              </div>
            )}

          </main>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="btm-nav btm-nav-sm md:hidden bg-base-100 border-t border-base-300 z-10">
        <div className="flex items-center justify-between w-full px-6">
          <span className="text-sm text-base-content/60">{selected.size} selected</span>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save →'}
          </button>
        </div>
      </div>

    </div>
  )
}
