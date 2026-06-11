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

  // Buscar partidas finalizadas que tenham palpites ainda sem pontuação
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, stage, home_score, away_score')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!matches?.length) {
    return NextResponse.json({ calculated: 0, message: 'Nenhuma partida finalizada encontrada' })
  }

  let calculated = 0
  let skipped = 0

  for (const match of matches) {
    // Buscar palpites não calculados desta partida (pts_total = 0 mas pode ter acertado)
    // Recalcula todos para garantir consistência
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, home_score_prediction, away_score_prediction, pts_total')
      .eq('match_id', match.id)

    if (!predictions?.length) { skipped++; continue }

    // Verifica se algum palpite ainda está com pts_total = 0 (não calculado)
    const needsCalc = predictions.some(p => p.pts_total === 0)
    if (!needsCalc) { skipped++; continue }

    for (const pred of predictions) {
      const breakdown = calculatePoints({
        homePrediction: pred.home_score_prediction,
        awayPrediction: pred.away_score_prediction,
        homeActual: match.home_score as number,
        awayActual: match.away_score as number,
        stage: match.stage as Stage,
      })

      await supabase.from('predictions').update({
        pts_result: breakdown.ptsResult,
        pts_home_goals: breakdown.ptsHomeGoals,
        pts_away_goals: breakdown.ptsAwayGoals,
        pts_exact_bonus: breakdown.ptsExactBonus,
        pts_total: breakdown.ptsTotal,
        updated_at: new Date().toISOString(),
      }).eq('id', pred.id)
    }

    calculated++
  }

  return NextResponse.json({
    calculated,
    skipped,
    total: matches.length,
    message: `${calculated} partida(s) com pontos recalculados`,
  })
}
