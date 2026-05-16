'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { type Stage, STAGE_LABELS } from '@/types'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

const STAGES = Object.entries(STAGE_LABELS) as [Stage, string][]

const TEAMS: { flag: string; name: string }[] = [
  { flag: '🇲🇽', name: 'México' }, { flag: '🇿🇦', name: 'África do Sul' },
  { flag: '🇰🇷', name: 'Coreia do Sul' }, { flag: '🇨🇿', name: 'República Tcheca' },
  { flag: '🇨🇦', name: 'Canadá' }, { flag: '🇧🇦', name: 'Bósnia-Herzegovina' },
  { flag: '🇶🇦', name: 'Catar' }, { flag: '🇨🇭', name: 'Suíça' },
  { flag: '🇧🇷', name: 'Brasil' }, { flag: '🇲🇦', name: 'Marrocos' },
  { flag: '🇭🇹', name: 'Haiti' }, { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Escócia' },
  { flag: '🇺🇸', name: 'Estados Unidos' }, { flag: '🇵🇾', name: 'Paraguai' },
  { flag: '🇦🇺', name: 'Austrália' }, { flag: '🇹🇷', name: 'Turquia' },
  { flag: '🇩🇪', name: 'Alemanha' }, { flag: '🇨🇼', name: 'Curaçao' },
  { flag: '🇨🇮', name: 'Costa do Marfim' }, { flag: '🇪🇨', name: 'Equador' },
  { flag: '🇳🇱', name: 'Holanda' }, { flag: '🇯🇵', name: 'Japão' },
  { flag: '🇸🇪', name: 'Suécia' }, { flag: '🇹🇳', name: 'Tunísia' },
  { flag: '🇧🇪', name: 'Bélgica' }, { flag: '🇪🇬', name: 'Egito' },
  { flag: '🇮🇷', name: 'Irã' }, { flag: '🇳🇿', name: 'Nova Zelândia' },
  { flag: '🇪🇸', name: 'Espanha' }, { flag: '🇨🇻', name: 'Cabo Verde' },
  { flag: '🇸🇦', name: 'Arábia Saudita' }, { flag: '🇺🇾', name: 'Uruguai' },
  { flag: '🇫🇷', name: 'França' }, { flag: '🇸🇳', name: 'Senegal' },
  { flag: '🇮🇶', name: 'Iraque' }, { flag: '🇳🇴', name: 'Noruega' },
  { flag: '🇦🇷', name: 'Argentina' }, { flag: '🇩🇿', name: 'Argélia' },
  { flag: '🇦🇹', name: 'Áustria' }, { flag: '🇯🇴', name: 'Jordânia' },
  { flag: '🇵🇹', name: 'Portugal' }, { flag: '🇨🇩', name: 'Congo (RD)' },
  { flag: '🇺🇿', name: 'Uzbequistão' }, { flag: '🇨🇴', name: 'Colômbia' },
  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Inglaterra' }, { flag: '🇭🇷', name: 'Croácia' },
  { flag: '🇬🇭', name: 'Gana' }, { flag: '🇵🇦', name: 'Panamá' },
]

export default function NovaPartidaPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [homeTeam, setHomeTeam] = useState(TEAMS[0].name)
  const [homeFlag, setHomeFlag] = useState(TEAMS[0].flag)
  const [awayTeam, setAwayTeam] = useState(TEAMS[1].name)
  const [awayFlag, setAwayFlag] = useState(TEAMS[1].flag)
  const [matchDate, setMatchDate] = useState('')
  const [stage, setStage] = useState<Stage>('group')
  const [groupName, setGroupName] = useState('A')
  const [sofascoreId, setSofascoreId] = useState('')

  function handleHomeChange(name: string) {
    setHomeTeam(name)
    const team = TEAMS.find(t => t.name === name)
    if (team) setHomeFlag(team.flag)
  }

  function handleAwayChange(name: string) {
    setAwayTeam(name)
    const team = TEAMS.find(t => t.name === name)
    if (team) setAwayFlag(team.flag)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('matches').insert({
      home_team: homeTeam,
      away_team: awayTeam,
      home_team_flag: homeFlag,
      away_team_flag: awayFlag,
      match_date: new Date(matchDate).toISOString(),
      stage,
      group_name: stage === 'group' ? groupName : null,
      sofascore_id: sofascoreId ? parseInt(sofascoreId) : null,
      status: 'scheduled',
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push('/admin/partidas')
    router.refresh()
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
          <h1 className="text-xl font-bold mb-6">Nova Partida</h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Time da Casa</label>
                <select
                  value={homeTeam}
                  onChange={e => handleHomeChange(e.target.value)}
                  className={inputCls}
                >
                  {TEAMS.map(t => (
                    <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Visitante</label>
                <select
                  value={awayTeam}
                  onChange={e => handleAwayChange(e.target.value)}
                  className={inputCls}
                >
                  {TEAMS.map(t => (
                    <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Data e Hora (horário local)</label>
              <input
                type="datetime-local"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fase</label>
                <select
                  value={stage}
                  onChange={e => setStage(e.target.value as Stage)}
                  className={inputCls}
                >
                  {STAGES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {stage === 'group' && (
                <div>
                  <label className={labelCls}>Grupo</label>
                  <select
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className={inputCls}
                  >
                    {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>
                ID SofaScore <span className="text-gray-500 font-normal">(opcional — para sincronizar resultado)</span>
              </label>
              <input
                type="number"
                value={sofascoreId}
                onChange={e => setSofascoreId(e.target.value)}
                placeholder="ex: 12345678"
                className={inputCls}
              />
              <p className="text-xs text-gray-600 mt-1">
                Encontre o ID na URL do SofaScore: sofascore.com/jogo/.../[ID]
              </p>
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
              Salvar Partida
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
