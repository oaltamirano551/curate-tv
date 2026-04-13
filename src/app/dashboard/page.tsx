import Link from "next/link";

const PLAYLIST_URL = "https://curate.tv/p/abc123xyz/playlist.m3u";

const SELECTED_CATEGORIES = [
  { label: "US | Sport", count: 48 },
  { label: "US | NFL", count: 22 },
  { label: "UK | Sport", count: 62 },
  { label: "UK | EPL Premier League", count: 10 },
  { label: "UK | Formula 1", count: 4 },
  { label: "US | UFC / MMA", count: 8 },
  { label: "US | Boxing / Matchroom", count: 6 },
];

const PLAYER_GUIDES = [
  { name: "TiviMate", icon: "📱", steps: "Settings → Playlists → Add Playlist → paste URL" },
  { name: "IPTV Smarters", icon: "📺", steps: "Add User → Xtream / M3U URL → paste URL" },
  { name: "VLC", icon: "🎬", steps: "Media → Open Network Stream → paste URL" },
];

export default function DashboardPage() {
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
                <span className="text-sm">O</span>
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box shadow-lg z-10 w-40 mt-2 border border-base-300">
              <li><a>Settings</a></li>
              <li><a className="text-error">Log out</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold">Your Playlist</h1>
          <p className="text-base-content/60 mt-1">Everything is set up. Copy your URL and paste it into any IPTV player.</p>
        </div>

        {/* Playlist URL card */}
        <div className="card bg-base-100 shadow-sm border border-primary/30">
          <div className="card-body gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔗</span>
              <h2 className="card-title text-lg">Your Playlist URL</h2>
              <div className="badge badge-success badge-sm ml-auto">Active</div>
            </div>
            <p className="text-xs text-base-content/50">Your credentials are hidden. This URL is safe to share.</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={PLAYLIST_URL}
                className="input input-bordered flex-1 font-mono text-sm"
              />
              <button className="btn btn-primary">Copy</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-outline btn-sm gap-2">
                <span>📥</span> Download .m3u
              </button>
              <button className="btn btn-outline btn-sm gap-2">
                <span>🔄</span> Regenerate URL
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat bg-base-100 rounded-2xl shadow-sm">
            <div className="stat-title text-xs">Channels</div>
            <div className="stat-value text-2xl text-primary">160</div>
            <div className="stat-desc">across 7 categories</div>
          </div>
          <div className="stat bg-base-100 rounded-2xl shadow-sm">
            <div className="stat-title text-xs">Last updated</div>
            <div className="stat-value text-2xl">Today</div>
            <div className="stat-desc">Apr 12, 2026</div>
          </div>
          <div className="stat bg-base-100 rounded-2xl shadow-sm">
            <div className="stat-title text-xs">Status</div>
            <div className="stat-value text-2xl text-success">Live</div>
            <div className="stat-desc">Playlist is active</div>
          </div>
        </div>

        {/* Selected categories */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-lg">Selected Categories</h2>
              <Link href="/channels" className="btn btn-ghost btn-sm">Edit →</Link>
            </div>
            <div className="space-y-2">
              {SELECTED_CATEGORIES.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between py-2 border-b border-base-200 last:border-0">
                  <span className="text-sm">{cat.label}</span>
                  <span className="badge badge-ghost badge-sm">{cat.count} ch</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How to use */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg">How to use your playlist</h2>
            <div className="space-y-4">
              {PLAYER_GUIDES.map((p) => (
                <div key={p.name} className="flex gap-4 items-start">
                  <div className="text-2xl">{p.icon}</div>
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-base-content/60 mt-0.5">{p.steps}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account plan */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold">Free plan</p>
              <p className="text-sm text-base-content/60">1 playlist · Manual refresh · Up to 200 channels</p>
            </div>
            <button className="btn btn-primary btn-sm">Upgrade to Pro</button>
          </div>
        </div>

      </main>
    </div>
  );
}
