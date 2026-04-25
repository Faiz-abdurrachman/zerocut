'use client'

import { useReadContract } from 'wagmi'
import { ABI, CONTRACT_ADDRESS } from '@/lib/contract'
import Link from 'next/link'
import { formatEther } from 'viem'

export default function JobsPage() {
  const { data: jobIds, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getJobsByStatus',
    args: [0], // OPEN = 0
    query: { refetchInterval: 5000 },
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Open Jobs</h1>
          <p className="text-gray-400 mt-1">Find work, get paid instantly on Monad.</p>
        </div>
        <Link
          href="/create"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          + Post Job
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-20 text-gray-500">Loading jobs...</div>
      )}

      {!isLoading && (!jobIds || (jobIds as bigint[]).length === 0) && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No open jobs yet.</p>
          <Link href="/create" className="text-purple-400 hover:text-purple-300">
            Be the first to post one →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {(jobIds as bigint[] | undefined)?.map(id => (
          <JobCard key={id.toString()} jobId={id} />
        ))}
      </div>
    </div>
  )
}

function JobCard({ jobId }: { jobId: bigint }) {
  const { data: job } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getJob',
    args: [jobId],
    query: { refetchInterval: 5000 },
  })

  if (!job) return null

  const j = job as { description: string; amount: bigint; client: string }
  const parts = j.description.split('\n\n')
  const title = parts.length > 1 ? parts[0] : j.description.slice(0, 60)
  const body = parts.length > 1 ? parts.slice(1).join('\n\n') : ''

  return (
    <Link href={`/job/${jobId.toString()}`}>
      <div className="bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg leading-snug group-hover:text-purple-300 transition-colors truncate">
              {title}
            </p>
            {body && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{body}</p>
            )}
            <p className="text-gray-600 text-sm mt-2 truncate">
              Client: {j.client.slice(0, 6)}...{j.client.slice(-4)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-green-400 font-bold text-xl">{formatEther(j.amount)} MON</p>
            <p className="text-xs text-gray-500 mt-1">locked in escrow</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">Job #{jobId.toString()}</span>
          <span className="text-sm text-purple-400 group-hover:text-purple-300">
            Accept job →
          </span>
        </div>
      </div>
    </Link>
  )
}
