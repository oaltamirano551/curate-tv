'use client'

import Link from "next/link"
import { useState } from "react"
import { login } from "@/app/actions/auth"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-primary">Curate</span><span className="text-white">TV</span>
      </Link>

      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body gap-5">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-base-content/60 text-sm mt-1">Log in to manage your playlists.</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input name="email" type="email" placeholder="you@example.com" className="input input-bordered w-full" required />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
                <a href="#" className="label-text-alt link link-primary">Forgot password?</a>
              </label>
              <input name="password" type="password" placeholder="Your password" className="input input-bordered w-full" required />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Log In"}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">no account yet?</div>
          <Link href="/signup" className="btn btn-outline w-full">Create a free account</Link>
        </div>
      </div>
    </div>
  )
}
