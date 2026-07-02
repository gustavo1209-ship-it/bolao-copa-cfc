import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { calculatePoints } from '@/lib/scoring'
import { fetchEspnEvents, findEspnEvent, extractResult } from '@/lib/espn'
import { type Stage } from '@/types'

interface RouteProps {
  params: Promise<{ matchId: string }>
}

export async function POST(request: Request, { params }: RouteProps) {
  const { matchId } = await params

  // Verificação de auth via client normal (respeita sessão do usuário)
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await authClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  // Service client para bypassar RLS nas operações de dados
  const supabase = createServiceClient()

  // Verificar se é chamada manual (placar já informado pelo admin) ou automática via ESPN
  const body = await request.json().catch(() => ({}))
  const isManual = body.manual === true

  let homeScore: number
  let awayScore: number
  let newStatus: string
  let penaltyWinner: string | null = null

  if (isManual) {
    homeScore = body.homeScore
    awayScore = body.awayScore
    newStatus = body.status ?? 'finished'
  } else {
    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
    if (!match) return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 })

    const dateStr = new Date(match.match_date).toISOString().slice(0, 10).replace(/-/g, '')
    let events: Awaited<ReturnType<typeof fetchEspnEvents>>
    try {
      events = await fetchEspnEvents(dateStr)
    } catch {
      return NextResponse.json({ error: 'Erro ao buscar dados da ESPN.' }, { status: 502 })
    }

    const event = findEspnEvent(events, match.home_team, match.away_team)
    if (!event) {
      return NextResponse.json({ error: 'Partida não encontrada na ESPN.' }, { status: 404 })
    }
    if (!event.status.type.completed) {
      return NextResponse.json({ error: `Jogo ainda não finalizado (status: ${event.status.type.name})` }, { status: 400 })
    }

    const result = extractResult(event, match.home_team, match.away_team)
    if (isNaN(result.homeScore) || isNaN(result.awayScore)) {
      return NextResponse.json({ error: 'Placar inválido retornado pela ESPN.' }, { status: 502 })
    }

    homeScore = result.homeScore
    awayScore = result.awayScore
    penaltyWinner = result.penaltyWinner
    newStatus = 'finished'

    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: newStatus,
      sofascore_id: result.eventId,
      ...(penaltyWinner ? { penalty_winner: penaltyWinner } : {}),
    }).eq('id', matchId)
  }

  // Buscar a partida atualizada para pegar a fase e penalty_winner
  const { data: finalMatch } = await supabase.from('matches').select('stage, penalty_winner').eq('id', matchId).single()
  if (!finalMatch) return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 })

  // Buscar todos os palpites desta partida
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)

  if (predictions && predictions.length > 0) {
    // Calcular e atualizar pontos de cada palpite
    for (const pred of predictions) {
      const breakdown = calculatePoints({
        homePrediction: pred.home_score_prediction,
        awayPrediction: pred.away_score_prediction,
        homeActual: homeScore,
        awayActual: awayScore,
        stage: finalMatch.stage as Stage,
        penaltyWinnerPrediction: pred.penalty_winner_prediction,
        penaltyWinnerActual: finalMatch.penalty_winner,
      })

      await supabase.from('predictions').update({
        pts_result: breakdown.ptsResult,
        pts_home_goals: breakdown.ptsHomeGoals,
        pts_away_goals: breakdown.ptsAwayGoals,
        pts_exact_bonus: breakdown.ptsExactBonus,
        pts_penalty_winner: breakdown.ptsPenaltyWinner,
        pts_total: breakdown.ptsTotal,
        updated_at: new Date().toISOString(),
      }).eq('id', pred.id)
    }
  }

  return NextResponse.json({
    success: true,
    homeScore,
    awayScore,
    status: newStatus,
    penaltyWinner: finalMatch.penalty_winner,
    predictionsUpdated: predictions?.length ?? 0,
  })
}
