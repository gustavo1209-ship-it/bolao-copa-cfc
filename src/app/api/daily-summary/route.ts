export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Converte ISO UTC para objeto Date representando o horário BRT
const toBrt = (iso: string) => new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = toBrt(new Date().toISOString())
  const today = brtNow.toISOString().slice(0, 10)
  const yesterday = new Date(brtNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tomorrow = new Date(brtNow.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [
    { data: current },
    { data: tomorrowMatches },
    { data: profiles },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    supabase.from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', tomorrow + 'T03:00:00Z')   // amanhã 00:00 BRT em UTC
      .lte('match_date', tomorrow + 'T26:59:59Z')   // amanhã 23:59 BRT em UTC
      .order('match_date'),
    supabase.from('profiles').select('id, name'),
    // Busca últimos 5 dias em UTC para filtrar em JS
    supabase.from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, home_score, away_score, match_date')
      .eq('status', 'finished')
      .gte('match_date', new Date(brtNow.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString())
      .order('match_date'),
  ])

  // Filtra em JS: data BRT = ontem, OU data BRT = hoje com hora < 06:00 (jogos de madrugada)
  const sessionMatches = (recentRaw ?? []).filter(m => {
    const brt = toBrt(m.match_date)
    const brtDate = brt.toISOString().slice(0, 10)
    const brtHour = brt.getUTCHours()
    return brtDate === yesterday || (brtDate === today && brtHour < 6)
  })

  // Pontos da sessão de ontem por participante
  const sessionPtsByUser: Record<string, number> = {}
  const sessionMatchIds = sessionMatches.map(m => m.id)
  if (sessionMatchIds.length > 0) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, pts_total')
      .in('match_id', sessionMatchIds)
    for (const pred of (preds ?? [])) {
      sessionPtsByUser[pred.user_id] = (sessionPtsByUser[pred.user_id] ?? 0) + (pred.pts_total ?? 0)
    }
  }

  // Rank anterior = ordenar por (pts atual - pts de ontem)
  const prevPts: Record<string, number> = {}
  for (const s of (current ?? [])) {
    prevPts[s.id] = (s.total_pts ?? 0) - (sessionPtsByUser[s.id] ?? 0)
  }
  const sortedByPrev = [...(current ?? [])].sort((a, b) => (prevPts[b.id] ?? 0) - (prevPts[a.id] ?? 0))
  const prevRankMap: Record<string, number> = {}
  sortedByPrev.forEach((s, i) => { prevRankMap[s.id] = i + 1 })

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
    const tomorrowLabel = new Date(tomorrow + 'T15:00:00Z').toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
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
    const ptsGained = sessionPtsByUser[s.id] ?? 0
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

  // Jogos da sessão de ontem
  if (sessionMatches.length > 0) {
    const yesterdayLabel = toBrt(yesterday + 'T15:00:00Z').toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
    })
    lines.push('')
    lines.push(`⚽ *Jogos de ${yesterdayLabel}:*`)
    lines.push('')
    for (const m of sessionMatches) {
      lines.push(`${m.home_team_flag ?? ''} ${m.home_team} *${m.home_score}–${m.away_score}* ${m.away_team} ${m.away_team_flag ?? ''}`)
    }
  }

  const text = lines.join('\n')
  return NextResponse.json({ text, date: today, missingCount: missingNames.length })
}
