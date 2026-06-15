import { type Standing } from '@/types'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface RankingTableProps {
  standings: Standing[]
  currentUserId?: string
  limit?: number
  rankChanges?: Record<string, number>
}

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const RANK_ICONS = ['🥇', '🥈', '🥉']

function RankBadge({ change }: { change: number | undefined }) {
  if (change === undefined) return null
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-green-400 text-xs font-medium">
      <TrendingUp size={12} />
      {change}
    </span>
  )
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-400 text-xs font-medium">
      <TrendingDown size={12} />
      {Math.abs(change)}
    </span>
  )
  return <Minus size={12} className="text-gray-600" />
}

export function RankingTable({ standings, currentUserId, limit, rankChanges }: RankingTableProps) {
  const rows = limit ? standings.slice(0, limit) : standings

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhum participante ainda.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-left">
            <th className="pb-3 pr-4 font-medium w-12">#</th>
            <th className="pb-3 pr-4 font-medium">Nome</th>
            <th className="pb-3 pr-4 font-medium text-center">Pts</th>
            <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">Exatos</th>
            <th className="pb-3 font-medium text-center hidden sm:table-cell">Acertos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {rows.map((s) => {
            const isMe = s.id === currentUserId
            const rankIndex = Number(s.rank) - 1
            const rankIcon = RANK_ICONS[rankIndex]
            const rankColor = RANK_COLORS[rankIndex]

            return (
              <tr
                key={s.id}
                className={`transition-colors ${
                  isMe
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'hover:bg-gray-900/50'
                }`}
              >
                <td className="py-3 pr-4">
                  {rankIndex >= 0 && rankIndex < 3 ? (
                    <span className={`text-base ${rankColor}`}>{rankIcon}</span>
                  ) : (
                    <span className="text-gray-500 font-medium">{s.rank}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isMe ? 'text-orange-400' : 'text-white'}`}>
                      {s.name}
                      {isMe && <span className="ml-1 text-xs text-orange-500">(você)</span>}
                    </span>
                    {rankChanges && <RankBadge change={rankChanges[s.id]} />}
                  </div>
                </td>
                <td className="py-3 pr-4 text-center">
                  <span className={`font-bold text-base ${rankIndex === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {s.total_pts}
                  </span>
                </td>
                <td className="py-3 pr-4 text-center hidden sm:table-cell">
                  <span className="text-green-400 font-medium">{s.exact_scores}</span>
                </td>
                <td className="py-3 text-center hidden sm:table-cell">
                  <span className="text-blue-400 font-medium">{s.correct_results}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
