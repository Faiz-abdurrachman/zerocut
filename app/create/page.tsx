'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { ABI, CONTRACT_ADDRESS } from '@/lib/contract'
import { serializeJob } from '@/lib/parseJob'

const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Other']
const REVISION_OPTIONS = ['1', '2', '3', 'Unlimited']

export default function CreatePage() {
  const router = useRouter()
  const { isConnected } = useAccount()

  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [deliverables, setDeliverables] = useState<string[]>([''])
  const [deadline, setDeadline] = useState('')
  const [revisions, setRevisions] = useState('2')
  const [amount, setAmount] = useState('0.01')

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess && txHash) router.push('/jobs')
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
      if (data.title) setTitle(data.title)
      if (data.description) setDescription(data.description)
      if (data.suggestedPriceEth) setAmount(data.suggestedPriceEth)
      if (data.category) setCategory(data.category)
      if (data.skills?.length) setSkills(data.skills)
      if (data.deliverables?.length) setDeliverables(data.deliverables)
      if (data.revisions) setRevisions(data.revisions)
    } catch {
      alert('Failed to generate. Please fill in manually.')
    } finally {
      setGenerating(false)
    }
  }

  function handleSkillKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault()
      const s = skillInput.trim().replace(/,$/, '')
      if (s && !skills.includes(s)) setSkills([...skills, s])
      setSkillInput('')
    }
  }

  function setDeliverable(i: number, val: string) {
    const next = [...deliverables]
    next[i] = val
    setDeliverables(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !amount) return
    const fullDescription = serializeJob({
      title: title.trim(),
      body: description.trim(),
      category,
      skills,
      deadline,
      revisions,
      deliverables: deliverables.filter(d => d.trim()),
    })
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
      <p className="text-gray-400 mb-8">Lock funds in escrow. AI settles disputes. 0% fee.</p>

      {/* AI Quick Fill */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 mb-8">
        <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">✨ AI Quick Fill</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. design logo for modern cafe"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2">Fills all fields below automatically. You can edit after.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Section 1: Project Details */}
        <section className="space-y-4">
          <h2 className="text-white font-semibold text-lg border-b border-gray-800 pb-2">Project Details</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Logo Design for Modern Cafe"
              required
              maxLength={80}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(category === cat ? '' : cat)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what you need — scope, style, format, and what 'done' looks like..."
              rows={5}
              required
              maxLength={1000}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">{description.length}/1000</p>
          </div>
        </section>

        {/* Section 2: Requirements */}
        <section className="space-y-4">
          <h2 className="text-white font-semibold text-lg border-b border-gray-800 pb-2">Requirements</h2>

          {/* Skills */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Skills Required</label>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-purple-500 transition-colors min-h-[52px]">
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-md">
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter(x => x !== s))}
                      className="hover:text-white ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKey}
                placeholder={skills.length ? 'Add more...' : 'e.g. Figma, React, Copywriting — press Enter to add'}
                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Deliverables</label>
            <div className="space-y-2">
              {deliverables.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-green-400 text-sm shrink-0">✓</span>
                  <input
                    type="text"
                    value={d}
                    onChange={e => setDeliverable(i, e.target.value)}
                    placeholder={`Deliverable ${i + 1}`}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                  {deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeliverables(deliverables.filter((_, idx) => idx !== i))}
                      className="text-gray-600 hover:text-red-400 text-xl leading-none w-6 text-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDeliverables([...deliverables, ''])}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                + Add deliverable
              </button>
            </div>
          </div>

          {/* Revisions */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Revision Rounds Included</label>
            <div className="flex gap-2">
              {REVISION_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRevisions(r)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    revisions === r
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Terms */}
        <section className="space-y-4">
          <h2 className="text-white font-semibold text-lg border-b border-gray-800 pb-2">Terms</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
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
              <p className="text-xs text-gray-600 mt-1">Locked in escrow until approved</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </section>

        {/* What happens next */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-2">What happens next</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Your {amount} MON is locked in the smart contract</li>
            <li>A freelancer accepts and does the work</li>
            <li>You review and approve → funds released instantly</li>
            <li>If you go silent, freelancer can request AI review after 30s</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !title.trim() || !description.trim()}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          {isPending
            ? '⏳ Confirm in MetaMask...'
            : isConfirming
            ? '⛓ Locking funds on Monad...'
            : `Post Job & Lock ${amount} MON`}
        </button>

        {writeError && (
          <p className="text-red-400 text-sm text-center">
            Error: {writeError.message.slice(0, 120)}
          </p>
        )}
      </form>
    </div>
  )
}
