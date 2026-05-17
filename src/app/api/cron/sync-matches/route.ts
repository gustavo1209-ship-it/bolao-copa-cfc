import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculatePoints } from '@/lib/scoring'
import { type Stage } from '@/types'

// Copa do Mundo 2026 começa em 11 de junho (UTC-3 = 14:00 UTC)
const COPA_START = new Date('2026-06-11T14:00:00Z')

// Status do SofaScore → status interno
function mapSofaStatus(sfStatus: string): 'scheduled' | 'in_progress' | 'finished' {
  if (sfStatus === 'finished') return 'finished'
  if (['inprogress', 'halftime', '1sthalf', '2ndhalf', 'overtime', 'penalties'].includes(sfStatus))
    return 'in_progress'
  return 'scheduled'
}

export async function GET(request: Request) {
  // Verificar secret do cron (Vercel envia Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Só sincroniza após o início da Copa
  if (new Date() < COPA_START) {
    return NextResponse.json({ skipped: true, reason: 'Copa ainda não começou', startsAt: COPA_START })
  }

  const supabase = createServiceClient()

  // Buscar partidas que podem ter atualização:
  // - em andamento (in_progress)
  // - agendadas mas já passaram do horário de início (podem ter começado)
  const now = new Date().toISOString()
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, sofascore_id, stage, status, match_date')
    .or(`status.eq.in_progress,and(status.eq.scheduled,match_date.lte.${now})`)
    .not('sofascore_id', 'is', null)

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 })
  }

  if (!matches?.length) {
    return NextResponse.json({ synced: 0, message: 'Nenhuma partida para sincronizar agora' })
  }

  let synced = 0
  let errors = 0
  const details: string[] = []

  for (const match of matches) {
    try {
      const sfRes = await fetch(
        `https://api.sofascore.com/api/v1/event/${match.sofascore_id}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
            'Accept': 'application/json',
            'Referer': 'https://www.sofascore.com/',
          },
          cache: 'no-store',
        }
      )

      if (!sfRes.ok) {
        errors++
        details.push(`match ${match.id}: SofaScore ${sfRes.status}`)
        continue
      }

      const sfData = await sfRes.json()
      const event = sfData.event
      if (!event) { errors++; continue }

      const sfStatus = event.status?.type as string
      const newStatus = mapSofaStatus(sfStatus)
      const homeScore: number = event.homeScore?.current ?? 0
      const awayScore: number = event.awayScore?.current ?? 0

      // Atualizar a partida
      await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
      }).eq('id', match.id)

      // Se acabou de ficar finalizado: calcular pontos de todos os palpites
      if (newStatus === 'finished' && match.status !== 'finished') {
        const { data: predictions } = await supabase
          .from('predictions')
          .select('*')
          .eq('match_id', match.id)

        for (const pred of predictions ?? []) {
          const breakdown = calculatePoints({
            homePrediction: pred.home_score_prediction,
            awayPrediction: pred.away_score_prediction,
            homeActual: homeScore,
            awayActual: awayScore,
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

        details.push(`match ${match.id}: finalizado ${homeScore}-${awayScore}, ${predictions?.length ?? 0} palpites pontuados`)
      }

      synced++
    } catch (err) {
      errors++
      details.push(`match ${match.id}: ${err}`)
    }
  }

  return NextResponse.json({ synced, errors, total: matches.length, details })
}
