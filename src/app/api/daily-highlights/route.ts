export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)

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

  if (!lastGameDay) {
    return NextResponse.json({ error: 'Sem jogos finalizados para gerar destaques.' }, { status: 400 })
  }

  // Snapshot mais recente antes do último dia com jogo — para variação de ranking
  const { data: prevMeta } = await supabase
    .from('standings_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', lastGameDay)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const [{ data: current }, { data: prev }, { data: lastDayMatches }] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    prevMeta
      ? supabase.from('standings_snapshots').select('user_id, rank').eq('snapshot_date', prevMeta.snapshot_date)
      : Promise.resolve({ data: [] as Array<{ user_id: string; rank: number }> }),
    supabase.from('matches')
      .select('id, home_team, home_team_flag, away_team, away_team_flag, home_score, away_score, match_date')
      .eq('status', 'finished')
      .gte('match_date', lastGameDay + 'T00:00:00-03:00')
      .lte('match_date', lastGameDay + 'T23:59:59-03:00')
      .order('match_date'),
  ])

  if (!current?.length) {
    return NextResponse.json({ error: 'Sem dados suficientes para gerar destaques.' }, { status: 400 })
  }

  // Palpites individuais por jogo
  const matchIds = (lastDayMatches ?? []).map(m => m.id)
  let predsByMatch: Record<string, Array<{ name: string; home: number; away: number; pts: number }>> = {}
  const lastDayPtsByUser: Record<string, number> = {}

  if (matchIds.length > 0) {
    const { data: rawPreds } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score_prediction, away_score_prediction, pts_total')
      .in('match_id', matchIds)

    const userIds = [...new Set((rawPreds ?? []).map(p => p.user_id))]
    const { data: participantes } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds)

    const profileMap = Object.fromEntries(
      (participantes ?? []).map(p => [p.id, (p.name as string).split(' ')[0]])
    )

    for (const pred of (rawPreds ?? [])) {
      if (!predsByMatch[pred.match_id]) predsByMatch[pred.match_id] = []
      predsByMatch[pred.match_id].push({
        name: profileMap[pred.user_id] ?? 'Anon',
        home: pred.home_score_prediction,
        away: pred.away_score_prediction,
        pts: pred.pts_total ?? 0,
      })
      lastDayPtsByUser[pred.user_id] = (lastDayPtsByUser[pred.user_id] ?? 0) + (pred.pts_total ?? 0)
    }
  }

  const prevRankMap = Object.fromEntries((prev ?? []).map(s => [s.user_id, s.rank]))

  const diffs = current.map(s => ({
    name: s.name.split(' ')[0],
    currentRank: Number(s.rank),
    prevRank: prevRankMap[s.id] ?? Number(s.rank),
    rankChange: (prevRankMap[s.id] ?? Number(s.rank)) - Number(s.rank),
    ptsGained: lastDayPtsByUser[s.id] ?? 0,
    totalPts: s.total_pts,
  }))

  const topGainer = [...diffs].sort((a, b) => b.ptsGained - a.ptsGained)[0]
  const worstDay = [...diffs].sort((a, b) => a.ptsGained - b.ptsGained)[0]
  const biggestClimb = [...diffs].sort((a, b) => b.rankChange - a.rankChange)[0]
  const biggestFall = [...diffs].sort((a, b) => a.rankChange - b.rankChange)[0]

  const leader = current[0]
  const last = current[current.length - 1]

  const dateLabel = new Date(lastGameDay + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  })

  const jogosStr = lastDayMatches?.length
    ? lastDayMatches.map(m => {
        const preds = (predsByMatch[m.id] ?? []).sort((a, b) => b.pts - a.pts)
        const predsStr = preds.length
          ? preds.map(p => `${p.name} palpitou ${p.home}x${p.away} (${p.pts}pts)`).join(' | ')
          : 'sem palpites'
        return `${m.home_team} ${m.home_score}x${m.away_score} ${m.away_team}\n  Palpites: ${predsStr}`
      }).join('\n')
    : 'Nenhum jogo registrado'

  const contexto = `
Data de referência: ${dateLabel}
Líder geral: ${leader.name} com ${leader.total_pts} pts
Lanterna: ${last.name} com ${last.total_pts} pts
Maior pontuador do dia: ${topGainer.name} (+${topGainer.ptsGained} pts, agora em ${topGainer.currentRank}º)
Pior dia: ${worstDay.name} (+${worstDay.ptsGained} pts)
Maior subida: ${biggestClimb.rankChange > 0 ? `${biggestClimb.name} subiu ${biggestClimb.rankChange} posição(ões)` : 'ninguém subiu'}
Maior queda: ${biggestFall.rankChange < 0 ? `${biggestFall.name} caiu ${Math.abs(biggestFall.rankChange)} posição(ões)` : 'ninguém caiu'}
Classificação do dia: ${diffs.map(d => `${d.currentRank}º ${d.name} (+${d.ptsGained} pts hoje)`).join(', ')}

Jogos do dia:
${jogosStr}
`.trim()

  const PARTICIPANTE_FACTS = `
- Henrique e Eduardo Bortolon são IRMÃOS. Henrique está na liderança enquanto Eduardo está bem abaixo. É a versão bolão dos irmãos Schumacher: Henrique é o Michael (7x campeão, dominante, imbatível) e Eduardo é o Ralf (também correu na F1 mas viveu na sombra do irmão). Explore de forma cômica e cruel.
`.trim()

  const prompt = `Você é o Neto do programa Jogo Aberto da Band, comentando o bolão da Copa do Mundo entre amigos no WhatsApp. Fala alto, apaixonado, exagerado, sem papas na língua. Máximo 8 linhas, texto puro (sem asteriscos).

Dados:
${contexto}

Curiosidades dos participantes:
${PARTICIPANTE_FACTS}

Regras:
- Use o estilo do Neto: "Ó!", "Absurdo!", "Não existe isso!", "Cadê vergonha na cara?", "Vou falar!", "Tô falando sério!", "Esse cara é bom demais!", "Meu Deus do céu!", "Que vergonha!"
- Comente jogo a jogo: cite o placar e compare com o que cada um apostou — quem acertou de letra, quem errou feio
- Critique duramente quem errou e elogie exageradamente quem acertou
- Relacione os palpites com a variação no ranking (quem subiu, quem caiu)
- USE as curiosidades dos participantes para piadas específicas
- Invente apelidos cômicos baseados nos nomes
- Faça referências a memes brasileiros, futebol, situações absurdas
- Comece direto no comentário, sem introdução`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Erro na API Anthropic: ${err}` }, { status: 500 })
  }

  const json = await res.json() as { content: Array<{ type: string; text: string }> }
  const text = json.content[0]?.type === 'text' ? json.content[0].text : ''

  return NextResponse.json({ text, matches: lastDayMatches, context: { topGainer, worstDay, biggestClimb, biggestFall } })
}
