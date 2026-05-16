import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { StageBadge } from '@/components/stage-badge'
import { type Stage, STAGE_LABELS } from '@/types'
import { CheckCircle, Clock, Lock, ChevronRight } from 'lucide-react'

const STAGE_ORDER: Stage[] = [
  'group', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'
]

export default async function PalpitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  const { data: myPredictions } = await supabase
    .from('predictions')
    .select('match_id, home_score_prediction, away_score_prediction, pts_total')
    .eq('user_id', user.id)

  const predMap = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])

  // Agrupar por fase
  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const stageMatches = (matches ?? []).filter(m => m.stage === stage)
    if (stageMatches.length > 0) acc[stage] = stageMatches
    return acc
  }, {} as Record<Stage, typeof matches>)

  const now = new Date()

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Palpites</h1>
          <p className="text-gray-400 text-sm mt-1">Faça seus palpites antes do início de cada partida</p>
        </div>

        {Object.entries(grouped).length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhuma partida cadastrada ainda.</p>
            <p className="text-sm mt-1">O admin irá adicionar as partidas em breve.</p>
          </div>
        )}

        <div className="space-y-8">
          {STAGE_ORDER.map(stage => {
            const stageMatches = grouped[stage]
            if (!stageMatches || stageMatches.length === 0) return null

            // Sub-agrupar por group_name se for fase de grupos
            const subGroups = stage === 'group'
              ? Array.from(new Set(stageMatches.map(m => m.group_name))).sort()
              : [null]

            return (
              <div key={stage}>
                <div className="flex items-center gap-3 mb-4">
                  <StageBadge stage={stage} showMultiplier />
                  <span className="text-gray-600 text-sm">
                    {stageMatches.length} {stageMatches.length === 1 ? 'jogo' : 'jogos'}
                  </span>
                </div>

                {subGroups.map(groupName => {
                  const groupMatches = groupName
                    ? stageMatches.filter(m => m.group_name === groupName)
                    : stageMatches

                  return (
                    <div key={groupName ?? 'all'} className="mb-6">
                      {groupName && (
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                          Grupo {groupName}
                        </h3>
                      )}
                      <div className="space-y-2">
                        {groupMatches.map(m => {
                          const pred = predMap.get(m.id)
                          const matchDate = new Date(m.match_date)
                          const isLocked = matchDate <= now || m.status !== 'scheduled'
                          const isFinished = m.status === 'finished'

                          return (
                            <Link
                              key={m.id}
                              href={`/palpites/${m.id}`}
                              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                                isLocked && !pred
                                  ? 'bg-gray-900/40 border-gray-800/50 opacity-60 cursor-not-allowed pointer-events-none'
                                  : 'bg-gray-900 border-gray-800 hover:border-orange-500/40 hover:bg-gray-800/50'
                              }`}
                            >
                              {/* Status icon */}
                              <div className="shrink-0">
                                {isFinished && pred ? (
                                  pred.pts_total > 0
                                    ? <CheckCircle size={18} className="text-green-400" />
                                    : <CheckCircle size={18} className="text-gray-600" />
                                ) : pred ? (
                                  <CheckCircle size={18} className="text-blue-400" />
                                ) : isLocked ? (
                                  <Lock size={18} className="text-gray-600" />
                                ) : (
                                  <Clock size={18} className="text-orange-500" />
                                )}
                              </div>

                              {/* Match info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <span>{m.home_team_flag}</span>
                                    <span className="truncate">{m.home_team}</span>
                                    {isFinished && (
                                      <span className="text-lg font-bold text-white">
                                        {m.home_score} – {m.away_score}
                                      </span>
                                    )}
                                    {!isFinished && <span className="text-gray-500 text-xs">vs</span>}
                                    <span className="truncate">{m.away_team}</span>
                                    <span>{m.away_team_flag}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {matchDate.toLocaleDateString('pt-BR', {
                                    weekday: 'short', day: '2-digit', month: 'short',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </div>
                              </div>

                              {/* Prediction */}
                              <div className="shrink-0 text-right">
                                {pred ? (
                                  <div>
                                    <span className="text-orange-400 font-bold">
                                      {pred.home_score_prediction} – {pred.away_score_prediction}
                                    </span>
                                    {isFinished && (
                                      <div className="text-xs font-medium mt-0.5">
                                        {pred.pts_total > 0
                                          ? <span className="text-green-400">+{pred.pts_total} pts</span>
                                          : <span className="text-gray-500">0 pts</span>
                                        }
                                      </div>
                                    )}
                                  </div>
                                ) : isLocked ? (
                                  <span className="text-xs text-gray-600">Encerrado</span>
                                ) : (
                                  <ChevronRight size={16} className="text-orange-500" />
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
