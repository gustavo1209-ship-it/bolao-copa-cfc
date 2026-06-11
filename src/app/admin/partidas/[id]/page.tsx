'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { type Match, type Stage, STAGE_LABELS } from '@/types'
import { ArrowLeft, Save, Loader2, RefreshCw, Trash2 } from 'lucide-react'

const STAGES = Object.entries(STAGE_LABELS) as [Stage, string][]

interface Props {
  params: Promise<{ id: string }>
}

export default function EditarPartidaPage({ params }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSync = searchParams.get('sync') === '1'

  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')

  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [homeFlag, setHomeFlag] = useState('')
  const [awayFlag, setAwayFlag] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [stage, setStage] = useState<Stage>('group')
  const [groupName, setGroupName] = useState('')
  const [sofascoreId, setSofascoreId] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'finished'>('scheduled')

  useEffect(() => {
    params.then(p => setMatchId(p.id))
  }, [params])

  useEffect(() => {
    if (!matchId) return
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single()
      if (data) {
        setMatch(data)
        setHomeTeam(data.home_team)
        setAwayTeam(data.away_team)
        setHomeFlag(data.home_team_flag ?? '')
        setAwayFlag(data.away_team_flag ?? '')
        setStage(data.stage as Stage)
        setGroupName(data.group_name ?? '')
        setSofascoreId(data.sofascore_id?.toString() ?? '')
        setHomeScore(data.home_score?.toString() ?? '')
        setAwayScore(data.away_score?.toString() ?? '')
        setStatus(data.status)
        const d = new Date(data.match_date)
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        setMatchDate(local.toISOString().slice(0, 16))
      }
      setLoading(false)
    }
    load()
  }, [matchId])

  // Auto sync if redirected from list
  useEffect(() => {
    if (autoSync && match && match.sofascore_id && !syncing) {
      handleSync()
    }
  }, [match, autoSync]) // eslint-disable-line

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const updates: Record<string, unknown> = {
      home_team: homeTeam,
      away_team: awayTeam,
      home_team_flag: homeFlag,
      away_team_flag: awayFlag,
      match_date: new Date(matchDate).toISOString(),
      stage,
      group_name: stage === 'group' ? groupName : null,
      sofascore_id: sofascoreId ? parseInt(sofascoreId) : null,
      status,
    }

    if (homeScore !== '' && awayScore !== '') {
      updates.home_score = parseInt(homeScore)
      updates.away_score = parseInt(awayScore)
    }

    const { error: updateError } = await supabase.from('matches').update(updates).eq('id', matchId)

    if (updateError) {
      setError(updateError.message)
    } else {
      // Se placar foi atualizado e status é finished, calcular pontos
      if (status === 'finished' && homeScore !== '' && awayScore !== '') {
        await fetch(`/api/sofascore/sync/${matchId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            status: 'finished',
            manual: true,
          }),
        })
      }
      router.push('/admin/partidas')
      router.refresh()
    }
    setSaving(false)
  }

  async function handleSync() {
    if (!match?.sofascore_id) return
    setSyncing(true)
    setSyncMsg('')
    setError('')

    // Busca do SofaScore direto pelo browser (evita bloqueio de IP de servidor)
    let sfHomeScore: number
    let sfAwayScore: number
    try {
      const sfRes = await fetch(`https://api.sofascore.com/api/v1/event/${match.sofascore_id}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      })
      if (!sfRes.ok) {
        setError(`SofaScore retornou status ${sfRes.status}. Use o placar manual abaixo.`)
        setSyncing(false)
        return
      }
      const sfData = await sfRes.json()
      const event = sfData.event
      if (!event) throw new Error('Formato inesperado')
      const sfStatus = event.status?.type as string
      if (sfStatus !== 'finished') {
        setError(`Jogo ainda não finalizado no SofaScore (status: ${sfStatus})`)
        setSyncing(false)
        return
      }
      sfHomeScore = event.homeScore?.current ?? 0
      sfAwayScore = event.awayScore?.current ?? 0
    } catch {
      setError('Erro ao acessar SofaScore. Use o placar manual abaixo.')
      setSyncing(false)
      return
    }

    // Envia para a API como sync manual com os dados já buscados
    const res = await fetch(`/api/sofascore/sync/${matchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual: true, homeScore: sfHomeScore, awayScore: sfAwayScore, status: 'finished' }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setSyncMsg(`✅ Sincronizado! ${sfHomeScore}–${sfAwayScore} (${data.predictionsUpdated} palpites pontuados)`)
      setHomeScore(sfHomeScore.toString())
      setAwayScore(sfAwayScore.toString())
      setStatus('finished')
    }
    setSyncing(false)
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta partida? Os palpites relacionados também serão excluídos.')) return
    const supabase = createClient()
    await supabase.from('predictions').delete().eq('match_id', matchId)
    await supabase.from('matches').delete().eq('id', matchId)
    router.push('/admin/partidas')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
      </div>
    )
  }

  const inputCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5"

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link href="/admin/partidas" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} />
          Voltar às partidas
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">Editar Partida</h1>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Excluir
            </button>
          </div>

          {/* SofaScore sync */}
          {match?.sofascore_id && (
            <div className="mb-5 p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">ID SofaScore: {match.sofascore_id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sincroniza placar e status automaticamente
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Sincronizar
                </button>
              </div>
              {syncMsg && <p className="text-sm text-green-400 mt-2">{syncMsg}</p>}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Time da Casa</label>
                <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Visitante</label>
                <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bandeira da Casa (emoji)</label>
                <input value={homeFlag} onChange={e => setHomeFlag(e.target.value)} className={inputCls} placeholder="🇧🇷" />
              </div>
              <div>
                <label className={labelCls}>Bandeira Visitante (emoji)</label>
                <input value={awayFlag} onChange={e => setAwayFlag(e.target.value)} className={inputCls} placeholder="🇦🇷" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Data e Hora</label>
              <input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fase</label>
                <select value={stage} onChange={e => setStage(e.target.value as Stage)} className={inputCls}>
                  {STAGES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {stage === 'group' && (
                <div>
                  <label className={labelCls}>Grupo</label>
                  <select value={groupName} onChange={e => setGroupName(e.target.value)} className={inputCls}>
                    {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>ID SofaScore</label>
              <input type="number" value={sofascoreId} onChange={e => setSofascoreId(e.target.value)} placeholder="ex: 12345678" className={inputCls} />
            </div>

            {/* Placar manual */}
            <div className="pt-2 border-t border-gray-800">
              <p className="text-sm font-medium text-gray-300 mb-3">Resultado (placar manual)</p>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <label className={labelCls}>Gols casa</label>
                  <input type="number" min="0" value={homeScore} onChange={e => { setHomeScore(e.target.value); if (e.target.value !== '' && awayScore !== '') setStatus('finished') }} placeholder="0" className={inputCls} />
                </div>
                <div className="text-center text-gray-500 pt-5 font-bold">–</div>
                <div>
                  <label className={labelCls}>Gols visitante</label>
                  <input type="number" min="0" value={awayScore} onChange={e => { setAwayScore(e.target.value); if (e.target.value !== '' && homeScore !== '') setStatus('finished') }} placeholder="0" className={inputCls} />
                </div>
              </div>
              <div className="mt-3">
                <label className={labelCls}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={inputCls}>
                  <option value="scheduled">Agendado</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Alterações
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
