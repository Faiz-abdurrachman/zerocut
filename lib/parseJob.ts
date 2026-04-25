export type ParsedJob = {
  title: string
  body: string
  category: string
  skills: string[]
  deadline: string
  revisions: string
  deliverables: string[]
}

export function serializeJob(job: ParsedJob): string {
  const lines: string[] = [job.title, '', job.body, '']
  if (job.category) lines.push(`Category: ${job.category}`)
  if (job.skills.length) lines.push(`Skills: ${job.skills.join(', ')}`)
  if (job.deadline) lines.push(`Deadline: ${job.deadline}`)
  if (job.revisions) lines.push(`Revisions: ${job.revisions}`)
  if (job.deliverables.length) {
    lines.push('Deliverables:')
    job.deliverables.forEach(d => lines.push(`• ${d}`))
  }
  return lines.join('\n').trimEnd()
}

export function parseJob(raw: string): ParsedJob {
  const result: ParsedJob = { title: '', body: '', category: '', skills: [], deadline: '', revisions: '', deliverables: [] }
  const lines = raw.split('\n')
  let phase: 'title' | 'body' | 'meta' = 'title'
  const bodyLines: string[] = []
  let inDeliverables = false

  for (const line of lines) {
    if (phase === 'title') { result.title = line; phase = 'body'; continue }

    if (line.startsWith('Category: '))        { phase = 'meta'; inDeliverables = false; result.category = line.slice(10) }
    else if (line.startsWith('Skills: '))     { phase = 'meta'; inDeliverables = false; result.skills = line.slice(8).split(', ').filter(Boolean) }
    else if (line.startsWith('Deadline: '))   { phase = 'meta'; inDeliverables = false; result.deadline = line.slice(10) }
    else if (line.startsWith('Revisions: '))  { phase = 'meta'; inDeliverables = false; result.revisions = line.slice(11) }
    else if (line === 'Deliverables:')        { phase = 'meta'; inDeliverables = true }
    else if (inDeliverables && line.startsWith('• ')) { result.deliverables.push(line.slice(2)) }
    else if (phase === 'body')                { bodyLines.push(line) }
  }

  result.body = bodyLines.join('\n').trim()
  return result
}
