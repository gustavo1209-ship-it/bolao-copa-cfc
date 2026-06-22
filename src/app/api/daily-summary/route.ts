export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)
  const tomorrow = new Date(brtNow.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Último dia BRT que teve jogo finalizado
  const { data: lastFinished } = await supabase
    .from('matches')
    .select('match_date')
    .eq('status', 'finished')
    .order('match_date', { ascending: false })
    .limit(1)
    .single()

  const lastGameDay = lastFinished?.match_date
    ? new Date(new Date(lastFinished.match_date).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null

  const [
    { data: current },
    { data: tomorrowMatches },
    { data: profiles },
    { data: lastDayMatches },
  ] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    supabase.from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', tomorrow + 'T00:00:00-03:00')
      .lte('match_date', tomorrow + 'T23:59:59-03:00')
      .order('match_date'),
    supabase.from('profiles').select('id, name'),
    lastGameDay
      ? supabase.from('matches')
          .select('id')
          .eq('status', 'finished')
          .gte('match_date', lastGameDay + 'T00:00:00-03:00')
          .lte('match_date', lastGameDay + 'T23:59:59-03:00')
      : Promise.resolve({ data: [] as Array<{ id: string }> }),
  ])

  // Pontos ganhos calculados diretamente dos palpites do último dia com jogo
  const lastDayPtsByUser: Record<string, number> = {}
  const lastDayMatchIds = (lastDayMatches ?? []).map(m => m.id)
  if (lastDayMatchIds.length > 0) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, pts_total')
      .in('match_id', lastDayMatchIds)
    for (const pred of (preds ?? [])) {
      lastDayPtsByUser[pred.user_id] = (lastDayPtsByUser[pred.user_id] ?? 0) + (pred.pts_total ?? 0)
    }
  }

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

  // Rank anterior = reordenar por (pts_atual - pts_ultimo_dia)
  const prevPtsMap: Record<string, number> = {}
  for (const s of (current ?? [])) {
    prevPtsMap[s.id] = (s.total_pts ?? 0) - (lastDayPtsByUser[s.id] ?? 0)
  }
  const sortedByPrev = [...(current ?? [])].sort((a, b) => (prevPtsMap[b.id] ?? 0) - (prevPtsMap[a.id] ?? 0))
  const prevRankMap: Record<string, number> = {}
  sortedByPrev.forEach((s, i) => { prevRankMap[s.id] = i + 1 })

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

  // Jogos finalizados hoje
  const { data: todayMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, home_team_flag, away_team_flag, home_score, away_score')
    .eq('status', 'finished')
    .gte('match_date', today + 'T00:00:00-03:00')
    .lte('match_date', today + 'T23:59:59-03:00')
    .order('match_date')

  if (todayMatches && todayMatches.length > 0) {
    lines.push('')
    lines.push('⚽ *Jogos de hoje:*')
    lines.push('')
    for (const m of todayMatches) {
      lines.push(`${m.home_team_flag ?? ''} ${m.home_team} *${m.home_score}–${m.away_score}* ${m.away_team} ${m.away_team_flag ?? ''}`)
    }
  }

  const text = lines.join('\n')
  return NextResponse.json({ text, date: today, missingCount: missingNames.length })
}
