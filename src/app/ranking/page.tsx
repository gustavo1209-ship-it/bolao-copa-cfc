import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { RankingTable } from '@/components/ranking-table'
import { AutoRefresh } from '@/components/auto-refresh'
import { EvolutionChart } from '@/components/evolution-chart'
import { type Standing } from '@/types'
import { Trophy, TrendingUp } from 'lucide-react'
import { getImagePath } from '@/lib/participant-images'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  const { data: standings } = await supabase
    .from('standings')
    .select('*')
    .order('total_pts', { ascending: false })

  // Snapshot do último dia com resultados (para variação de ranking)
  const brtToday = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: prevSnapshotMeta } = await supabase
    .from('standings_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', brtToday)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const rankChanges: Record<string, number> = {}
  if (prevSnapshotMeta) {
    const { data: snapshots } = await supabase
      .from('standings_snapshots')
      .select('user_id, rank')
      .eq('snapshot_date', prevSnapshotMeta.snapshot_date)

    for (const s of (standings ?? [])) {
      const snap = snapshots?.find(sn => sn.user_id === s.id)
      if (snap) rankChanges[s.id] = snap.rank - Number(s.rank)
    }
  }

  // Verifica se há partidas ativas (em andamento ou que deveriam ter começado há até 3h)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data: activeMatches } = await supabase
    .from('matches')
    .select('id')
    .or(`status.eq.in_progress,and(status.eq.scheduled,match_date.gte.${threeHoursAgo},match_date.lte.${new Date().toISOString()})`)
    .limit(1)
  const hasActiveMatches = (activeMatches?.length ?? 0) > 0

  return (
    <div className="min-h-screen">
      {hasActiveMatches && <AutoRefresh intervalMs={60_000} />}
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-orange-500/20 rounded-xl">
            <Trophy size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Classificação Geral</h1>
            <p className="text-gray-400 text-sm">Copa do Mundo 2026 – Bolão CFC</p>
          </div>
        </div>

        {/* Pódio top 3 */}
        {standings && standings.length >= 3 && (() => {
          const total = standings.length
          const podiumOrder = [standings[1], standings[0], standings[2]]
          const medals = ['🥈', '🥇', '🥉']
          const heights = ['h-24', 'h-32', 'h-20']
          const blockColors = ['border-gray-400', 'border-yellow-400', 'border-amber-600']
          const ringColors = ['border-gray-400', 'border-yellow-400', 'border-amber-600']
          const photoSizes = [68, 80, 68] // 2º menor, 1º maior, 3º menor
          const positions = ['2º', '1º', '3º']
          return (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {podiumOrder.map((s, i) => {
                if (!s) return null
                const imgSrc = getImagePath(s.name, Number(s.rank), total)
                const sz = photoSizes[i]
                return (
                  <div key={s.id} className="flex flex-col items-center justify-end">
                    <div className="text-center mb-2">
                      {imgSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc}
                          alt={s.name}
                          width={sz}
                          height={sz}
                          className={`rounded-full object-cover mx-auto mb-2 border-4 ${ringColors[i]}`}
                          style={{ width: sz, height: sz }}
                        />
                      )}
                      <div className="text-2xl mb-1">{medals[i]}</div>
                      <div className={`text-sm font-bold ${s.id === user?.id ? 'text-orange-400' : 'text-white'}`}>
                        {s.name.split(' ')[0]}
                      </div>
                      <div className="text-orange-500 font-bold">{s.total_pts} pts</div>
                    </div>
                    <div className={`w-full ${heights[i]} bg-gray-800 rounded-t-xl border-t-2 ${blockColors[i]} flex items-center justify-center`}>
                      <span className="text-gray-500 text-sm">{positions[i]}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="grid grid-cols-5 w-full text-xs text-gray-500 px-2 pb-2 border-b border-gray-800">
              <span>#</span>
              <span className="col-span-2">Participante</span>
              <span className="text-center">Pontos</span>
              <span className="text-center hidden sm:block">Exatos / Acertos</span>
            </div>
          </div>
          <RankingTable standings={(standings as Standing[]) ?? []} currentUserId={user?.id} rankChanges={rankChanges} totalParticipants={standings?.length} />
        </div>

        {/* Gráfico de evolução */}
        <div className="mt-8 bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <TrendingUp size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Evolução da Classificação</h3>
              <p className="text-gray-500 text-xs mt-0.5">Posição por dia com jogos</p>
            </div>
          </div>
          <EvolutionChart />
        </div>

        {/* Legenda de pontuação */}
        <div className="mt-4 bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
          <h3 className="font-semibold text-sm text-gray-400 mb-3">Como funciona a pontuação</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• <span className="text-blue-400">Acertou o resultado</span> (V/E/D): +3 pts × multiplicador da fase</p>
            <p>• <span className="text-green-400">Acertou os gols de cada time</span>: +1 pt cada × multiplicador</p>
            <p>• <span className="text-orange-400">Placar exato</span>: +3 pts extras × multiplicador</p>
            <p className="text-gray-600 mt-2">Multiplicadores: Grupos ×1 → Rodada 32 ×2 → Oitavas ×3 → Quartas ×4 → Semis ×5 → 3º ×4 → Final ×6</p>
          </div>
        </div>
      </div>
    </div>
  )
}
