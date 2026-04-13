import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">

      {/* Logo */}
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-primary">Curate</span><span className="text-white">TV</span>
      </Link>

      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body gap-5">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-base-content/60 text-sm mt-1">Log in to manage your playlists.</p>
          </div>

          <form className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input type="email" placeholder="you@example.com" className="input input-bordered w-full" />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
                <a href="#" className="label-text-alt link link-primary">Forgot password?</a>
              </label>
              <input type="password" placeholder="Your password" className="input input-bordered w-full" />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                <span className="label-text text-sm">Remember me</span>
              </label>
            </div>

            <Link href="/dashboard" className="btn btn-primary w-full mt-1">
              Log In
            </Link>
          </form>

          <div className="divider text-xs text-base-content/40">no account yet?</div>

          <Link href="/signup" className="btn btn-outline w-full">
            Create a free account
          </Link>
        </div>
      </div>

    </div>
  );
}
