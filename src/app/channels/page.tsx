import Link from "next/link";

const MOCK_CATEGORIES = [
  {
    id: "us-sport", label: "US | Sport", count: 48, selected: 12,
    channels: ["ESPN HD", "ESPN2 HD", "ESPN+ HD", "Fox Sports 1", "Fox Sports 2", "NBC Sports", "CBS Sports", "FS1 HD", "FS2 HD", "DAZN 1"],
  },
  {
    id: "us-nfl", label: "US | NFL", count: 22, selected: 22,
    channels: ["NFL Network", "NFL RedZone", "NFL Game Pass 1", "NFL Game Pass 2", "NFL Game Pass 3"],
  },
  {
    id: "us-nba", label: "US | NBA", count: 18, selected: 0,
    channels: ["NBA TV", "NBA League Pass 1", "NBA League Pass 2", "NBA League Pass 3"],
  },
  {
    id: "us-nhl", label: "US | NHL", count: 16, selected: 0,
    channels: ["NHL Network", "NHL Power Play 1", "NHL Power Play 2"],
  },
  {
    id: "us-mlb", label: "US | MLB", count: 14, selected: 0,
    channels: ["MLB Network", "MLB TV 1", "MLB TV 2"],
  },
  {
    id: "uk-sport", label: "UK | Sport", count: 62, selected: 62,
    channels: ["Sky Sports Main Event", "Sky Sports Premier League", "Sky Sports Football", "Sky Sports F1", "TNT Sports 1", "TNT Sports 2", "TNT Sports 3"],
  },
  {
    id: "uk-epl", label: "UK | EPL Premier League", count: 10, selected: 10,
    channels: ["EPL 1 HD", "EPL 2 HD", "EPL 3 HD", "EPL 4 HD"],
  },
  {
    id: "uk-f1", label: "UK | Formula 1", count: 4, selected: 4,
    channels: ["Sky Sports F1", "F1 TV Pro 1", "F1 TV Pro 2", "Apple TV F1"],
  },
  {
    id: "us-ufc", label: "US | UFC / MMA", count: 8, selected: 8,
    channels: ["UFC Fight Pass 1", "UFC Fight Pass 2", "ESPN UFC HD"],
  },
  {
    id: "us-boxing", label: "US | Boxing / Matchroom", count: 6, selected: 6,
    channels: ["DAZN Boxing 1", "DAZN Boxing 2", "Matchroom Boxing"],
  },
  {
    id: "tennis", label: "Tennis TV", count: 12, selected: 0,
    channels: ["Tennis Channel", "Tennis TV 1", "Tennis TV 2", "Wimbledon Live"],
  },
  {
    id: "us-golf", label: "US | Golf", count: 6, selected: 0,
    channels: ["Golf Channel", "PGA Tour Live 1", "PGA Tour Live 2", "The Masters"],
  },
];

export default function ChannelsPage() {
  const totalSelected = MOCK_CATEGORIES.reduce((a, c) => a + c.selected, 0);
  const totalChannels = MOCK_CATEGORIES.reduce((a, c) => a + c.count, 0);

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
          <div className="text-sm text-base-content/60">
            <span className="text-white font-semibold">{totalSelected}</span> / {totalChannels} channels selected
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Save Playlist →
          </Link>
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

      <div className="flex flex-1 gap-0">

        {/* Sidebar — category list */}
        <aside className="w-64 bg-base-100 border-r border-base-300 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto p-4 hidden md:block">
          <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">Categories</p>
          <ul className="menu menu-sm gap-1 p-0">
            {MOCK_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <a href={`#${cat.id}`} className="flex justify-between">
                  <span className="truncate text-sm">{cat.label}</span>
                  {cat.selected > 0 && (
                    <span className="badge badge-primary badge-xs">{cat.selected}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 space-y-6 max-w-3xl">

          {/* Search + filter bar */}
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search channels..."
              className="input input-bordered flex-1 min-w-48"
            />
            <select className="select select-bordered">
              <option>All categories</option>
              {MOCK_CATEGORIES.map((c) => (
                <option key={c.id}>{c.label}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm self-center text-sm">Select all</button>
            <button className="btn btn-ghost btn-sm self-center text-sm text-error">Clear all</button>
          </div>

          {/* Category sections */}
          {MOCK_CATEGORIES.map((cat) => (
            <div key={cat.id} id={cat.id} className="card bg-base-100 shadow-sm">
              <div className="card-body gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary"
                      defaultChecked={cat.selected === cat.count}
                    />
                    <div>
                      <h3 className="font-semibold">{cat.label}</h3>
                      <p className="text-xs text-base-content/50">{cat.count} channels</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cat.selected > 0 && (
                      <span className="badge badge-primary">{cat.selected} selected</span>
                    )}
                    <button className="btn btn-ghost btn-xs">Expand</button>
                  </div>
                </div>

                {/* Channel chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {cat.channels.map((ch) => (
                    <label key={ch} className="cursor-pointer">
                      <input type="checkbox" className="hidden peer" defaultChecked={cat.selected > 0} />
                      <span className="badge badge-outline peer-checked:badge-primary peer-checked:border-primary text-xs py-3 px-3 cursor-pointer hover:badge-primary transition-all">
                        {ch}
                      </span>
                    </label>
                  ))}
                  {cat.count > cat.channels.length && (
                    <span className="badge badge-ghost text-xs py-3 px-3">
                      +{cat.count - cat.channels.length} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

        </main>
      </div>

      {/* Sticky bottom bar on mobile */}
      <div className="btm-nav btm-nav-sm md:hidden bg-base-100 border-t border-base-300">
        <div className="flex items-center justify-between w-full px-6">
          <span className="text-sm text-base-content/60">{totalSelected} channels selected</span>
          <Link href="/dashboard" className="btn btn-primary btn-sm">Save Playlist →</Link>
        </div>
      </div>

    </div>
  );
}
