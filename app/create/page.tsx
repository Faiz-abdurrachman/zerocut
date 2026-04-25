'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { ABI, CONTRACT_ADDRESS } from '@/lib/contract'

export default function CreatePage() {
  const router = useRouter()
  const { isConnected } = useAccount()

  const [prompt, setPrompt] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('0.01')
  const [generating, setGenerating] = useState(false)
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [deliverables, setDeliverables] = useState<string[]>([])

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // Redirect after tx confirmed — harus di useEffect, bukan langsung di render
  useEffect(() => {
    if (isSuccess && txHash) {
      router.push('/jobs')
    }
  }, [isSuccess, txHash, router])

  async function handleGenerate() {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setGeneratedTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setAmount(data.suggestedPriceEth ?? '0.01')
      setDeliverables(data.deliverables ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('429') || msg.includes('quota')) {
        alert('Gemini API quota exceeded. Get a new key at aistudio.google.com/apikey.')
      } else {
        alert('Failed to generate: ' + msg)
      }
    } finally {
      setGenerating(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount) return
    const fullDescription = generatedTitle
      ? `${generatedTitle}\n\n${description}`
      : description
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'createJob',
      args: [fullDescription],
      value: parseEther(amount),
      gas: 500_000n,
    })
  }

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 text-lg">Connect your wallet to post a job.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Post a Job</h1>
      <p className="text-gray-400 mb-8">Describe your project, lock funds in escrow, hire a freelancer.</p>

      {/* AI Generator */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Describe your idea in one line
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. design logo for modern cafe"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
          >
            {generating ? 'Generating...' : '✨ AI Generate'}
          </button>
        </div>
      </div>

      {/* Job Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {generatedTitle && (
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-4">
            <p className="text-xs text-purple-400 mb-1 font-medium">AI Generated Title</p>
            <p className="text-white font-semibold">{generatedTitle}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Job Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe exactly what you need, what format, and what counts as done..."
            rows={5}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/1000 chars</p>
        </div>

        {deliverables.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium mb-2">Expected Deliverables</p>
            <ul className="space-y-1">
              {deliverables.map((d, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="text-green-400">✓</span> {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Budget (MON) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">Funds will be locked in smart contract until work is approved.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-1">What happens next:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Your {amount} MON is locked in the smart contract</li>
            <li>A freelancer accepts and does the work</li>
            <li>You review and approve → funds released instantly</li>
            <li>If you go silent, freelancer can request AI review after 30s</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !description.trim()}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          {isPending ? '⏳ Confirm in MetaMask...' : isConfirming ? '⛓ Locking funds on Monad...' : `Post Job & Lock ${amount} MON`}
        </button>

        {writeError && (
          <p className="text-red-400 text-sm text-center mt-2">
            Error: {writeError.message.slice(0, 120)}
          </p>
        )}
      </form>
    </div>
  )
}
