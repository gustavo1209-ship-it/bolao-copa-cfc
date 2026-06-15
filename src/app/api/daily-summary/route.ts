export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)
  const yesterday = new Date(brtNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Rankings atual e de ontem
  const [{ data: current }, { data: snapshots }] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    supabase.from('standings_snapshots').select('user_id, rank, total_pts').eq('snapshot_date', yesterday),
  ])

  // Jogos finalizados hoje
  const { data: todayMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, home_team_flag, away_team_flag, home_score, away_score')
    .eq('status', 'finished')
    .gte('match_date', today + 'T00:00:00-03:00')
    .lte('match_date', today + 'T23:59:59-03:00')
    .order('match_date')

  const yesterdayMap = Object.fromEntries(
    (snapshots ?? []).map(s => [s.user_id, { rank: s.rank, total_pts: s.total_pts }])
  )

  const RANK_EMOJI = ['🥇', '🥈', '🥉']

  const dateLabel = brtNow.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  const lines: string[] = []
  lines.push(`🏆 *Bolão CFC – ${dateLabel}* 🏆`)
  lines.push('')
  lines.push('📊 *Classificação:*')
  lines.push('')

  for (const s of (current ?? [])) {
    const prev = yesterdayMap[s.id]
    const ptsGained = prev ? s.total_pts - prev.total_pts : 0
    const rankDiff = prev ? prev.rank - s.rank : 0 // positivo = subiu

    const rankEmoji = RANK_EMOJI[s.rank - 1] ?? `${s.rank}º`
    const ptsStr = ptsGained > 0 ? ` _(+${ptsGained} pts)_` : ptsGained < 0 ? ` _(${ptsGained} pts)_` : ''

    let movStr = ''
    if (!prev) movStr = ''
    else if (rankDiff > 0) movStr = ` ⬆️${rankDiff}`
    else if (rankDiff < 0) movStr = ` ⬇️${Math.abs(rankDiff)}`
    else movStr = ' ➡️'

    lines.push(`${rankEmoji} *${s.name}* · ${s.total_pts} pts${ptsStr}${movStr}`)
  }

  if (todayMatches && todayMatches.length > 0) {
    lines.push('')
    lines.push('⚽ *Jogos de hoje:*')
    lines.push('')
    for (const m of todayMatches) {
      lines.push(`${m.home_team_flag ?? ''} ${m.home_team} *${m.home_score}–${m.away_score}* ${m.away_team} ${m.away_team_flag ?? ''}`)
    }
  }

  const text = lines.join('\n')
  return NextResponse.json({ text, date: today })
}
