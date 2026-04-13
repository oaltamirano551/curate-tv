import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">

      {/* Logo */}
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-primary">Curate</span><span className="text-white">TV</span>
      </Link>

      {/* Steps */}
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
              Enter your Xtream Codes credentials. These are encrypted and never exposed to anyone.
            </p>
          </div>

          {/* Security callout */}
          <div className="alert bg-base-200 border border-base-300">
            <span className="text-lg">🔐</span>
            <div>
              <p className="text-sm font-medium">Your credentials are safe</p>
              <p className="text-xs text-base-content/60">We encrypt and store them securely. They never appear in your playlist URL.</p>
            </div>
          </div>

          <form className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Server URL</span>
              </label>
              <input
                type="url"
                placeholder="http://yourprovider.com"
                className="input input-bordered w-full"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">Include http:// or https://</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Username</span>
              </label>
              <input
                type="text"
                placeholder="Your Xtream username"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                type="password"
                placeholder="Your Xtream password"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Port <span className="text-base-content/40 font-normal">(optional)</span></span>
              </label>
              <input
                type="text"
                placeholder="80"
                className="input input-bordered w-full"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button type="button" className="btn btn-outline flex-1">
                Test Connection
              </button>
              <Link href="/channels" className="btn btn-primary flex-1">
                Connect & Continue →
              </Link>
            </div>
          </form>

        </div>
      </div>

      <p className="text-xs text-base-content/40 mt-6 text-center max-w-sm">
        Don&apos;t have Xtream credentials? You&apos;ll need an active IPTV subscription that uses Xtream Codes.
      </p>

    </div>
  );
}
