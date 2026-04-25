'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Brief<span className="text-purple-400">.</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/jobs" className="text-gray-400 hover:text-white transition-colors text-sm">
            Browse Jobs
          </Link>
          <Link href="/create" className="text-gray-400 hover:text-white transition-colors text-sm">
            Post Job
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            Dashboard
          </Link>
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}
