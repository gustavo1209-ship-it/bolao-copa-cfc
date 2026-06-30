import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Navbar } from '@/components/navbar'
import { StageBadge } from '@/components/stage-badge'
import { FlagImage } from '@/components/flag-image'
import { type Match, type Stage, STAGE_ORDER } from '@/types'

export const dynamic = 'force-dynamic'

interface PredCell {
  home: number
  away: number
  pts_total: number
  pts_exact_bonus: number
  pts_result: number
  pts_penalty_winner: number
  penalty_winner_prediction: string | null
}

export default async function CompararPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const serviceClient = createServiceClient()

  // Busca predictions com paginação — Supabase tem hard limit de 1000 rows por página
  async function fetchAllPredictions() {
    const PAGE = 1000
    const results: { user_id: string; match_id: string; home_score_prediction: number; away_score_prediction: number; pts_total: number; pts_exact_bonus: number; pts_result: number; pts_penalty_winner: number; penalty_winner_prediction: string | null }[] = []
    let page = 0
    while (true) {
      const { data } = await serviceClient
        .from('predictions')
        .select('user_id, match_id, home_score_prediction, away_score_prediction, pts_total, pts_exact_bonus, pts_result, pts_penalty_winner, penalty_winner_prediction')
        .range(page * PAGE, (page + 1) * PAGE - 1)
      if (!data || data.length === 0) break
      results.push(...data)
      if (data.length < PAGE) break
      page++
    }
    return results
  }

  const [
    { data: matches },
    { data: profiles },
    allPredictions,
  ] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('profiles').select('id, name').order('name', { ascending: true }),
    fetchAllPredictions(),
  ])

  // predMap[match_id][user_id] = PredCell
  const predMap: Record<string, Record<string, PredCell>> = {}
  for (const p of allPredictions ?? []) {
    if (!predMap[p.match_id]) predMap[p.match_id] = {}
    predMap[p.match_id][p.user_id] = {
      home: p.home_score_prediction,
      away: p.away_score_prediction,
      pts_total: p.pts_total,
      pts_exact_bonus: p.pts_exact_bonus,
      pts_result: p.pts_result,
      pts_penalty_winner: p.pts_penalty_winner,
      penalty_winner_prediction: p.penalty_winner_prediction,
    }
  }

  // Agrupar partidas por fase
  const grouped: Partial<Record<Stage, Match[]>> = {}
  for (const m of matches ?? []) {
    const stage = m.stage as Stage
    if (!grouped[stage]) grouped[stage] = []
    grouped[stage]!.push(m as Match)
  }

  const players = profiles ?? []

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      <div className="max-w-full px-4 py-10">
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-2xl font-bold">Comparar Palpites</h1>
          <p className="text-gray-400 text-sm mt-1">
            Veja o que cada jogador apostou em cada partida
          </p>
        </div>

        {STAGE_ORDER.map(stage => {
          const stageMatches = grouped[stage]
          if (!stageMatches?.length) return null

          // Sub-grupos para a fase de grupos
          const subGroups = stage === 'group'
            ? ([...new Set(stageMatches.map(m => m.group_name))].filter(Boolean).sort() as string[])
            : [null]

          return (
            <div key={stage} className="mb-12 max-w-full">
              <div className="max-w-6xl mx-auto mb-3">
                <StageBadge stage={stage} showMultiplier />
              </div>

              {subGroups.map(groupName => {
                const groupMatches = groupName
                  ? stageMatches.filter(m => m.group_name === groupName)
                  : stageMatches

                return (
                  <div key={groupName ?? 'all'} className="mb-6">
                    {groupName && (
                      <div className="max-w-6xl mx-auto text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                        Grupo {groupName}
                      </div>
                    )}

                    {/* Tabela com scroll horizontal */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-max">
                        <thead>
                          <tr className="border-b border-gray-800">
                            {/* Coluna do jogo — sticky */}
                            <th className="sticky left-0 z-10 bg-gray-950 text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] sm:min-w-[260px]">
                              Jogo
                            </th>
                            {players.map(p => (
                              <th
                                key={p.id}
                                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-center w-20 ${
                                  p.id === user.id ? 'text-orange-400' : 'text-gray-500'
                                }`}
                              >
                                <span className="block truncate max-w-[72px]" title={p.name}>
                                  {p.name.split(' ')[0]}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {groupMatches.map(m => {
                            const finished = m.status === 'finished'
                            const inProgress = m.status === 'in_progress'

                            return (
                              <tr key={m.id} className="bg-gray-900 hover:bg-gray-800/50 transition-colors">
                                {/* Coluna do jogo — sticky */}
                                <td className="sticky left-0 z-10 bg-inherit px-4 py-3 min-w-[200px] sm:min-w-[260px]">
                                  <div className="flex items-center gap-2">
                                    {/* Time da casa */}
                                    <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                                      <span className="text-xs sm:text-sm font-medium text-white truncate text-right">
                                        {m.home_team}
                                      </span>
                                      <FlagImage flag={m.home_team_flag} size={20} className="shrink-0" />
                                    </div>

                                    {/* Placar real ou separador */}
                                    <div className="shrink-0 text-center w-14">
                                      {finished ? (
                                        <span className="text-sm font-bold text-white whitespace-nowrap">
                                          {m.home_score}–{m.away_score}
                                        </span>
                                      ) : inProgress ? (
                                        <span className="text-xs text-green-400 font-medium whitespace-nowrap">
                                          ao vivo
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-600 whitespace-nowrap">
                                          {new Date(m.match_date).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: '2-digit',
                                            timeZone: 'America/Sao_Paulo',
                                          })}
                                        </span>
                                      )}
                                    </div>

                                    {/* Time visitante */}
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <FlagImage flag={m.away_team_flag} size={20} className="shrink-0" />
                                      <span className="text-xs sm:text-sm font-medium text-white truncate">
                                        {m.away_team}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Horário / status */}
                                  <div className="text-xs text-gray-600 mt-0.5 text-center">
                                    {finished ? (
                                      <span className="text-green-600">Encerrado</span>
                                    ) : (
                                      new Date(m.match_date).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit', minute: '2-digit',
                                        timeZone: 'America/Sao_Paulo',
                                      })
                                    )}
                                  </div>
                                </td>

                                {/* Colunas de palpites */}
                                {players.map(p => {
                                  const pred = predMap[m.id]?.[p.id]
                                  const isMe = p.id === user.id
                                  const hasPenalty = m.stage !== 'group'

                                  let cellClass = 'text-gray-600'
                                  let label = '–'
                                  let badge = ''

                                  if (pred) {
                                    label = `${pred.home}–${pred.away}`
                                    if (finished) {
                                      if (pred.pts_exact_bonus > 0) {
                                        cellClass = 'text-orange-400 font-bold'
                                        badge = '⭐'
                                      } else if (pred.pts_total > 0) {
                                        cellClass = 'text-green-400 font-medium'
                                      } else {
                                        cellClass = 'text-gray-500'
                                      }
                                    } else {
                                      cellClass = isMe ? 'text-orange-300' : 'text-gray-300'
                                    }
                                  }

                                  const penaltyPred = pred?.penalty_winner_prediction ?? null
                                  let penaltyClass = 'text-gray-500'
                                  if (finished && m.penalty_winner) {
                                    penaltyClass = penaltyPred === m.penalty_winner
                                      ? 'text-green-400 font-medium'
                                      : penaltyPred ? 'text-gray-500' : 'text-gray-600'
                                  }

                                  return (
                                    <td
                                      key={p.id}
                                      className={`px-3 py-3 text-center text-xs w-20 ${
                                        isMe ? 'bg-orange-500/5' : ''
                                      }`}
                                    >
                                      <span className={cellClass}>
                                        {label}
                                        {badge && <span className="ml-0.5">{badge}</span>}
                                      </span>
                                      {hasPenalty && (
                                        <div className={`text-[10px] mt-0.5 ${penaltyClass}`}>
                                          {penaltyPred
                                            ? `🏆 ${penaltyPred.split(' ')[0]}`
                                            : finished && m.penalty_winner ? '–' : ''}
                                        </div>
                                      )}
                                      {finished && pred && pred.pts_total > 0 && (
                                        <div className="text-gray-600 text-[10px] mt-0.5">
                                          +{pred.pts_total}
                                          {pred.pts_penalty_winner > 0 && (
                                            <span className="text-green-600"> (+{pred.pts_penalty_winner}p)</span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
