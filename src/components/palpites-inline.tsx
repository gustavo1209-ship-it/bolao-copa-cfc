'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StageBadge } from '@/components/stage-badge'
import { FlagImage } from '@/components/flag-image'
import { type Match, type Stage, STAGE_MULTIPLIERS, STAGE_ORDER } from '@/types'
import { CheckCircle, Lock, Loader2, Minus, Plus, Save, AlertCircle, Trophy } from 'lucide-react'

interface PredictionData {
  home: number | null
  away: number | null
  pts_total?: number
  saved: boolean
}

type GlobalSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface PalpitesInlineProps {
  matches: Match[]
  initialPredictions: Record<string, { home: number; away: number; pts_total: number }>
  userId: string
}

export function PalpitesInline({ matches, initialPredictions, userId }: PalpitesInlineProps) {
  const [preds, setPreds] = useState<Record<string, PredictionData>>(() => {
    const state: Record<string, PredictionData> = {}
    for (const m of matches) {
      const existing = initialPredictions[m.id]
      state[m.id] = existing
        ? { home: existing.home, away: existing.away, pts_total: existing.pts_total, saved: true }
        : { home: null, away: null, saved: false }
    }
    return state
  })

  const [globalStatus, setGlobalStatus] = useState<GlobalSaveStatus>('idle')

  const now = new Date()

  function isLocked(m: Match) {
    return new Date(m.match_date) <= now || m.status !== 'scheduled'
  }

  function adjust(matchId: string, side: 'home' | 'away', delta: number) {
    setPreds(prev => {
      const current = prev[matchId]
      const base = current[side] ?? 0
      const newVal = Math.max(0, Math.min(20, base + delta))
      return { ...prev, [matchId]: { ...current, [side]: newVal, saved: false } }
    })
  }

  function handleScoreInput(matchId: string, side: 'home' | 'away', value: string) {
    if (value === '') {
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: null, saved: false } }))
      return
    }
    const num = parseInt(value, 10)
    const clamped = isNaN(num) ? null : Math.max(0, Math.min(20, num))
    setPreds(prev => {
      const current = prev[matchId]
      return { ...prev, [matchId]: { ...current, [side]: clamped, saved: false } }
    })
  }

  // Partidas abertas com palpite preenchido mas não salvo (ambos os placares precisam estar definidos)
  const unsavedMatches = matches.filter(m => {
    if (isLocked(m) || m.status === 'finished') return false
    const pred = preds[m.id]
    if (pred?.home === null || pred?.away === null) return false
    return !pred?.saved
  })

  const saveAll = useCallback(async () => {
    if (unsavedMatches.length === 0) return
    setGlobalStatus('saving')

    const supabase = createClient()
    let hasError = false

    for (const m of unsavedMatches) {
      const pred = preds[m.id]
      if (pred.home === null || pred.away === null) continue
      const { error } = await supabase.from('predictions').upsert({
        user_id: userId,
        match_id: m.id,
        home_score_prediction: pred.home,
        away_score_prediction: pred.away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,match_id' })

      if (error) {
        hasError = true
      } else {
        setPreds(p => ({ ...p, [m.id]: { ...p[m.id], saved: true } }))
      }
    }

    setGlobalStatus(hasError ? 'error' : 'saved')
    setTimeout(() => setGlobalStatus('idle'), 3000)
  }, [preds, unsavedMatches, userId])

  // Agrupar por fase
  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const sm = matches.filter(m => m.stage === stage)
    if (sm.length > 0) acc[stage] = sm
    return acc
  }, {} as Record<Stage, Match[]>)

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Trophy size={48} className="mx-auto mb-4 opacity-30" />
        <p>Nenhuma partida cadastrada ainda.</p>
      </div>
    )
  }

  const unsavedCount = unsavedMatches.length

  return (
    <div className="space-y-10 pb-24">
      {STAGE_ORDER.map(stage => {
        const stageMatches = grouped[stage]
        if (!stageMatches) return null

        const multiplier = STAGE_MULTIPLIERS[stage]
        const maxPts = 8 * multiplier

        const subGroups = stage === 'group'
          ? [...new Set(stageMatches.map(m => m.group_name))].sort() as string[]
          : [null]

        return (
          <div key={stage}>
            <div className="flex items-center gap-3 mb-4">
              <StageBadge stage={stage} showMultiplier />
              <span className="text-xs text-gray-600">máx {maxPts} pts/jogo</span>
            </div>

            {subGroups.map(groupName => {
              const groupMatches = groupName
                ? stageMatches.filter(m => m.group_name === groupName)
                : stageMatches

              return (
                <div key={groupName ?? 'all'} className="mb-5">
                  {groupName && (
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                      Grupo {groupName}
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-2xl border border-gray-800 divide-y divide-gray-800/60 overflow-hidden">
                    {groupMatches.map(m => {
                      const pred = preds[m.id]
                      const locked = isLocked(m)
                      const finished = m.status === 'finished'
                      const hasPrediction = initialPredictions[m.id] !== undefined

                      return (
                        <div
                          key={m.id}
                          className={`px-4 py-3 transition-colors ${locked ? 'opacity-70' : ''}`}
                        >
                          {/* Linha 1: status icon + times + placar/inputs */}
                          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">

                            {/* Status icon */}
                            <div className="shrink-0 w-5 flex justify-center">
                              {finished && hasPrediction ? (
                                initialPredictions[m.id]?.pts_total > 0
                                  ? <CheckCircle size={16} className="text-green-400" />
                                  : <CheckCircle size={16} className="text-gray-600" />
                              ) : locked ? (
                                <Lock size={14} className="text-gray-600" />
                              ) : pred?.saved ? (
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </div>

                            {/* Time da casa */}
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 justify-end">
                              <span className="text-xs sm:text-sm font-medium text-white truncate text-right">{m.home_team}</span>
                              <FlagImage flag={m.home_team_flag} size={20} className="shrink-0" />
                            </div>

                            {/* Placar */}
                            {finished ? (
                              <div className="shrink-0 text-center px-1">
                                <div className="text-base sm:text-lg font-bold text-white leading-none whitespace-nowrap">
                                  {m.home_score}–{m.away_score}
                                </div>
                              </div>
                            ) : locked ? (
                              <div className="shrink-0 text-center px-1">
                                {hasPrediction ? (
                                  <span className="text-orange-400 font-bold text-sm whitespace-nowrap">
                                    {initialPredictions[m.id]?.home}–{initialPredictions[m.id]?.away}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-600 whitespace-nowrap">Enc.</span>
                                )}
                              </div>
                            ) : (
                              <div className="shrink-0 flex items-center gap-0.5 sm:gap-1.5">
                                <button
                                  onClick={() => adjust(m.id, 'home', -1)}
                                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={9} />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={pred?.home ?? ''}
                                  onChange={e => handleScoreInput(m.id, 'home', e.target.value)}
                                  onFocus={e => e.target.select()}
                                  className="w-6 sm:w-8 text-center font-bold text-white text-sm sm:text-lg leading-none bg-transparent border-b border-gray-700 focus:border-orange-500 outline-none transition-colors p-0"
                                />
                                <button
                                  onClick={() => adjust(m.id, 'home', 1)}
                                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={9} />
                                </button>
                                <span className="text-gray-600 font-bold text-xs mx-0.5">–</span>
                                <button
                                  onClick={() => adjust(m.id, 'away', -1)}
                                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={9} />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={pred?.away ?? ''}
                                  onChange={e => handleScoreInput(m.id, 'away', e.target.value)}
                                  onFocus={e => e.target.select()}
                                  className="w-6 sm:w-8 text-center font-bold text-white text-sm sm:text-lg leading-none bg-transparent border-b border-gray-700 focus:border-orange-500 outline-none transition-colors p-0"
                                />
                                <button
                                  onClick={() => adjust(m.id, 'away', 1)}
                                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            )}

                            {/* Time visitante */}
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                              <FlagImage flag={m.away_team_flag} size={20} className="shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-white truncate">{m.away_team}</span>
                            </div>
                          </div>

                          {/* Linha 2: data + palpite/pts (jogo finalizado) */}
                          <div className="flex items-center justify-between mt-1.5 ml-7">
                            <span className="text-xs text-gray-600">
                              {new Date(m.match_date).toLocaleDateString('pt-BR', {
                                weekday: 'short', day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                                timeZone: 'America/Sao_Paulo',
                              })}
                            </span>

                            {finished && hasPrediction && (
                              <span className="text-xs ml-2">
                                <span className="text-gray-500">Palpite: </span>
                                <span className={`font-medium ${
                                  initialPredictions[m.id]?.pts_total > 0 ? 'text-orange-400' : 'text-gray-500'
                                }`}>
                                  {initialPredictions[m.id]?.home}–{initialPredictions[m.id]?.away}
                                </span>
                                {initialPredictions[m.id]?.pts_total > 0 && (
                                  <span className="text-green-400 ml-1">+{initialPredictions[m.id].pts_total}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Botão flutuante de salvar tudo */}
      {(unsavedCount > 0 || globalStatus !== 'idle') && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
          <div className="pointer-events-auto">
            {globalStatus === 'saving' ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-full border border-gray-700 shadow-2xl">
                <Loader2 size={16} className="animate-spin text-orange-500" />
                <span className="text-sm font-medium text-white">Salvando...</span>
              </div>
            ) : globalStatus === 'saved' ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-green-900/90 rounded-full border border-green-700 shadow-2xl">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-400">Palpites salvos!</span>
              </div>
            ) : globalStatus === 'error' ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-red-900/90 rounded-full border border-red-700 shadow-2xl">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-sm font-medium text-red-400">Erro ao salvar. Tente novamente.</span>
              </div>
            ) : (
              <button
                onClick={saveAll}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-full shadow-2xl text-white font-semibold text-sm transition-colors"
              >
                <Save size={16} />
                Salvar {unsavedCount} palpite{unsavedCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
