'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StageBadge } from '@/components/stage-badge'
import { type Match, type Stage, STAGE_MULTIPLIERS, STAGE_ORDER } from '@/types'
import { CheckCircle, Lock, Loader2, Minus, Plus, Save, AlertCircle, Trophy } from 'lucide-react'

interface PredictionData {
  home: number
  away: number
  pts_total?: number
  saved: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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
        : { home: 0, away: 0, saved: false }
    }
    return state
  })

  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})

  const now = new Date()

  function isLocked(m: Match) {
    return new Date(m.match_date) <= now || m.status !== 'scheduled'
  }

  function adjust(matchId: string, side: 'home' | 'away', delta: number) {
    setPreds(prev => {
      const current = prev[matchId]
      const newVal = Math.max(0, Math.min(20, (current[side] ?? 0) + delta))
      return { ...prev, [matchId]: { ...current, [side]: newVal, saved: false } }
    })
  }

  const save = useCallback(async (matchId: string) => {
    const pred = preds[matchId]
    setSaveStatus(s => ({ ...s, [matchId]: 'saving' }))

    const supabase = createClient()
    const { error } = await supabase.from('predictions').upsert({
      user_id: userId,
      match_id: matchId,
      home_score_prediction: pred.home,
      away_score_prediction: pred.away,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_id' })

    if (error) {
      setSaveStatus(s => ({ ...s, [matchId]: 'error' }))
      setTimeout(() => setSaveStatus(s => ({ ...s, [matchId]: 'idle' })), 3000)
    } else {
      setPreds(p => ({ ...p, [matchId]: { ...p[matchId], saved: true } }))
      setSaveStatus(s => ({ ...s, [matchId]: 'saved' }))
      setTimeout(() => setSaveStatus(s => ({ ...s, [matchId]: 'idle' })), 2000)
    }
  }, [preds, userId])

  // Agrupar por fase, depois por grupo
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

  return (
    <div className="space-y-10">
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
                      const status = saveStatus[m.id] ?? 'idle'
                      const hasPrediction = initialPredictions[m.id] !== undefined
                      const isUnsaved = !pred?.saved

                      return (
                        <div
                          key={m.id}
                          className={`px-4 py-3 transition-colors ${
                            locked ? 'opacity-70' : ''
                          }`}
                        >
                          {/* Layout principal */}
                          <div className="flex items-center gap-3 min-w-0">

                            {/* Status icon */}
                            <div className="shrink-0 w-5 flex justify-center">
                              {finished && hasPrediction ? (
                                initialPredictions[m.id]?.pts_total > 0
                                  ? <CheckCircle size={16} className="text-green-400" />
                                  : <CheckCircle size={16} className="text-gray-600" />
                              ) : hasPrediction && !locked ? (
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                              ) : locked ? (
                                <Lock size={14} className="text-gray-600" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-orange-500/60" />
                              )}
                            </div>

                            {/* Time da casa */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                              <span className="text-sm font-medium text-white truncate text-right">{m.home_team}</span>
                              <span className="text-lg shrink-0">{m.home_team_flag}</span>
                            </div>

                            {/* Placar */}
                            {finished ? (
                              // Jogo finalizado: mostrar placar real e palpite
                              <div className="shrink-0 text-center min-w-[100px]">
                                <div className="text-lg font-bold text-white leading-none">
                                  {m.home_score} – {m.away_score}
                                </div>
                                {hasPrediction && (
                                  <div className="text-xs mt-0.5">
                                    <span className="text-gray-500">Seu palpite: </span>
                                    <span className={`font-medium ${
                                      initialPredictions[m.id]?.pts_total > 0
                                        ? 'text-orange-400'
                                        : 'text-gray-500'
                                    }`}>
                                      {initialPredictions[m.id]?.home}–{initialPredictions[m.id]?.away}
                                    </span>
                                    {initialPredictions[m.id]?.pts_total > 0 && (
                                      <span className="text-green-400 ml-1">
                                        +{initialPredictions[m.id].pts_total}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : locked ? (
                              // Jogo travado (em andamento ou sem palpite)
                              <div className="shrink-0 text-center min-w-[100px]">
                                {hasPrediction ? (
                                  <span className="text-orange-400 font-bold">
                                    {initialPredictions[m.id]?.home} – {initialPredictions[m.id]?.away}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-600">Encerrado</span>
                                )}
                              </div>
                            ) : (
                              // Inputs de palpite inline
                              <div className="shrink-0 flex items-center gap-1.5 min-w-[140px] justify-center">
                                {/* Home score */}
                                <button
                                  onClick={() => adjust(m.id, 'home', -1)}
                                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-7 text-center font-bold text-white text-lg leading-none">
                                  {pred?.home ?? 0}
                                </span>
                                <button
                                  onClick={() => adjust(m.id, 'home', 1)}
                                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={12} />
                                </button>

                                <span className="text-gray-600 font-bold mx-0.5">–</span>

                                {/* Away score */}
                                <button
                                  onClick={() => adjust(m.id, 'away', -1)}
                                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-7 text-center font-bold text-white text-lg leading-none">
                                  {pred?.away ?? 0}
                                </span>
                                <button
                                  onClick={() => adjust(m.id, 'away', 1)}
                                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}

                            {/* Time visitante */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-lg shrink-0">{m.away_team_flag}</span>
                              <span className="text-sm font-medium text-white truncate">{m.away_team}</span>
                            </div>

                            {/* Botão salvar / status */}
                            <div className="shrink-0 w-20 flex justify-end">
                              {locked || finished ? null : (
                                status === 'saving' ? (
                                  <Loader2 size={16} className="text-gray-500 animate-spin" />
                                ) : status === 'saved' ? (
                                  <span className="text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle size={14} /> Salvo
                                  </span>
                                ) : status === 'error' ? (
                                  <span className="text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle size={14} /> Erro
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => save(m.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      isUnsaved
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                        : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                                    }`}
                                  >
                                    <Save size={11} />
                                    {isUnsaved ? 'Salvar' : 'Editar'}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Data e hora */}
                          <div className="ml-8 mt-1 text-xs text-gray-600">
                            {new Date(m.match_date).toLocaleDateString('pt-BR', {
                              weekday: 'short', day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                              timeZone: 'America/Sao_Paulo',
                            })}
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
    </div>
  )
}
