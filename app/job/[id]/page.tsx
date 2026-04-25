'use client'

import { use, useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { ABI, CONTRACT_ADDRESS, JobStatus, DisputeOutcome } from '@/lib/contract'
import JobStatusBadge from '@/components/JobStatusBadge'
import Link from 'next/link'

const OUTCOME_LABEL = ['Full release to freelancer ✅', 'Full refund to client 🔄', 'Split payment ⚡']

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { address, isConnected } = useAccount()

  const { data: job, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getJob',
    args: [BigInt(id)],
    query: { refetchInterval: 3000 },
  })

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const [workUrl, setWorkUrl] = useState('')
  const [resolving, setResolving] = useState(false)
  const [verdict, setVerdict] = useState<{ verdict: string; reasoning: string; freelancerPercent: number; txHash: string } | null>(null)
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { if (isSuccess) refetch() }, [isSuccess, refetch])

  if (!job) {
    return <div className="max-w-2xl mx-auto px-4 py-24 text-center text-gray-500">Loading job...</div>
  }

  const j = job as {
    client: `0x${string}`
    freelancer: `0x${string}`
    amount: bigint
    description: string
    workUrl: string
    status: number
    outcome: number
    freelancerPercent: number
    verdictHash: `0x${string}`
    fundedAt: bigint
    submittedAt: bigint
  }

  const isClient = !!address && j.client.toLowerCase() === address.toLowerCase()
  const hasFreelancer = j.freelancer !== '0x0000000000000000000000000000000000000000'
  const isFreelancer = !!address && hasFreelancer && j.freelancer.toLowerCase() === address.toLowerCase()
  const isOpen = j.status === JobStatus.OPEN

  const disputeDeadline = Number(j.submittedAt) + 30
  const canDispute = j.status === JobStatus.SUBMITTED && now >= disputeDeadline
  const timeLeft = Math.max(0, disputeDeadline - now)

  function write(fn: string, args: unknown[], value?: bigint) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: fn as never,
      args: args as never,
      gas: 500_000n,
      ...(value ? { value } : {}),
    })
  }

  async function handleResolveDispute() {
    setResolving(true)
    setVerdict(null)
    try {
      const res = await fetch('/api/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVerdict(data)
      refetch()
    } catch (err) {
      alert('Failed to resolve: ' + (err instanceof Error ? err.message : 'unknown error'))
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/jobs" className="text-gray-500 hover:text-gray-300 text-sm">← Jobs</Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 text-sm">Job #{id}</span>
      </div>

      {/* Job Info Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <JobStatusBadge status={j.status} />
          <p className="text-green-400 font-bold text-2xl">{formatEther(j.amount)} MON</p>
        </div>

        <p className="text-white text-lg leading-relaxed mb-5">{j.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Client</span>
            <span className="text-gray-300 font-mono text-xs">
              {j.client.slice(0, 8)}...{j.client.slice(-6)}
              {isClient && <span className="ml-2 text-purple-400 font-sans">(you)</span>}
            </span>
          </div>

          {hasFreelancer && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Freelancer</span>
              <span className="text-gray-300 font-mono text-xs">
                {j.freelancer.slice(0, 8)}...{j.freelancer.slice(-6)}
                {isFreelancer && <span className="ml-2 text-purple-400 font-sans">(you)</span>}
              </span>
            </div>
          )}

          {j.workUrl && (
            <div className="flex items-start justify-between gap-4 pt-1">
              <span className="text-gray-500 shrink-0">Work URL</span>
              <a href={j.workUrl} target="_blank" rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-xs break-all text-right">
                {j.workUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ─── ACTION AREA ─── */}

      {/* Not connected */}
      {!isConnected && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-6 text-center">
          <p className="text-gray-400">Connect your wallet to interact with this job.</p>
        </div>
      )}

      {/* OPEN + client viewing own job */}
      {isConnected && isOpen && isClient && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">⏳</p>
          <p className="text-white font-semibold">Waiting for a freelancer</p>
          <p className="text-gray-400 text-sm mt-2">
            Your job is live. Share the link so a freelancer can accept it.
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!') }}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
          >
            Copy Job Link
          </button>
        </div>
      )}

      {/* OPEN + freelancer can accept */}
      {isConnected && isOpen && !isClient && (
        <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-2">Accept this job</h3>
          <p className="text-gray-400 text-sm mb-4">
            You'll be assigned as the freelancer. Complete the work and submit the delivery URL.
          </p>
          <button
            onClick={() => write('acceptJob', [BigInt(id)])}
            disabled={isPending || isConfirming}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {isPending ? '⏳ Cek MetaMask...' : isConfirming ? 'Processing...' : 'Accept Job'}
          </button>
          {writeError && <p className="text-red-400 text-xs mt-2">{writeError.message.slice(0, 100)}</p>}
        </div>
      )}

      {/* IN_PROGRESS + freelancer submits */}
      {isConnected && isFreelancer && j.status === JobStatus.IN_PROGRESS && (
        <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-2">Submit your work</h3>
          <p className="text-gray-400 text-sm mb-4">
            Upload to Figma, Drive, Notion, or anywhere — paste the link below.
          </p>
          <input
            type="url"
            value={workUrl}
            onChange={e => setWorkUrl(e.target.value)}
            placeholder="https://figma.com/file/..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-3"
          />
          <button
            onClick={() => write('submitWork', [BigInt(id), workUrl])}
            disabled={isPending || isConfirming || !workUrl.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {isPending ? '⏳ Cek MetaMask...' : isConfirming ? 'Submitting...' : 'Submit Work'}
          </button>
          {writeError && <p className="text-red-400 text-xs mt-2">{writeError.message.slice(0, 100)}</p>}
        </div>
      )}

      {/* IN_PROGRESS + client waiting */}
      {isConnected && isClient && j.status === JobStatus.IN_PROGRESS && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="text-white font-semibold">Freelancer is working on it</p>
          <p className="text-gray-400 text-sm mt-2">You'll be able to review once they submit.</p>
        </div>
      )}

      {/* SUBMITTED + client approves */}
      {isConnected && isClient && j.status === JobStatus.SUBMITTED && (
        <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-2">Review submitted work</h3>
          <p className="text-gray-400 text-sm mb-4">
            Check the work URL above. If it meets the brief, approve to release funds instantly.
          </p>
          <button
            onClick={() => write('approveWork', [BigInt(id)])}
            disabled={isPending || isConfirming}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {isPending ? '⏳ Cek MetaMask...' : isConfirming ? 'Releasing funds...' : `✅ Approve & Release ${formatEther(j.amount)} MON`}
          </button>
          {writeError && <p className="text-red-400 text-xs mt-2">{writeError.message.slice(0, 100)}</p>}
        </div>
      )}

      {/* SUBMITTED + freelancer waiting / can dispute */}
      {isConnected && isFreelancer && j.status === JobStatus.SUBMITTED && (
        <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-6 mt-4">
          <h3 className="text-white font-semibold mb-2">Waiting for client approval</h3>
          {canDispute ? (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Client hasn't responded. You can now request an AI review.
              </p>
              <button
                onClick={() => write('triggerDispute', [BigInt(id)])}
                disabled={isPending || isConfirming}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {isPending ? '⏳ Cek MetaMask...' : isConfirming ? 'Processing...' : '⚡ Trigger Dispute'}
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              You can trigger a dispute in{' '}
              <span className="text-yellow-400 font-mono font-bold">{timeLeft}s</span>
              {' '}if client doesn't approve.
            </p>
          )}
          {writeError && <p className="text-red-400 text-xs mt-2">{writeError.message.slice(0, 100)}</p>}
        </div>
      )}

      {/* DISPUTED */}
      {j.status === JobStatus.DISPUTED && (
        <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚖️</span>
            <h3 className="text-white font-semibold">Dispute in progress</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            AI will evaluate whether the submitted work matches the job brief. Verdict is permanent and stored on-chain.
          </p>
          {!verdict && (
            <button
              onClick={handleResolveDispute}
              disabled={resolving}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {resolving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block">⏳</span> AI is evaluating...
                </span>
              ) : '🧠 Request AI Verdict'}
            </button>
          )}
          {verdict && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 space-y-3">
              <p className={`text-lg font-bold ${verdict.verdict === 'RELEASE' ? 'text-green-400' : verdict.verdict === 'REFUND' ? 'text-red-400' : 'text-yellow-400'}`}>
                {verdict.verdict === 'RELEASE' ? '✅ RELEASE' : verdict.verdict === 'REFUND' ? '❌ REFUND' : `⚡ SPLIT ${verdict.freelancerPercent}%`}
              </p>
              <p className="text-gray-300 text-sm">{verdict.reasoning}</p>
              <a href={`https://testnet.monadscan.com/tx/${verdict.txHash}`} target="_blank" rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-xs block">
                View on MonadScan →
              </a>
            </div>
          )}
        </div>
      )}

      {/* RESOLVED */}
      {j.status === JobStatus.RESOLVED && (
        <div className="bg-gray-900 border border-teal-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">✅ Dispute Resolved</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Outcome</span>
              <span className="text-white font-medium">{OUTCOME_LABEL[j.outcome]}</span>
            </div>
            {j.outcome === DisputeOutcome.SPLIT && (
              <div className="flex justify-between">
                <span className="text-gray-400">Freelancer share</span>
                <span className="text-white font-medium">{j.freelancerPercent}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Verdict proof</span>
              <span className="text-gray-300 font-mono text-xs">{j.verdictHash.slice(0, 18)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED */}
      {j.status === JobStatus.COMPLETED && (
        <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-6 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-white font-semibold text-lg">Job Completed!</p>
          <p className="text-gray-400 text-sm mt-1">Funds released to freelancer.</p>
        </div>
      )}
    </div>
  )
}
