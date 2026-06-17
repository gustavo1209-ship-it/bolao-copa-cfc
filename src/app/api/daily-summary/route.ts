export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)
  const tomorrow = new Date(brtNow.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Snapshot mais recente antes de hoje (não necessariamente ontem)
  const { data: prevMeta } = await supabase
    .from('standings_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const prevDate = prevMeta?.snapshot_date ?? null

  const [
    { data: current },
    { data: snapshots },
    { data: tomorrowMatches },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    prevDate
      ? supabase.from('standings_snapshots').select('user_id, rank, total_pts').eq('snapshot_date', prevDate)
      : Promise.resolve({ data: [] }),
    supabase.from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', tomorrow + 'T00:00:00-03:00')
      .lte('match_date', tomorrow + 'T23:59:59-03:00')
      .order('match_date'),
    supabase.from('profiles').select('id, name'),
  ])

  // Jogos finalizados hoje
  const { data: todayMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, home_team_flag, away_team_flag, home_score, away_score')
    .eq('status', 'finished')
    .gte('match_date', today + 'T00:00:00-03:00')
    .lte('match_date', today + 'T23:59:59-03:00')
    .order('match_date')

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

  const yesterdayMap = Object.fromEntries(
    (snapshots ?? []).map(s => [s.user_id, { rank: s.rank, total_pts: s.total_pts }])
  )

  const RANK_EMOJI = ['🥇', '🥈', '🥉']
  const dateLabel = brtNow.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  const lines: string[] = []

  // Alerta de palpites faltando — no topo
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
    const prev = yesterdayMap[s.id]
    const ptsGained = prev ? s.total_pts - prev.total_pts : 0
    const rankDiff = prev ? prev.rank - s.rank : 0

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
  return NextResponse.json({ text, date: today, missingCount: missingNames.length })
}
