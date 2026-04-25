'use client'

import { useAccount, useReadContract } from 'wagmi'
import { ABI, CONTRACT_ADDRESS, JobStatus } from '@/lib/contract'
import { formatEther } from 'viem'
import JobStatusBadge from '@/components/JobStatusBadge'
import Link from 'next/link'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 text-lg">Connect your wallet to see your jobs.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">
        All jobs for{' '}
        <span className="font-mono text-purple-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      </p>
      <AllJobIds address={address!} />
    </div>
  )
}

function AllJobIds({ address }: { address: string }) {
  const { data: jobCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'jobCount',
    query: { refetchInterval: 5000 },
  })

  if (!jobCount && jobCount !== 0n) {
    return <p className="text-gray-500">Loading...</p>
  }

  const total = Number(jobCount)
  if (total === 0) {
    return <p className="text-gray-500 text-sm">No jobs on-chain yet.</p>
  }

  const ids = Array.from({ length: total }, (_, i) => BigInt(i))

  return (
    <div className="space-y-3">
      {ids.map(id => (
        <DashboardJobCard key={id.toString()} jobId={id} address={address} />
      ))}
    </div>
  )
}

function DashboardJobCard({ jobId, address }: { jobId: bigint; address: string }) {
  const { data: job } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getJob',
    args: [jobId],
    query: { refetchInterval: 5000 },
  })

  if (!job) return null

  const j = job as {
    client: string
    freelancer: string
    amount: bigint
    description: string
    status: number
  }

  const isClient = j.client.toLowerCase() === address.toLowerCase()
  const isFreelancer =
    j.freelancer !== '0x0000000000000000000000000000000000000000' &&
    j.freelancer.toLowerCase() === address.toLowerCase()

  if (!isClient && !isFreelancer) return null

  const role = isClient ? 'Client' : 'Freelancer'

  const isActionNeeded =
    (isClient && j.status === JobStatus.SUBMITTED) ||
    (isFreelancer && (j.status === JobStatus.IN_PROGRESS || j.status === JobStatus.DISPUTED))

  return (
    <Link href={`/job/${jobId.toString()}`}>
      <div
        className={`bg-gray-900 border rounded-xl p-4 hover:border-purple-500/50 transition-colors cursor-pointer ${
          isActionNeeded ? 'border-yellow-500/40' : 'border-gray-800'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <JobStatusBadge status={j.status} />
              <span className="text-xs text-gray-500">{role}</span>
              {isActionNeeded && (
                <span className="text-xs text-yellow-400 font-medium">Action needed</span>
              )}
            </div>
            <p className="text-white text-sm truncate">{j.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-green-400 font-semibold">{formatEther(j.amount)} MON</p>
            <p className="text-gray-500 text-xs">Job #{jobId.toString()}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
