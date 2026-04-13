'use client'

import Link from "next/link"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getCategoryCode, getFiltersFromCategories, type CountryFilter } from "@/lib/countryMap"

type Channel = {
  stream_id: number
  name: string
  category_id: string
  logo_url: string
  epg_id: string
}

type Category = {
  category_id: string
  category_name: string
  channels?: Channel[]
  loading?: boolean
  loaded?: boolean
}

export default function ChannelsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Map<number, Channel & { category_name: string }>>(new Map())
  const [search, setSearch] = useState('')
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set())
  const [loadingCats, setLoadingCats] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [selectingAll, setSelectingAll] = useState(false)
  const fetchingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const [catRes, selRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/selections'),
      ])
      const catData = await catRes.json()
      const selData = await selRes.json()
      setCategories((catData.categories || []).map((c: Category) => ({ ...c, loaded: false })))
      const prevIds: number[] = selData.selections || []
      const prevChannels: (Channel & { category_name: string })[] = selData.channels || []
      if (prevIds.length > 0) {
        const detailMap = new Map(prevChannels.map(ch => [ch.stream_id, ch]))
        setSelected(new Map(prevIds.map((id: number) => [
          id,
          detailMap.get(id) || { stream_id: id, name: '', category_id: '', logo_url: '', epg_id: '', category_name: '' }
        ])))
      }
      setLoadingCats(false)
    }
    load()
  }, [])

  // Derive country filter buttons from loaded categories
  const countryFilters: CountryFilter[] = useMemo(
    () => getFiltersFromCategories(categories.map(c => c.category_name)),
    [categories]
  )

  const loadCategory = useCallback(async (cat: Category): Promise<Channel[]> => {
    if (cat.loaded) return cat.channels || []
    if (fetchingRef.current.has(cat.category_id)) {
      // Wait for existing fetch to complete
      return new Promise(resolve => {
        const interval = setInterval(() => {
          if (!fetchingRef.current.has(cat.category_id)) {
            clearInterval(interval)
            setCategories(prev => {
              const found = prev.find(c => c.category_id === cat.category_id)
              resolve(found?.channels || [])
              return prev
            })
          }
        }, 100)
      })
    }
    fetchingRef.current.add(cat.category_id)
    setCategories(prev => prev.map(c =>
      c.category_id === cat.category_id ? { ...c, loading: true } : c
    ))
    const res = await fetch(`/api/channels?category_id=${cat.category_id}`)
    const data = await res.json()
    const channels: Channel[] = data.channels || []
    setCategories(prev => prev.map(c =>
      c.category_id === cat.category_id ? { ...c, channels, loading: false, loaded: true } : c
    ))
    setSelected(prev => {
      const next = new Map(prev)
      channels.forEach(ch => {
        if (next.has(ch.stream_id)) next.set(ch.stream_id, { ...ch, category_name: cat.category_name })
      })
      return next
    })
    fetchingRef.current.delete(cat.category_id)
    return channels
  }, [])

  function toggleExpand(cat: Category) {
    const next = expandedCat === cat.category_id ? null : cat.category_id
    setExpandedCat(next)
    if (next) loadCategory(cat)
  }

  function toggleChannel(ch: Channel, categoryName: string) {
    setSelected(prev => {
      const next = new Map(prev)
      next.has(ch.stream_id) ? next.delete(ch.stream_id) : next.set(ch.stream_id, { ...ch, category_name: categoryName })
      return next
    })
  }

  async function toggleCategory(cat: Category) {
    // Load first if needed
    let channels = cat.channels
    if (!cat.loaded) {
      channels = await loadCategory(cat)
    }
    if (!channels) return
    const allSel = channels.every(ch => selected.has(ch.stream_id))
    setSelected(prev => {
      const next = new Map(prev)
      channels!.forEach(ch =>
        allSel ? next.delete(ch.stream_id) : next.set(ch.stream_id, { ...ch, category_name: cat.category_name })
      )
      return next
    })
  }

  async function selectAllVisible() {
    setSelectingAll(true)
    // Get current visible cats snapshot (can't use state inside async reliably)
    const visible = categories.filter(c => {
      if (activeCountries.size > 0 && !activeCountries.has(getCategoryCode(c.category_name))) return false
      if (search.trim() && !c.category_name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    // Load all unloaded categories in parallel
    const results = await Promise.all(visible.map(cat => loadCategory(cat)))
    // Select all channels from all visible categories
    setSelected(prev => {
      const next = new Map(prev)
      visible.forEach((cat, i) => {
        results[i].forEach(ch => next.set(ch.stream_id, { ...ch, category_name: cat.category_name }))
      })
      return next
    })
    setSelectingAll(false)
  }

  async function handleSave() {
    setSaving(true)
    setSyncProgress(null)
    setError(null)

    const streamIds = Array.from(selected.keys())

    // Phase 1: Save stream IDs only — tiny payload, fast (<2s)
    const res = await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamIds }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }

    // Phase 2: Sync channel details per category from Xtream
    // Group selected channels by category_id (only channels we have metadata for)
    const catMap = new Map<string, { category_name: string; stream_ids: number[] }>()
    for (const ch of selected.values()) {
      if (!ch.category_id) continue
      const entry = catMap.get(ch.category_id)
      if (entry) entry.stream_ids.push(ch.stream_id)
      else catMap.set(ch.category_id, { category_name: ch.category_name, stream_ids: [ch.stream_id] })
    }

    const categories = Array.from(catMap.entries())
    const total = categories.length
    let done = 0
    let failed = 0
    setSyncProgress({ done: 0, total, failed: 0 })

    // Sync 3 categories at a time — keep Xtream load manageable
    const CHUNK = 3
    for (let i = 0; i < categories.length; i += CHUNK) {
      const chunk = categories.slice(i, i + CHUNK)
      await Promise.all(chunk.map(async ([category_id, { category_name, stream_ids }]) => {
        try {
          const r = await fetch('/api/sync-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_id, category_name, stream_ids }),
          })
          if (!r.ok) failed++
        } catch { failed++ }
        done++
        setSyncProgress({ done, total, failed })
      }))
    }

    router.push('/dashboard')
  }

  function toggleCountry(code: string) {
    setActiveCountries(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  // Apply country filter + text search
  const visibleCategories = useMemo(() => {
    let list = categories
    if (activeCountries.size > 0) {
      list = list.filter(c => activeCountries.has(getCategoryCode(c.category_name)))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.category_name.toLowerCase().includes(q))
    }
    return list
  }, [categories, activeCountries, search])

  const selectedCount = selected.size

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
          {syncProgress && (
            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span className="loading loading-spinner loading-xs text-primary" />
              <span>Syncing {syncProgress.done}/{syncProgress.total}</span>
              {syncProgress.failed > 0 && (
                <span className="text-error text-xs">{syncProgress.failed} failed</span>
              )}
            </div>
          )}
          {!syncProgress && (
            <div className="text-sm text-base-content/60 hidden sm:block">
              <span className="text-white font-semibold">{selectedCount}</span> selected
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving && !syncProgress ? <span className="loading loading-spinner loading-sm" /> : 'Save Playlist →'}
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

      {loadingCats ? (
        <div className="flex-1 flex items-center justify-center gap-3 flex-col">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-base-content/60 text-sm">Loading categories...</p>
        </div>
      ) : (
        <div className="flex flex-1">

          {/* Sidebar */}
          <aside className="w-60 bg-base-100 border-r border-base-300 flex-shrink-0 sticky top-[113px] h-[calc(100vh-113px)] overflow-y-auto p-4 hidden md:block">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
              {visibleCategories.length} / {categories.length} categories
            </p>
            <ul className="menu menu-sm gap-0.5 p-0">
              {visibleCategories.map(cat => {
                const catCount = Array.from(selected.values()).filter(ch => ch.category_id === cat.category_id).length
                return (
                  <li key={cat.category_id}>
                    <button
                      onClick={() => {
                        setExpandedCat(cat.category_id)
                        loadCategory(cat)
                        document.getElementById(`cat-${cat.category_id}`)?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex justify-between text-xs py-1.5 w-full text-left"
                    >
                      <span className="truncate">{cat.category_name}</span>
                      {catCount > 0 && <span className="badge badge-primary badge-xs shrink-0">{catCount}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Main */}
          <main className="flex-1 p-5 space-y-4 max-w-4xl">
            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

            {/* Country flag filter bar */}
            <div className="bg-base-100 rounded-2xl p-3 shadow-sm">
              <p className="text-xs text-base-content/40 font-medium uppercase tracking-wider mb-2 px-1">Filter by country</p>
              <div className="flex flex-wrap gap-1.5">
                {/* All button */}
                <button
                  onClick={() => setActiveCountries(new Set())}
                  className={`btn btn-xs gap-1 ${activeCountries.size === 0 ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🌐 All
                </button>
                {countryFilters.map(f => (
                  <button
                    key={f.code}
                    onClick={() => toggleCountry(f.code)}
                    className={`btn btn-xs gap-1 ${activeCountries.has(f.code) ? 'btn-primary' : 'btn-ghost'}`}
                    title={f.label}
                  >
                    <span>{f.flag}</span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search + select all */}
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder={activeCountries.size > 0 ? `Search filtered categories...` : 'Search all categories...'}
                className="input input-bordered flex-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="text-sm text-base-content/50 shrink-0">{visibleCategories.length} shown</span>
              <button
                className="btn btn-sm btn-outline shrink-0"
                onClick={selectAllVisible}
                disabled={selectingAll || visibleCategories.length === 0}
                title="Load and select all visible categories"
              >
                {selectingAll ? <span className="loading loading-spinner loading-xs" /> : 'Select all'}
              </button>
            </div>

            {/* Category accordion */}
            {visibleCategories.length === 0 && (
              <div className="text-center py-16 text-base-content/40">
                No categories found.
              </div>
            )}

            {visibleCategories.map(cat => {
              const isExpanded = expandedCat === cat.category_id
              const catSelectedCount = cat.channels
                ? cat.channels.filter(ch => selected.has(ch.stream_id)).length
                : Array.from(selected.values()).filter(ch => ch.category_id === cat.category_id).length
              const allSelected = !!cat.channels?.length && cat.channels.every(ch => selected.has(ch.stream_id))
              const someSelected = catSelectedCount > 0 && !allSelected
              const code = getCategoryCode(cat.category_name)
              const countryInfo = countryFilters.find(f => f.code === code)

              return (
                <div key={cat.category_id} id={`cat-${cat.category_id}`} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4 cursor-pointer select-none" onClick={() => toggleExpand(cat)}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary flex-shrink-0"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={e => { e.stopPropagation(); toggleCategory(cat) }}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {countryInfo && (
                            <span
                              className="text-base cursor-pointer hover:scale-125 transition-transform"
                              title={`Filter: ${countryInfo.label}`}
                              onClick={e => { e.stopPropagation(); toggleCountry(code) }}
                            >
                              {countryInfo.flag}
                            </span>
                          )}
                          <p className="font-semibold text-sm truncate">{cat.category_name}</p>
                        </div>
                        <p className="text-xs text-base-content/50 mt-0.5">
                          {cat.loaded ? `${cat.channels?.length} channels` : 'Click to load'}
                          {catSelectedCount > 0 && ` · ${catSelectedCount} selected`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {catSelectedCount > 0 && <span className="badge badge-primary badge-sm">{catSelectedCount}</span>}
                        {cat.loading && <span className="loading loading-spinner loading-xs text-primary" />}
                        <svg className={`w-4 h-4 text-base-content/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-base-200">
                      {cat.loading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-base-content/50">
                          <span className="loading loading-spinner loading-sm" /> Loading channels...
                        </div>
                      ) : cat.channels && cat.channels.length > 0 ? (
                        <>
                          <div className="flex gap-2 pt-3 pb-2">
                            <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); toggleCategory(cat) }}>
                              {allSelected ? 'Deselect all' : 'Select all'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {cat.channels.map(ch => (
                              <label key={ch.stream_id} className="cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="hidden" checked={selected.has(ch.stream_id)} onChange={() => toggleChannel(ch, cat.category_name)} />
                                <span className={`badge badge-outline text-xs py-3 px-3 cursor-pointer transition-all hover:badge-primary ${selected.has(ch.stream_id) ? 'badge-primary border-primary' : ''}`}>
                                  {ch.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-base-content/40 py-4">No channels in this category.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </main>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="btm-nav btm-nav-sm md:hidden bg-base-100 border-t border-base-300 z-10">
        <div className="flex items-center justify-between w-full px-6">
          <span className="text-sm text-base-content/60">{selectedCount} selected</span>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save →'}
          </button>
        </div>
      </div>
    </div>
  )
}
