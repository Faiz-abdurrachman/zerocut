'use client'

import dynamic from 'next/dynamic'
import Navbar from './Navbar'
import type { ReactNode } from 'react'

const Providers = dynamic(() => import('@/providers'), { ssr: false })

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Navbar />
      <main className="flex-1">{children}</main>
    </Providers>
  )
}
