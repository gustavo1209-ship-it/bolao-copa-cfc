export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculatePoints } from '@/lib/scoring'
import { type Stage } from '@/types'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const synced: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  // Partidas que já iniciaram há pelo menos 85min, não estão finalizadas e têm ID SofaScore
  const cutoff = new Date(Date.now() - 85 * 60 * 1000).toISOString()
  const { data: pending } = await supabase
    .from('matches')
    .select('id, sofascore_id, stage, home_team, away_team')
    .neq('status', 'finished')
    .not('sofascore_id', 'is', null)
    .lt('match_date', cutoff)

  for (const match of (pending ?? [])) {
    try {
      const sfRes = await fetch(
        `https://api.sofascore.com/api/v1/event/${match.sofascore_id}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
            'Referer': 'https://www.sofascore.com/',
            'Origin': 'https://www.sofascore.com',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
        }
      )

      if (!sfRes.ok) {
        errors.push(`${match.home_team} vs ${match.away_team}: HTTP ${sfRes.status}`)
        continue
      }

      const sfData = await sfRes.json()
      const event = sfData?.event
      if (!event) continue

      if (event.status?.type !== 'finished') {
        skipped.push(`${match.home_team} vs ${match.away_team}: ${event.status?.description ?? 'em andamento'}`)
        continue
      }

      const homeScore = event.homeScore?.current
      const awayScore = event.awayScore?.current
      if (homeScore === undefined || awayScore === undefined) continue

      // Atualizar placar e status da partida
      await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'finished',
      }).eq('id', match.id)

      // Calcular pontos de todos os palpites desta partida
      const { data: preds } = await supabase
        .from('predictions')
        .select('id, home_score_prediction, away_score_prediction')
        .eq('match_id', match.id)

      for (const pred of (preds ?? [])) {
        const pts = calculatePoints({
          homePrediction: pred.home_score_prediction,
          awayPrediction: pred.away_score_prediction,
          homeActual: homeScore,
          awayActual: awayScore,
          stage: match.stage as Stage,
        })
        await supabase.from('predictions').update({
          pts_result: pts.ptsResult,
          pts_home_goals: pts.ptsHomeGoals,
          pts_away_goals: pts.ptsAwayGoals,
          pts_exact_bonus: pts.ptsExactBonus,
          pts_total: pts.ptsTotal,
          updated_at: new Date().toISOString(),
        }).eq('id', pred.id)
      }

      synced.push(`${match.home_team} vs ${match.away_team} (${homeScore}–${awayScore})`)
    } catch (e) {
      errors.push(`${match.home_team} vs ${match.away_team}: ${String(e)}`)
    }
  }

  // Fallback: recalcular pontos de partidas já finalizadas com palpites zerados
  let recalculated = 0
  const { data: finished } = await supabase
    .from('matches')
    .select('id, stage, home_score, away_score')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  for (const match of (finished ?? [])) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, home_score_prediction, away_score_prediction, pts_total')
      .eq('match_id', match.id)

    if (!preds?.length) continue
    if (!preds.some(p => p.pts_total === 0)) continue

    for (const pred of preds) {
      const pts = calculatePoints({
        homePrediction: pred.home_score_prediction,
        awayPrediction: pred.away_score_prediction,
        homeActual: match.home_score as number,
        awayActual: match.away_score as number,
        stage: match.stage as Stage,
      })
      await supabase.from('predictions').update({
        pts_result: pts.ptsResult,
        pts_home_goals: pts.ptsHomeGoals,
        pts_away_goals: pts.ptsAwayGoals,
        pts_exact_bonus: pts.ptsExactBonus,
        pts_total: pts.ptsTotal,
        updated_at: new Date().toISOString(),
      }).eq('id', pred.id)
    }
    recalculated++
  }

  return NextResponse.json({
    synced,
    skipped,
    errors,
    recalculated,
    message: `${synced.length} sincronizada(s) do SofaScore | ${recalculated} recalculada(s) | ${errors.length} erro(s)`,
  })
}
