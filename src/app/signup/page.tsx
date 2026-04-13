'use client'

import Link from "next/link"
import { useState } from "react"
import { signUp } from "@/app/actions/auth"

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirmPassword') as string

    if (password !== confirm) {
      setError("Passwords don't match.")
      setLoading(false)
      return
    }

    const result = await signUp(formData)
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
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-base-content/60 text-sm mt-1">Start building your playlist in minutes.</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-medium">First name</span>
                </label>
                <input name="firstName" type="text" placeholder="John" className="input input-bordered w-full" required />
              </div>
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-medium">Last name</span>
                </label>
                <input name="lastName" type="text" placeholder="Doe" className="input input-bordered w-full" required />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input name="email" type="email" placeholder="you@example.com" className="input input-bordered w-full" required />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <input name="password" type="password" placeholder="Min. 6 characters" className="input input-bordered w-full" required minLength={6} />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Confirm password</span>
              </label>
              <input name="confirmPassword" type="password" placeholder="Repeat your password" className="input input-bordered w-full" required />
            </div>

            <div className="form-control mt-1">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" required />
                <span className="label-text text-sm text-base-content/70">
                  I agree to the <a href="#" className="link link-primary">Terms of Service</a> and <a href="#" className="link link-primary">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Create Account"}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">already have an account?</div>
          <Link href="/login" className="btn btn-outline w-full">Log in instead</Link>
        </div>
      </div>
    </div>
  )
}
