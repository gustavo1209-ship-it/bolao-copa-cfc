import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { PalpitesInline } from '@/components/palpites-inline'
import { type Match } from '@/types'

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

  // Mapear palpites por match_id para passar ao client component
  const predMap: Record<string, { home: number; away: number; pts_total: number }> = {}
  for (const p of myPredictions ?? []) {
    predMap[p.match_id] = {
      home: p.home_score_prediction,
      away: p.away_score_prediction,
      pts_total: p.pts_total,
    }
  }

  const total = matches?.length ?? 0
  const done = myPredictions?.length ?? 0

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Palpites</h1>
            <p className="text-gray-400 text-sm mt-1">
              Ajuste o placar e clique em <strong className="text-white">Salvar</strong> em cada jogo
            </p>
          </div>
          {total > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-500">{done}<span className="text-gray-600 text-lg">/{total}</span></div>
              <div className="text-xs text-gray-500">palpites feitos</div>
              {/* Barra de progresso */}
              <div className="mt-1 w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <PalpitesInline
          matches={(matches ?? []) as Match[]}
          initialPredictions={predMap}
          userId={user.id}
        />
      </div>
    </div>
  )
}
