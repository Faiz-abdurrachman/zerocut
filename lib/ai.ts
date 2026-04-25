import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export type GeneratedJob = {
  title: string
  description: string
  suggestedPriceEth: string
  deliverables: string[]
}

export type DisputeVerdict = {
  outcome: 'RELEASE' | 'REFUND' | 'SPLIT'
  freelancerPercent: number
  reasoning: string
}

export async function generateJobDescription(prompt: string): Promise<GeneratedJob> {
  const result = await model.generateContent(`
You are a freelance job posting assistant. Given a short idea, generate a structured job posting.

User idea: "${prompt}"

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "title": "short job title (max 60 chars)",
  "description": "clear job description (2-3 sentences, what is needed, what will be delivered)",
  "suggestedPriceEth": "suggested price in ETH as string (e.g. '0.01' for small tasks, '0.1' for bigger ones)",
  "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"]
}
`)

  const text = result.response.text().trim()
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function evaluateDispute(
  jobDescription: string,
  workUrl: string
): Promise<DisputeVerdict> {
  const result = await model.generateContent(`
You are a neutral AI arbitrator for a freelance job dispute. Evaluate whether the submitted work matches the job brief.

Job Description: "${jobDescription}"
Submitted Work URL: "${workUrl}"

Rules:
- RELEASE (freelancerPercent: 100): Work clearly matches the brief
- REFUND (freelancerPercent: 0): Work clearly does not match or is irrelevant
- SPLIT (freelancerPercent: 30-80): Work partially matches — set a fair percentage

Note: You cannot access the URL, evaluate based on the URL content/name and job description match.

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "outcome": "RELEASE" | "REFUND" | "SPLIT",
  "freelancerPercent": 0-100,
  "reasoning": "1-2 sentence explanation of the verdict"
}
`)

  const text = result.response.text().trim()
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}
