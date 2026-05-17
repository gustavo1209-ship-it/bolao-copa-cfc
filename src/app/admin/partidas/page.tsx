import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { StageBadge } from '@/components/stage-badge'
import { FlagImage } from '@/components/flag-image'
import { type Stage } from '@/types'
import { Plus, RefreshCw, CheckCircle, Clock, Play } from 'lucide-react'

export default async function AdminPartidasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  const statusIcon = {
    scheduled: <Clock size={14} className="text-gray-500" />,
    in_progress: <Play size={14} className="text-green-400" />,
    finished: <CheckCircle size={14} className="text-blue-400" />,
  }

  const statusLabel = {
    scheduled: 'Agendado',
    in_progress: 'Em andamento',
    finished: 'Finalizado',
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={true} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Partidas</h1>
            <p className="text-gray-400 text-sm mt-1">{matches?.length ?? 0} partidas cadastradas</p>
          </div>
          <Link
            href="/admin/partidas/nova"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Plus size={16} />
            Nova Partida
          </Link>
        </div>

        {matches && matches.length > 0 ? (
          <div className="space-y-2">
            {matches.map(m => (
              <div
                key={m.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Stage */}
                <div className="shrink-0">
                  <StageBadge stage={m.stage as Stage} />
                </div>

                {/* Teams */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FlagImage flag={m.home_team_flag} size={18} />
                    <span>{m.home_team}</span>
                    {m.status === 'finished' ? (
                      <span className="text-white font-bold">{m.home_score} – {m.away_score}</span>
                    ) : (
                      <span className="text-gray-500">vs</span>
                    )}
                    <span>{m.away_team}</span>
                    <FlagImage flag={m.away_team_flag} size={18} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(m.match_date).toLocaleDateString('pt-BR', {
                      weekday: 'short', day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit'
                    })}
                    {m.group_name && ` • Grupo ${m.group_name}`}
                    {m.sofascore_id && ` • SofaScore ID: ${m.sofascore_id}`}
                  </div>
                </div>

                {/* Status */}
                <div className="shrink-0 flex items-center gap-1.5 text-xs text-gray-400">
                  {statusIcon[m.status as keyof typeof statusIcon]}
                  {statusLabel[m.status as keyof typeof statusLabel]}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {m.sofascore_id && m.status !== 'finished' && (
                    <Link
                      href={`/admin/partidas/${m.id}?sync=1`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      <RefreshCw size={12} />
                      Sincronizar
                    </Link>
                  )}
                  <Link
                    href={`/admin/partidas/${m.id}`}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhuma partida cadastrada ainda.</p>
            <Link href="/admin/partidas/nova" className="text-orange-500 hover:text-orange-400 mt-2 block">
              Adicionar primeira partida →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
