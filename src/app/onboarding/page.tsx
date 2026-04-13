'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'syncing' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ serverUrl: '', port: '', username: '', password: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('saving')

    // Save + test credentials
    const res = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      setStatus('error')
      return
    }

    // Sync channels from provider
    setStatus('syncing')
    const syncRes = await fetch('/api/channels', { method: 'POST' })
    if (!syncRes.ok) {
      setError('Connected but failed to sync channels. Try again.')
      setStatus('error')
      return
    }

    router.push('/channels')
  }

  const isLoading = status === 'saving' || status === 'syncing'
  const statusLabel = status === 'syncing' ? 'Syncing your channels...' : 'Connecting...'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-primary">Curate</span><span className="text-white">TV</span>
      </Link>

      <div className="w-full max-w-md mb-6">
        <ul className="steps steps-horizontal w-full">
          <li className="step step-primary text-xs">Connect</li>
          <li className="step text-xs">Pick Channels</li>
          <li className="step text-xs">Get Your URL</li>
        </ul>
      </div>

      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body gap-5">
          <div>
            <h1 className="text-2xl font-bold">Connect your IPTV service</h1>
            <p className="text-base-content/60 text-sm mt-1">
              Enter your Xtream Codes credentials. Encrypted and never shared.
            </p>
          </div>

          <div className="alert bg-base-200 border border-base-300">
            <span className="text-lg">🔐</span>
            <div>
              <p className="text-sm font-medium">Your credentials are safe</p>
              <p className="text-xs text-base-content/60">Encrypted before storage. Never visible in your playlist URL.</p>
            </div>
          </div>

          {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Server URL</span></label>
              <input name="serverUrl" type="text" placeholder="http://yourprovider.com" className="input input-bordered w-full" value={form.serverUrl} onChange={handleChange} required />
              <label className="label"><span className="label-text-alt text-base-content/50">Include http:// or https://</span></label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Port <span className="text-base-content/40 font-normal">(optional)</span></span>
              </label>
              <input name="port" type="text" placeholder="80" className="input input-bordered w-full" value={form.port} onChange={handleChange} />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Username</span></label>
              <input name="username" type="text" placeholder="Your Xtream username" className="input input-bordered w-full" value={form.username} onChange={handleChange} required />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Password</span></label>
              <input name="password" type="password" placeholder="Your Xtream password" className="input input-bordered w-full" value={form.password} onChange={handleChange} required />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={isLoading}>
              {isLoading
                ? <><span className="loading loading-spinner loading-sm" /> {statusLabel}</>
                : 'Connect & Sync Channels →'
              }
            </button>
          </form>
        </div>
      </div>

      <p className="text-xs text-base-content/40 mt-6 text-center max-w-sm">
        You&apos;ll need an active IPTV subscription that uses Xtream Codes.
      </p>
    </div>
  )
}
