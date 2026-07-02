import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { fetchEspnEvents, TEAM_EN_TO_PT } from '@/lib/espn'
import { type Stage } from '@/types'

// Faixa de datas cobrindo o torneio inteiro (fase de grupos até a final)
const TOURNAMENT_RANGE = '20260611-20260719'

// stage do nosso banco -> season.slug retornado pela ESPN
const STAGE_TO_ESPN_SLUG: Record<Stage, string> = {
  group: 'group-stage',
  round_of_32: 'round-of-32',
  round_of_16: 'round-of-16',
  quarterfinal: 'quarterfinals',
  semifinal: 'semifinals',
  third_place: '3rd-place-match',
  final: 'final',
}

// A ESPN nomeia confrontos ainda não definidos como "Round of 32 11 Winner", "Semifinal 1 Loser" etc.
function isPlaceholder(name: string) {
  return /\b(Winner|Loser)\b/.test(name)
}

export async function POST() {
  // Auth — apenas admin
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await authClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const supabase = createServiceClient()

  let events: Awaited<ReturnType<typeof fetchEspnEvents>>
  try {
    events = await fetchEspnEvents(TOURNAMENT_RANGE)
  } catch (e) {
    return NextResponse.json({ error: `Erro ao buscar ESPN: ${String(e)}` }, { status: 502 })
  }

  // Buscar partidas do banco que ainda têm algum TBD
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, stage')
    .neq('status', 'finished')
    .or('home_team.eq.TBD,away_team.eq.TBD')

  const updated: string[] = []
  const skipped: string[] = []

  // As datas cadastradas para fases futuras são placeholders aproximados e não
  // batem com o calendário real da ESPN, então casamos por posição cronológica
  // dentro de cada fase (1º jogo da fase no banco = 1º jogo da fase na ESPN).
  const byStage: Record<string, typeof dbMatches> = {}
  for (const m of dbMatches ?? []) {
    (byStage[m.stage] ??= []).push(m)
  }

  for (const [stage, matches] of Object.entries(byStage)) {
    const slug = STAGE_TO_ESPN_SLUG[stage as Stage]
    const stageEvents = events
      .filter(e => e.season?.slug === slug)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))

    const sortedDb = matches!.slice().sort((a, b) =>
      new Date(a!.match_date).getTime() - new Date(b!.match_date).getTime()
    )

    for (let i = 0; i < sortedDb.length; i++) {
      const dbMatch = sortedDb[i]!
      const ev = stageEvents[i]

      if (!ev) {
        skipped.push(`${dbMatch.home_team} vs ${dbMatch.away_team}: sem jogo correspondente na ESPN`)
        continue
      }

      const comps = ev.competitions[0]!.competitors
      const home = comps.find(c => c.homeAway === 'home')!
      const away = comps.find(c => c.homeAway === 'away')!
      const homeReady = !isPlaceholder(home.team.displayName)
      const awayReady = !isPlaceholder(away.team.displayName)

      if (!homeReady && !awayReady) {
        skipped.push(`${dbMatch.home_team} vs ${dbMatch.away_team}: ainda indefinido na ESPN`)
        continue
      }

      const update: Record<string, unknown> = {
        sofascore_id: parseInt(ev.id),
        match_date: ev.date,
      }

      if (dbMatch.home_team === 'TBD' && homeReady) {
        const map = TEAM_EN_TO_PT[home.team.displayName]
        if (map) { update.home_team = map.name; update.home_team_flag = map.flag }
      }
      if (dbMatch.away_team === 'TBD' && awayReady) {
        const map = TEAM_EN_TO_PT[away.team.displayName]
        if (map) { update.away_team = map.name; update.away_team_flag = map.flag }
      }

      await supabase.from('matches').update(update).eq('id', dbMatch.id)
      updated.push(
        `${update.home_team ?? dbMatch.home_team} vs ${update.away_team ?? dbMatch.away_team}`
      )
    }
  }

  return NextResponse.json({
    updated,
    skipped,
    message: `${updated.length} atualizada(s) | ${skipped.length} ignorada(s)`,
  })
}
