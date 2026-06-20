import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { RankingTable } from '@/components/ranking-table'
import { FlagImage } from '@/components/flag-image'
import { EvolutionChart } from '@/components/evolution-chart'
import { type Standing } from '@/types'
import { Trophy, Zap, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'

export default async function HomePage() {
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
    .limit(5)

  const { data: nextMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .order('match_date', { ascending: true })
    .limit(3)

  const { data: recentResults } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .order('match_date', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={profile?.is_admin} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-medium mb-6">
              <Zap size={14} />
              Copa do Mundo 2026
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Bolão{' '}
              <span className="text-orange-500">CFC</span>
              <br />
              <span className="text-gray-400">Copa 2026</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto lg:mx-0">
              Faça seus palpites, acumule pontos e dispute o título com a galera do CFC!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              {user ? (
                <>
                  <Link
                    href="/palpites"
                    className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar size={18} />
                    Fazer Palpites
                  </Link>
                  <Link
                    href="/ranking"
                    className="px-6 py-3 rounded-xl border border-gray-700 hover:border-orange-500/50 text-gray-300 hover:text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trophy size={18} />
                    Ver Ranking
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
                  >
                    Participar do Bolão
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-medium transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative w-full max-w-sm lg:max-w-md">
            <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl" />
            <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500/30">
              <Image
                src="/grupo-cfc.jpg"
                alt="Turma do CFC"
                width={480}
                height={360}
                className="w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-800 bg-gray-900/40">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-orange-500">104</div>
            <div className="text-sm text-gray-500 mt-1">Jogos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-500">48</div>
            <div className="text-sm text-gray-500 mt-1">Seleções</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-500">20</div>
            <div className="text-sm text-gray-500 mt-1">Vagas</div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">

        {/* 1. Classificação */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Trophy size={20} className="text-orange-500" />
              Classificação
            </h2>
            <Link href="/ranking" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
              Ver tudo →
            </Link>
          </div>
          <RankingTable standings={(standings as Standing[]) ?? []} currentUserId={user?.id} limit={5} />
          {(!standings || standings.length === 0) && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Seja o primeiro a fazer um palpite!
            </p>
          )}
        </div>

        {/* 2. Gráfico de evolução */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <TrendingUp size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Evolução da Classificação</h2>
              <p className="text-gray-500 text-xs mt-0.5">Posição por dia com jogos</p>
            </div>
          </div>
          <EvolutionChart />
        </div>

        {/* 3. Próximos jogos */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar size={20} className="text-orange-500" />
              Próximos Jogos
            </h2>
            <Link href="/palpites" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
              Ver todos →
            </Link>
          </div>
          {nextMatches && nextMatches.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nextMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/palpites/${m.id}`}
                  className="block p-4 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-orange-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(m.match_date).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {m.group_name && (
                      <span className="text-xs text-gray-500">Grupo {m.group_name}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <FlagImage flag={m.home_team_flag} size={20} />
                      <span className="text-sm font-medium">{m.home_team}</span>
                    </div>
                    <span className="text-xs text-gray-500 px-2">vs</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-sm font-medium">{m.away_team}</span>
                      <FlagImage flag={m.away_team_flag} size={20} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum jogo agendado ainda.</p>
            </div>
          )}
        </div>

        {/* 4. Últimos Resultados */}
        {recentResults && recentResults.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-500" />
                Últimos Resultados
              </h2>
              <Link href="/palpites" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                Ver palpites →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentResults.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-medium text-white truncate text-right">{m.home_team}</span>
                    <FlagImage flag={m.home_team_flag} size={22} className="shrink-0" />
                  </div>
                  <div className="shrink-0 text-center">
                    <div className="text-base font-bold text-white whitespace-nowrap">
                      {m.home_score} – {m.away_score}
                    </div>
                    {m.group_name && (
                      <div className="text-xs text-gray-500 mt-0.5">Grupo {m.group_name}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <FlagImage flag={m.away_team_flag} size={22} className="shrink-0" />
                    <span className="text-sm font-medium text-white truncate">{m.away_team}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Sistema de Pontuação */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Zap size={20} className="text-orange-500" />
            Sistema de Pontuação
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Acertou o resultado', pts: '+3 pts', color: 'text-blue-400', sub: 'Vitória / Empate / Derrota' },
              { label: 'Gols do time da casa', pts: '+1 pt', color: 'text-green-400', sub: 'Número exato de gols' },
              { label: 'Gols do visitante', pts: '+1 pt', color: 'text-green-400', sub: 'Número exato de gols' },
              { label: 'Placar exato', pts: '+3 pts', color: 'text-orange-400', sub: 'Bônus por acertar tudo' },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
                <div className={`text-xl font-bold mb-1 ${item.color}`}>{item.pts}</div>
                <div className="text-sm font-medium text-white mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-orange-500/10 rounded-xl border border-orange-500/20 p-4">
            <p className="text-sm text-orange-300 font-medium mb-2">⚡ Multiplicadores por fase</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { label: 'Grupos', mult: '×1' },
                { label: 'Rod. 32', mult: '×2' },
                { label: 'Oitavas', mult: '×3' },
                { label: 'Quartas', mult: '×4' },
                { label: 'Semis', mult: '×5' },
                { label: '3º Lugar', mult: '×4' },
                { label: 'Final', mult: '×6' },
              ].map(item => (
                <span key={item.label} className="px-2 py-1 bg-orange-500/20 rounded text-orange-300">
                  {item.label} <strong>{item.mult}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      <footer className="border-t border-gray-800 mt-8 py-8 text-center text-gray-600 text-sm">
        <p>⚽ Bolão CFC Copa 2026 · Feito com 🧡 pela turma</p>
      </footer>
    </div>
  )
}
