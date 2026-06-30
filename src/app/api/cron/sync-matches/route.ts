export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculatePoints } from '@/lib/scoring'
import { type Stage } from '@/types'

// Mapeamento PT-BR (nosso banco) → EN (ESPN)
const ESPN_NAMES: Record<string, string> = {
  'México': 'Mexico',
  'África do Sul': 'South Africa',
  'Coreia do Sul': 'South Korea',
  'República Tcheca': 'Czech Republic',
  'Canadá': 'Canada',
  'Bósnia-Herzegovina': 'Bosnia-Herzegovina',
  'Catar': 'Qatar',
  'Suíça': 'Switzerland',
  'Brasil': 'Brazil',
  'Marrocos': 'Morocco',
  'Haiti': 'Haiti',
  'Escócia': 'Scotland',
  'Estados Unidos': 'United States',
  'Paraguai': 'Paraguay',
  'Austrália': 'Australia',
  'Turquia': 'Turkey',
  'Alemanha': 'Germany',
  'Curaçao': 'Curaçao',
  'Costa do Marfim': 'Ivory Coast',
  'Equador': 'Ecuador',
  'Holanda': 'Netherlands',
  'Japão': 'Japan',
  'Suécia': 'Sweden',
  'Tunísia': 'Tunisia',
  'Bélgica': 'Belgium',
  'Egito': 'Egypt',
  'Irã': 'Iran',
  'Nova Zelândia': 'New Zealand',
  'Espanha': 'Spain',
  'Cabo Verde': 'Cape Verde',
  'Arábia Saudita': 'Saudi Arabia',
  'Uruguai': 'Uruguay',
  'França': 'France',
  'Senegal': 'Senegal',
  'Iraque': 'Iraq',
  'Noruega': 'Norway',
  'Argentina': 'Argentina',
  'Argélia': 'Algeria',
  'Áustria': 'Austria',
  'Jordânia': 'Jordan',
  'Portugal': 'Portugal',
  'Congo (RD)': 'DR Congo',
  'Uzbequistão': 'Uzbekistan',
  'Colômbia': 'Colombia',
  'Inglaterra': 'England',
  'Croácia': 'Croatia',
  'Gana': 'Ghana',
  'Panamá': 'Panama',
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function teamMatches(dbName: string, espnName: string): boolean {
  const en = ESPN_NAMES[dbName] ?? dbName
  return norm(en) === norm(espnName)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const synced: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  // Partidas que já iniciaram há pelo menos 85min, não finalizadas
  const cutoff = new Date(Date.now() - 85 * 60 * 1000).toISOString()
  const { data: pending } = await supabase
    .from('matches')
    .select('id, stage, home_team, away_team, match_date, penalty_winner')
    .neq('status', 'finished')
    .lt('match_date', cutoff)

  // Agrupar por data para minimizar chamadas à ESPN
  const byDate: Record<string, typeof pending> = {}
  for (const m of (pending ?? [])) {
    const d = new Date(m.match_date).toISOString().slice(0, 10).replace(/-/g, '')
    if (!byDate[d]) byDate[d] = []
    byDate[d]!.push(m)
  }

  for (const [dateStr, matches] of Object.entries(byDate)) {
    let espnEvents: unknown[]
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        for (const m of matches!) errors.push(`${m!.home_team} vs ${m!.away_team}: ESPN HTTP ${res.status}`)
        continue
      }
      const data = await res.json() as { events?: unknown[] }
      espnEvents = data.events ?? []
    } catch (e) {
      for (const m of matches!) errors.push(`${m!.home_team} vs ${m!.away_team}: ${String(e)}`)
      continue
    }

    for (const match of matches!) {
      // Localizar o evento ESPN correspondente
      const event = (espnEvents as Array<{
        status: { type: { state: string; completed: boolean } }
        competitions: Array<{
          competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>
        }>
      }>).find(ev => {
        const comps = ev.competitions?.[0]?.competitors ?? []
        const home = comps.find(c => c.homeAway === 'home')
        const away = comps.find(c => c.homeAway === 'away')
        return (
          home && away &&
          teamMatches(match!.home_team, home.team.displayName) &&
          teamMatches(match!.away_team, away.team.displayName)
        )
      })

      if (!event) {
        skipped.push(`${match!.home_team} vs ${match!.away_team}: não encontrado na ESPN`)
        continue
      }

      if (!event.status.type.completed) {
        skipped.push(`${match!.home_team} vs ${match!.away_team}: jogo em andamento`)
        continue
      }

      const comps = event.competitions[0].competitors
      const homeComp = comps.find(c => c.homeAway === 'home')!
      const awayComp = comps.find(c => c.homeAway === 'away')!
      const homeScore = parseInt(homeComp.score)
      const awayScore = parseInt(awayComp.score)

      if (isNaN(homeScore) || isNaN(awayScore)) {
        errors.push(`${match!.home_team} vs ${match!.away_team}: placar inválido`)
        continue
      }

      await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'finished',
      }).eq('id', match!.id)

      const { data: preds } = await supabase
        .from('predictions')
        .select('id, home_score_prediction, away_score_prediction, penalty_winner_prediction')
        .eq('match_id', match!.id)

      for (const pred of (preds ?? [])) {
        const pts = calculatePoints({
          homePrediction: pred.home_score_prediction,
          awayPrediction: pred.away_score_prediction,
          homeActual: homeScore,
          awayActual: awayScore,
          stage: match!.stage as Stage,
          penaltyWinnerPrediction: pred.penalty_winner_prediction,
          penaltyWinnerActual: match!.penalty_winner ?? null,
        })
        await supabase.from('predictions').update({
          pts_result: pts.ptsResult,
          pts_home_goals: pts.ptsHomeGoals,
          pts_away_goals: pts.ptsAwayGoals,
          pts_exact_bonus: pts.ptsExactBonus,
          pts_penalty_winner: pts.ptsPenaltyWinner,
          pts_total: pts.ptsTotal,
          updated_at: new Date().toISOString(),
        }).eq('id', pred.id)
      }

      synced.push(`${match!.home_team} vs ${match!.away_team} (${homeScore}–${awayScore})`)
    }
  }

  // Fallback: recalcular palpites zerados de partidas já finalizadas
  let recalculated = 0
  const { data: finished } = await supabase
    .from('matches')
    .select('id, stage, home_score, away_score, penalty_winner')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  for (const match of (finished ?? [])) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, home_score_prediction, away_score_prediction, pts_total, penalty_winner_prediction, pts_penalty_winner')
      .eq('match_id', match.id)

    if (!preds?.length) continue

    const hasMissingPts = preds.some(p => p.pts_total === 0)
    const hasMissingPenaltyPts = match.penalty_winner != null && preds.some(p =>
      p.penalty_winner_prediction === match.penalty_winner && p.pts_penalty_winner === 0
    )
    if (!hasMissingPts && !hasMissingPenaltyPts) continue

    for (const pred of preds) {
      const pts = calculatePoints({
        homePrediction: pred.home_score_prediction,
        awayPrediction: pred.away_score_prediction,
        homeActual: match.home_score as number,
        awayActual: match.away_score as number,
        stage: match.stage as Stage,
        penaltyWinnerPrediction: pred.penalty_winner_prediction,
        penaltyWinnerActual: match.penalty_winner ?? null,
      })
      await supabase.from('predictions').update({
        pts_result: pts.ptsResult,
        pts_home_goals: pts.ptsHomeGoals,
        pts_away_goals: pts.ptsAwayGoals,
        pts_exact_bonus: pts.ptsExactBonus,
        pts_penalty_winner: pts.ptsPenaltyWinner,
        pts_total: pts.ptsTotal,
        updated_at: new Date().toISOString(),
      }).eq('id', pred.id)
    }
    recalculated++
  }

  // Salvar snapshot diário das standings (hora de Brasília)
  const brtDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: currentStandings } = await supabase
    .from('standings')
    .select('id, total_pts, rank')

  for (const s of (currentStandings ?? [])) {
    await supabase.from('standings_snapshots').upsert({
      user_id: s.id,
      snapshot_date: brtDate,
      rank: s.rank,
      total_pts: s.total_pts,
    }, { onConflict: 'user_id,snapshot_date' })
  }

  return NextResponse.json({
    synced,
    skipped,
    errors,
    recalculated,
    snapshot_date: brtDate,
    message: `${synced.length} sincronizada(s) via ESPN | ${recalculated} recalculada(s) | ${errors.length} erro(s)`,
  })
}
