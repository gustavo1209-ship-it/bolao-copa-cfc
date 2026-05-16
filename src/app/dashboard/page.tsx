import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { StageBadge } from '@/components/stage-badge'
import { type Standing, type Stage, STAGE_MULTIPLIERS } from '@/types'
import { Trophy, Target, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Buscar minha posição no ranking
  const { data: myStanding } = await supabase
    .from('standings')
    .select('*')
    .eq('id', user.id)
    .single()

  // Contar total de participantes
  const { count: totalParticipants } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Meus palpites com dados das partidas
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*, match:matches(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Próximas partidas sem palpite
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .order('match_date', { ascending: true })
    .limit(5)

  const predictedMatchIds = new Set(predictions?.map(p => p.match_id) ?? [])
  const unguessedMatches = upcomingMatches?.filter(m => !predictedMatchIds.has(m.id)) ?? []

  const standing = myStanding as Standing | null
  const finishedPredictions = predictions?.filter(p => p.match?.status === 'finished') ?? []

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Olá, <span className="text-orange-500">{profile?.name?.split(' ')[0]}</span>! 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe seus palpites e pontuação</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1 flex items-center gap-1.5">
              <Trophy size={12} className="text-orange-500" /> Posição
            </div>
            <div className="text-2xl font-bold text-orange-500">
              {standing ? `${standing.rank}º` : '–'}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">de {totalParticipants} participantes</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-blue-400" /> Pontos
            </div>
            <div className="text-2xl font-bold text-white">{standing?.total_pts ?? 0}</div>
            <div className="text-xs text-gray-600 mt-0.5">pts acumulados</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1 flex items-center gap-1.5">
              <Target size={12} className="text-green-400" /> Exatos
            </div>
            <div className="text-2xl font-bold text-green-400">{standing?.exact_scores ?? 0}</div>
            <div className="text-xs text-gray-600 mt-0.5">placares exatos</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-blue-400" /> Acertos
            </div>
            <div className="text-2xl font-bold text-blue-400">{standing?.correct_results ?? 0}</div>
            <div className="text-xs text-gray-600 mt-0.5">resultados corretos</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Palpites pendentes */}
          {unguessedMatches.length > 0 && (
            <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-orange-400 mb-4 flex items-center gap-2">
                <Clock size={16} />
                Jogos sem palpite ({unguessedMatches.length})
              </h2>
              <div className="space-y-2">
                {unguessedMatches.slice(0, 4).map(m => (
                  <Link
                    key={m.id}
                    href={`/palpites/${m.id}`}
                    className="flex items-center justify-between p-3 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors border border-gray-700/50 hover:border-orange-500/30"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{m.home_team_flag}</span>
                      <span className="font-medium">{m.home_team}</span>
                      <span className="text-gray-500">vs</span>
                      <span className="font-medium">{m.away_team}</span>
                      <span>{m.away_team_flag}</span>
                    </div>
                    <span className="text-xs text-orange-500 font-medium ml-2 shrink-0">Palpitar →</span>
                  </Link>
                ))}
                {unguessedMatches.length > 4 && (
                  <Link href="/palpites" className="block text-center text-xs text-orange-500 hover:text-orange-400 py-2">
                    Ver mais {unguessedMatches.length - 4} jogos →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Últimos palpites */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
              <Target size={16} className="text-orange-500" />
              Últimos Palpites
            </h2>
            {predictions && predictions.length > 0 ? (
              <div className="space-y-2">
                {predictions.slice(0, 6).map(pred => {
                  const match = pred.match
                  const isFinished = match?.status === 'finished'
                  const isExact = pred.pts_exact_bonus > 0
                  const isCorrect = pred.pts_result > 0

                  return (
                    <div key={pred.id} className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <StageBadge stage={match?.stage as Stage} />
                          {match?.group_name && <span>Grupo {match.group_name}</span>}
                        </div>
                        {isFinished && (
                          <div className="flex items-center gap-1">
                            {isExact ? (
                              <span className="text-xs font-bold text-orange-400">+{pred.pts_total} pts ⚡</span>
                            ) : isCorrect ? (
                              <span className="text-xs font-bold text-green-400">+{pred.pts_total} pts</span>
                            ) : (
                              <span className="text-xs text-red-400">0 pts</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <span>{match?.home_team_flag}</span>
                          <span className="font-medium">{match?.home_team}</span>
                        </span>
                        <div className="flex items-center gap-2 text-center">
                          <span className="font-bold text-orange-400">
                            {pred.home_score_prediction} – {pred.away_score_prediction}
                          </span>
                          {isFinished && (
                            <span className="text-gray-500 text-xs">
                              ({match?.home_score}–{match?.away_score})
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 justify-end">
                          <span className="font-medium">{match?.away_team}</span>
                          <span>{match?.away_team_flag}</span>
                        </span>
                      </div>
                      {!isFinished && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={10} />
                          {match?.match_date && new Date(match.match_date).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                <Link href="/palpites" className="block text-center text-xs text-orange-500 hover:text-orange-400 py-2">
                  Ver todos os palpites →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Target size={32} className="mx-auto mb-2 opacity-30" />
                <p>Nenhum palpite feito ainda.</p>
                <Link href="/palpites" className="text-orange-500 hover:text-orange-400 mt-2 block">
                  Fazer primeiro palpite →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
