export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)
  const tomorrow = new Date(brtNow.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const toBrtDate = (iso: string) =>
    new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [
    { data: current },
    { data: tomorrowMatches },
    { data: profiles },
    { data: allFinishedMatches },
    { data: allPredictions },
  ] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    supabase.from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', tomorrow + 'T00:00:00-03:00')
      .lte('match_date', tomorrow + 'T23:59:59-03:00')
      .order('match_date'),
    supabase.from('profiles').select('id, name'),
    supabase.from('matches').select('id, match_date').eq('status', 'finished').order('match_date'),
    supabase.from('predictions').select('user_id, match_id, pts_total'),
  ])

  // Mesma lógica do gráfico de evolução: pontos por dia → cumulativos → delta entre últimos 2 pontos
  const matchDateMap: Record<string, string> = {}
  for (const m of (allFinishedMatches ?? [])) {
    matchDateMap[m.id] = toBrtDate(m.match_date)
  }
  const gameDays = [...new Set(Object.values(matchDateMap))].sort()

  const dailyPts: Record<string, Record<string, number>> = {}
  for (const pred of (allPredictions ?? [])) {
    const date = matchDateMap[pred.match_id]
    if (!date) continue
    if (!dailyPts[pred.user_id]) dailyPts[pred.user_id] = {}
    dailyPts[pred.user_id][date] = (dailyPts[pred.user_id][date] ?? 0) + (pred.pts_total ?? 0)
  }

  const userIds = (current ?? []).map(s => s.id)
  const cumPts: Record<string, Record<string, number>> = {}
  for (const userId of userIds) {
    cumPts[userId] = {}
    let running = 0
    for (const day of gameDays) {
      running += dailyPts[userId]?.[day] ?? 0
      cumPts[userId][day] = running
    }
  }

  const lastDay = gameDays[gameDays.length - 1] ?? null
  const prevDay = gameDays[gameDays.length - 2] ?? null

  // Delta entre o último e o penúltimo ponto do gráfico
  const lastDayPtsByUser: Record<string, number> = {}
  for (const userId of userIds) {
    const cur = lastDay ? (cumPts[userId]?.[lastDay] ?? 0) : 0
    const prev = prevDay ? (cumPts[userId]?.[prevDay] ?? 0) : 0
    lastDayPtsByUser[userId] = cur - prev
  }

  // Rank no penúltimo ponto do gráfico (equivalente ao "antes de ontem")
  const sortedByPrev = [...userIds].sort(
    (a, b) => (prevDay ? (cumPts[b]?.[prevDay] ?? 0) : 0) - (prevDay ? (cumPts[a]?.[prevDay] ?? 0) : 0)
  )
  const prevRankMap: Record<string, number> = {}
  sortedByPrev.forEach((userId, i) => { prevRankMap[userId] = i + 1 })

  // Participantes sem palpites para pelo menos um jogo de amanhã
  const missingNames: string[] = []
  if (tomorrowMatches?.length && profiles?.length) {
    const matchIds = tomorrowMatches.map(m => m.id)
    const { data: existingPreds } = await supabase
      .from('predictions')
      .select('user_id, match_id')
      .in('match_id', matchIds)

    for (const p of profiles) {
      const missing = tomorrowMatches.some(
        m => !existingPreds?.find(pr => pr.user_id === p.id && pr.match_id === m.id)
      )
      if (missing) missingNames.push(p.name.split(' ')[0])
    }
  }

  const RANK_EMOJI = ['🥇', '🥈', '🥉']
  const dateLabel = brtNow.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  const lines: string[] = []

  if (missingNames.length > 0) {
    const tomorrowLabel = new Date(tomorrow + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit',
    })
    lines.push(`⚠️ *Sem palpites para ${tomorrowLabel}:*`)
    for (const name of missingNames) lines.push(`❌ ${name}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push(`🏆 *Bolão CFC – ${dateLabel}* 🏆`)
  lines.push('')
  lines.push('📊 *Classificação:*')
  lines.push('')

  for (const s of (current ?? [])) {
    const prevRank = prevRankMap[s.id]
    const ptsGained = lastDayPtsByUser[s.id] ?? 0
    const rankDiff = prevRank != null ? prevRank - Number(s.rank) : null

    const rankEmoji = RANK_EMOJI[s.rank - 1] ?? `${s.rank}º`
    const ptsStr = ptsGained > 0 ? ` _(+${ptsGained} pts)_` : ''
    let movStr = ''
    if (rankDiff == null) movStr = ''
    else if (rankDiff > 0) movStr = ` ⬆️${rankDiff}`
    else if (rankDiff < 0) movStr = ` ⬇️${Math.abs(rankDiff)}`
    else movStr = ' ➡️'

    lines.push(`${rankEmoji} *${s.name}* · ${s.total_pts} pts${ptsStr}${movStr}`)
  }

  // Jogos do último dia com partidas finalizadas
  if (lastDay) {
    const { data: lastDayMatchResults } = await supabase
      .from('matches')
      .select('home_team, away_team, home_team_flag, away_team_flag, home_score, away_score')
      .eq('status', 'finished')
      .gte('match_date', lastDay + 'T00:00:00-03:00')
      .lte('match_date', lastDay + 'T23:59:59-03:00')
      .order('match_date')

    if (lastDayMatchResults && lastDayMatchResults.length > 0) {
      const lastDayLabel = lastDay === today
        ? 'hoje'
        : new Date(lastDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      lines.push('')
      lines.push(`⚽ *Jogos de ${lastDayLabel}:*`)
      lines.push('')
      for (const m of lastDayMatchResults) {
        lines.push(`${m.home_team_flag ?? ''} ${m.home_team} *${m.home_score}–${m.away_score}* ${m.away_team} ${m.away_team_flag ?? ''}`)
      }
    }
  }

  const text = lines.join('\n')
  return NextResponse.json({ text, date: today, missingCount: missingNames.length })
}
