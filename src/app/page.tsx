import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      <nav className="navbar bg-base-100 border-b border-base-300 px-6">
        <div className="flex-1">
          <span className="text-2xl font-bold text-primary">Curate<span className="text-white">TV</span></span>
        </div>
        <div className="flex-none gap-3">
          <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="badge badge-primary badge-outline mb-2">Free to start — no credit card required</div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Your IPTV. <span className="text-primary">Your channels.</span> Your way.
        </h1>
        <p className="text-lg text-base-content/70 max-w-xl">
          Bring your own IPTV credentials. CurateTV lets you pick exactly the channels you want,
          organize them your way, and gives you a single clean URL to use in any IPTV player.
        </p>
        <div className="flex gap-4 flex-wrap justify-center mt-2">
          <Link href="/signup" className="btn btn-primary btn-lg">Build My Playlist</Link>
          <Link href="#how-it-works" className="btn btn-outline btn-lg">See How It Works</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-base-200 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center px-6">
          <div>
            <div className="text-4xl font-bold text-primary">5,000+</div>
            <div className="text-sm text-base-content/60 mt-1">Channels supported</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">Any player</div>
            <div className="text-sm text-base-content/60 mt-1">TiviMate, VLC, Smarters</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">100%</div>
            <div className="text-sm text-base-content/60 mt-1">Credentials hidden</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body items-center text-center gap-3">
                <div className="text-4xl">🔐</div>
                <h3 className="card-title text-lg">1. Connect</h3>
                <p className="text-base-content/70 text-sm">Enter your Xtream IPTV credentials. They&apos;re encrypted and never visible to anyone.</p>
              </div>
            </div>
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body items-center text-center gap-3">
                <div className="text-4xl">📺</div>
                <h3 className="card-title text-lg">2. Curate</h3>
                <p className="text-base-content/70 text-sm">Browse your channels by category. Pick exactly what you want, skip what you don&apos;t.</p>
              </div>
            </div>
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body items-center text-center gap-3">
                <div className="text-4xl">🔗</div>
                <h3 className="card-title text-lg">3. Share</h3>
                <p className="text-base-content/70 text-sm">Get a clean hosted URL. Paste it into any IPTV player and you&apos;re live.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-base-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">Why CurateTV</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🛡️", title: "Credentials stay private", desc: "Your IPTV username and password are encrypted. They never appear in your playlist URL." },
              { icon: "⚡", title: "Works with any Xtream service", desc: "If you have Xtream Codes credentials, you're ready. No special setup required." },
              { icon: "🎯", title: "Pick exactly what you want", desc: "Sports only? News only? Filter by category and build a lean, fast playlist." },
              { icon: "📋", title: "One URL for everything", desc: "One link works in TiviMate, VLC, IPTV Smarters, Kodi — any player that accepts M3U." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 items-start">
                <div className="text-3xl">{f.icon}</div>
                <div>
                  <h3 className="font-semibold text-base">{f.title}</h3>
                  <p className="text-sm text-base-content/70 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to build your playlist?</h2>
        <p className="text-base-content/70 mb-8">Free to start. Takes less than 2 minutes.</p>
        <Link href="/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
      </section>

      {/* Footer */}
      <footer className="footer footer-center bg-base-200 text-base-content/50 py-6 text-sm">
        <p>© 2026 CurateTV. All rights reserved.</p>
      </footer>

    </div>
  );
}
