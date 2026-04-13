'use client'

import Link from "next/link"
import { useState, useEffect, useRef, useMemo } from "react"
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
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  const [loadingCats, setLoadingCats] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
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
      if (prevIds.length > 0) {
        setSelected(new Map(prevIds.map((id: number) => [id, { stream_id: id, name: '', category_id: '', logo_url: '', epg_id: '', category_name: '' }])))
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

  async function loadCategory(cat: Category) {
    if (cat.loaded || fetchingRef.current.has(cat.category_id)) return
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
  }

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

  function toggleCategory(cat: Category) {
    if (!cat.channels) return
    const allSelected = cat.channels.every(ch => selected.has(ch.stream_id))
    setSelected(prev => {
      const next = new Map(prev)
      cat.channels!.forEach(ch =>
        allSelected ? next.delete(ch.stream_id) : next.set(ch.stream_id, { ...ch, category_name: cat.category_name })
      )
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const streamIds = Array.from(selected.keys())
    const channels = Array.from(selected.values())
      .filter(ch => ch.name)
      .map(ch => ({ stream_id: ch.stream_id, name: ch.name, category_id: ch.category_id, category_name: ch.category_name, logo_url: ch.logo_url, epg_id: ch.epg_id }))
    const res = await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamIds, channels }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }
    router.push('/dashboard')
  }

  // Apply country filter + text search
  const visibleCategories = useMemo(() => {
    let list = categories
    if (activeCountry) {
      list = list.filter(c => getCategoryCode(c.category_name) === activeCountry)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.category_name.toLowerCase().includes(q))
    }
    return list
  }, [categories, activeCountry, search])

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
          <div className="text-sm text-base-content/60 hidden sm:block">
            <span className="text-white font-semibold">{selectedCount}</span> selected
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
                  onClick={() => setActiveCountry(null)}
                  className={`btn btn-xs gap-1 ${activeCountry === null ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🌐 All
                </button>
                {countryFilters.map(f => (
                  <button
                    key={f.code}
                    onClick={() => setActiveCountry(activeCountry === f.code ? null : f.code)}
                    className={`btn btn-xs gap-1 ${activeCountry === f.code ? 'btn-primary' : 'btn-ghost'}`}
                    title={f.label}
                  >
                    <span>{f.flag}</span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder={activeCountry ? `Search ${countryFilters.find(f => f.code === activeCountry)?.label} categories...` : 'Search all categories...'}
                className="input input-bordered flex-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="text-sm text-base-content/50 shrink-0">{visibleCategories.length} shown</span>
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
                        disabled={!cat.loaded}
                        onChange={e => { e.stopPropagation(); toggleCategory(cat) }}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {countryInfo && (
                            <span
                              className="text-base cursor-pointer hover:scale-125 transition-transform"
                              title={`Filter: ${countryInfo.label}`}
                              onClick={e => { e.stopPropagation(); setActiveCountry(activeCountry === code ? null : code) }}
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
