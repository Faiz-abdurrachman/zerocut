import { NextRequest, NextResponse } from 'next/server'
import { generateJobDescription } from '@/lib/ai'

// Fallback kalau Gemini quota habis — generate dari prompt secara lokal
function generateMockJob(prompt: string) {
  const words = prompt.trim()
  const title = words.charAt(0).toUpperCase() + words.slice(1)
  return {
    title: title,
    description: `${title}. The freelancer must deliver high-quality work that matches this brief exactly. Clear communication and revisions included. Final files must be submitted in the agreed format before the deadline.`,
    suggestedPriceEth: '0.01',
    deliverables: [
      'Final deliverable in required format',
      'Source files included',
      'Up to 2 revision rounds',
    ],
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
