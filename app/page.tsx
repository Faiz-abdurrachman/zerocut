import Link from "next/link"

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-sm mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        Live on Monad Testnet
      </div>

      <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
        Get paid for your work,{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          not the platform
        </span>
      </h1>

      <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
        Brief is a trustless freelance escrow on Monad.
      </p>
      <p className="text-lg text-gray-500 max-w-xl mx-auto mb-12">
        0% platform fee. AI settles disputes. Funds released in under a second.
      </p>

      <div className="flex flex-wrap gap-4 justify-center mb-20">
        <Link
          href="/create"
          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
        >
          Post a Job
        </Link>
        <Link
          href="/jobs"
          className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
        >
          Find Work
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-3xl mb-3">💸</div>
          <h3 className="text-white font-semibold text-lg mb-2">0% Platform Fee</h3>
          <p className="text-gray-400 text-sm">Every MON goes straight to the freelancer. No middleman, no cuts, no surprises.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="text-white font-semibold text-lg mb-2">Trustless Escrow</h3>
          <p className="text-gray-400 text-sm">Funds locked in a smart contract on Monad. Released only when work is approved.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-3xl mb-3">🧠</div>
          <h3 className="text-white font-semibold text-lg mb-2">AI Dispute Resolution</h3>
          <p className="text-gray-400 text-sm">Client goes silent? AI evaluates the work against the agreed brief. Verdict stored on-chain forever.</p>
        </div>
      </div>

      <div className="mt-20 border-t border-gray-800 pt-12">
        <p className="text-gray-600 text-sm">
          Built on <span className="text-purple-400">Monad</span> — 10,000 TPS · 0.8s finality · Gas under $0.01
        </p>
      </div>
    </div>
  )
}
