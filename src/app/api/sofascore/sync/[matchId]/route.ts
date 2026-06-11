import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { calculatePoints } from '@/lib/scoring'
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

  // Verificar se é chamada manual (placar já atualizado) ou via SofaScore
  const body = await request.json().catch(() => ({}))
  const isManual = body.manual === true

  let homeScore: number
  let awayScore: number
  let newStatus: string

  if (isManual) {
    homeScore = body.homeScore
    awayScore = body.awayScore
    newStatus = body.status ?? 'finished'
  } else {
    // Buscar partida para pegar sofascore_id
    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
    if (!match?.sofascore_id) {
      return NextResponse.json({ error: 'Esta partida não tem ID do SofaScore.' }, { status: 400 })
    }

    // Buscar resultado no SofaScore (API não-oficial)
    let sfData: Record<string, unknown>
    try {
      const sfRes = await fetch(`https://api.sofascore.com/api/v1/event/${match.sofascore_id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
          'Accept': 'application/json',
          'Referer': 'https://www.sofascore.com/',
        },
        cache: 'no-store',
      })
      if (!sfRes.ok) {
        return NextResponse.json({ error: `SofaScore retornou status ${sfRes.status}` }, { status: 502 })
      }
      sfData = await sfRes.json()
    } catch {
      return NextResponse.json({ error: 'Erro ao buscar dados do SofaScore.' }, { status: 502 })
    }

    const event = sfData.event as Record<string, unknown>
    if (!event) return NextResponse.json({ error: 'Formato inesperado do SofaScore.' }, { status: 502 })

    const sfStatus = (event.status as Record<string, unknown>)?.type as string
    const homeScoreData = event.homeScore as Record<string, unknown>
    const awayScoreData = event.awayScore as Record<string, unknown>

    if (sfStatus !== 'finished') {
      return NextResponse.json({ error: `Jogo ainda não finalizado (status: ${sfStatus})`, status: sfStatus }, { status: 400 })
    }

    homeScore = (homeScoreData?.current as number) ?? 0
    awayScore = (awayScoreData?.current as number) ?? 0
    newStatus = 'finished'

    // Atualizar a partida no banco
    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: newStatus,
    }).eq('id', matchId)
  }

  // Buscar a partida atualizada para pegar a fase
  const { data: finalMatch } = await supabase.from('matches').select('stage').eq('id', matchId).single()
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
  }

  return NextResponse.json({
    success: true,
    homeScore,
    awayScore,
    status: newStatus,
    predictionsUpdated: predictions?.length ?? 0,
  })
}
