'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StageBadge } from '@/components/stage-badge'
import { FlagImage } from '@/components/flag-image'
import { type Match, type Prediction, type Stage, STAGE_MULTIPLIERS } from '@/types'
import { ArrowLeft, Loader2, Save, Lock, Trophy, Minus, Plus } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default function PalpitePage({ params }: Props) {
  const router = useRouter()
  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    params.then(p => setMatchId(p.id))
  }, [params])

  useEffect(() => {
    if (!matchId) return
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single()
      const { data: predData } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .single()

      setMatch(matchData)
      if (predData) {
        setPrediction(predData)
        setHomeScore(predData.home_score_prediction)
        setAwayScore(predData.away_score_prediction)
      }
      setLoading(false)
    }
    load()
  }, [matchId, router])

  const isLocked = match ? (new Date(match.match_date) <= new Date() || match.status !== 'scheduled') : false

  async function handleSave() {
    if (isLocked) return
    setSaving(true)
    setError('')
    setSuccess(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = {
      user_id: user.id,
      match_id: matchId,
      home_score_prediction: homeScore,
      away_score_prediction: awayScore,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'user_id,match_id' })

    if (saveError) {
      setError('Erro ao salvar palpite. Tente novamente.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/palpites'), 1200)
    }
    setSaving(false)
  }

  function adjust(setter: (n: number) => void, current: number, delta: number) {
    setter(Math.max(0, Math.min(20, current + delta)))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Partida não encontrada.</p>
          <Link href="/palpites" className="text-orange-500 hover:text-orange-400">← Voltar</Link>
        </div>
      </div>
    )
  }

  const multiplier = STAGE_MULTIPLIERS[match.stage as Stage]
  const maxPoints = 8 * multiplier

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link href="/palpites" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} />
          Voltar aos palpites
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {/* Stage + date */}
          <div className="flex items-center justify-between mb-6">
            <StageBadge stage={match.stage as Stage} showMultiplier />
            <span className="text-xs text-gray-500">
              {new Date(match.match_date).toLocaleDateString('pt-BR', {
                weekday: 'short', day: '2-digit', month: 'long',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          {/* Match header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-2">
                <FlagImage flag={match.home_team_flag} size={56} />
              </div>
              <div className="font-bold text-lg">{match.home_team}</div>
              {match.group_name && <div className="text-xs text-gray-500 mt-1">Grupo {match.group_name}</div>}
            </div>
            <div className="text-center px-4">
              <div className="text-gray-500 text-sm font-medium">VS</div>
              {match.status === 'finished' && (
                <div className="mt-2 text-xl font-bold text-white">
                  {match.home_score} – {match.away_score}
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-2">
                <FlagImage flag={match.away_team_flag} size={56} />
              </div>
              <div className="font-bold text-lg">{match.away_team}</div>
              {match.group_name && <div className="text-xs text-gray-500 mt-1">Grupo {match.group_name}</div>}
            </div>
          </div>

          {/* Palpite inputs */}
          {isLocked ? (
            <div className="bg-gray-800/60 rounded-xl p-5 text-center border border-gray-700">
              <Lock size={24} className="mx-auto mb-2 text-gray-500" />
              <p className="text-gray-400 text-sm">
                {match.status === 'finished'
                  ? 'Esta partida já foi encerrada.'
                  : 'Esta partida já começou — palpites encerrados.'}
              </p>
              {prediction && (
                <div className="mt-3 text-orange-400 font-bold text-xl">
                  Seu palpite: {prediction.home_score_prediction} – {prediction.away_score_prediction}
                  {match.status === 'finished' && (
                    <div className="text-sm mt-1">
                      {prediction.pts_total > 0
                        ? <span className="text-green-400">+{prediction.pts_total} pts ganhos!</span>
                        : <span className="text-gray-500">0 pts</span>
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Home score */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => adjust(setHomeScore, homeScore, 1)}
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500/20 border border-gray-700 hover:border-orange-500 flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  <div className="text-4xl font-bold text-white w-16 text-center bg-gray-800 border border-gray-700 rounded-xl py-3">
                    {homeScore}
                  </div>
                  <button
                    onClick={() => adjust(setHomeScore, homeScore, -1)}
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500/20 border border-gray-700 hover:border-orange-500 flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-2xl text-gray-600 font-bold">–</span>
                </div>

                {/* Away score */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => adjust(setAwayScore, awayScore, 1)}
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500/20 border border-gray-700 hover:border-orange-500 flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  <div className="text-4xl font-bold text-white w-16 text-center bg-gray-800 border border-gray-700 rounded-xl py-3">
                    {awayScore}
                  </div>
                  <button
                    onClick={() => adjust(setAwayScore, awayScore, -1)}
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500/20 border border-gray-700 hover:border-orange-500 flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>

              {/* Possible points */}
              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-400">
                <Trophy size={14} className="text-orange-500" />
                Jogo vale até <span className="text-orange-400 font-bold">{maxPoints} pts</span>
                <span className="text-gray-600">(×{multiplier})</span>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4 text-center">
                  {error}
                </p>
              )}

              {success ? (
                <div className="text-center py-3 text-green-400 font-medium flex items-center justify-center gap-2">
                  ✅ Palpite salvo! Redirecionando...
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {prediction ? 'Atualizar Palpite' : 'Salvar Palpite'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Pontuação possível */}
        {!isLocked && (
          <div className="mt-4 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold mb-2">Pontos que você pode ganhar:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Resultado correto (V/E/D)</span>
                <span className="text-blue-400">+{3 * multiplier} pts</span>
              </div>
              <div className="flex justify-between">
                <span>Gols do time da casa</span>
                <span className="text-green-400">+{1 * multiplier} pt</span>
              </div>
              <div className="flex justify-between">
                <span>Gols do visitante</span>
                <span className="text-green-400">+{1 * multiplier} pt</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
                <span>Bônus placar exato</span>
                <span className="text-orange-400">+{3 * multiplier} pts</span>
              </div>
              <div className="flex justify-between font-semibold text-white mt-1">
                <span>Máximo possível</span>
                <span className="text-orange-500">{8 * multiplier} pts</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
