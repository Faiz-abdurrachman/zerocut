const STATUS_LABEL = ['Open', 'In Progress', 'Submitted', 'Completed', 'Refunded', 'Disputed', 'Resolved']
const STATUS_CLASS = [
  'bg-green-500/10 text-green-400 border-green-500/20',
  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'bg-red-500/10 text-red-400 border-red-500/20',
  'bg-teal-500/10 text-teal-400 border-teal-500/20',
]

export default function JobStatusBadge({ status }: { status: number }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[status] ?? STATUS_CLASS[0]}`}>
      {STATUS_LABEL[status] ?? 'Unknown'}
    </span>
  )
}
