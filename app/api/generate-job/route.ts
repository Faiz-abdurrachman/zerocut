import { NextRequest, NextResponse } from 'next/server'
import { generateJobDescription } from '@/lib/ai'

// Fallback kalau Gemini quota habis — generate dari prompt secara lokal
function generateMockJob(prompt: string) {
  const title = prompt.trim().charAt(0).toUpperCase() + prompt.trim().slice(1)
  const lc = prompt.toLowerCase()
  const category = lc.includes('design') || lc.includes('logo') || lc.includes('ui') || lc.includes('figma')
    ? 'Design'
    : lc.includes('web') || lc.includes('app') || lc.includes('code') || lc.includes('develop')
    ? 'Development'
    : lc.includes('write') || lc.includes('blog') || lc.includes('content') || lc.includes('copy')
    ? 'Writing'
    : lc.includes('market') || lc.includes('social') || lc.includes('ads')
    ? 'Marketing'
    : 'Other'
  return {
    title,
    description: `${title}. The freelancer must deliver high-quality work that exactly matches this brief. Clear communication is expected throughout the project, with final files submitted in the agreed format.`,
    suggestedPriceEth: '0.01',
    category,
    skills: ['Communication', 'Attention to Detail'],
    deliverables: [
      'Final deliverable in required format',
      'Source files included',
      'Revision rounds as agreed',
    ],
    revisions: '2',
    _mock: true,
  }
}

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  }

  try {
    const job = await generateJobDescription(prompt)
    return NextResponse.json(job)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('404')

    if (isQuota) {
      // Fallback: generate lokal tanpa AI
      console.warn('Gemini quota exceeded — using local fallback')
      return NextResponse.json(generateMockJob(prompt))
    }

    console.error('generate-job error:', err)
    return NextResponse.json({ error: 'Failed to generate job' }, { status: 500 })
  }
}
