export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const today = brtNow.toISOString().slice(0, 10)

  // Snapshot anterior ao dia atual
  const { data: prevMeta } = await supabase
    .from('standings_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const [{ data: current }, { data: prev }] = await Promise.all([
    supabase.from('standings').select('id, name, total_pts, rank').order('rank'),
    prevMeta
      ? supabase.from('standings_snapshots').select('user_id, rank, total_pts').eq('snapshot_date', prevMeta.snapshot_date)
      : Promise.resolve({ data: [] }),
  ])

  if (!prevMeta || !current?.length) {
    return NextResponse.json({ error: 'Sem dados suficientes para gerar destaques.' }, { status: 400 })
  }

  // Jogos finalizados no último dia com resultados (snapshot anterior)
  const prevDate = prevMeta.snapshot_date
  const { data: lastDayMatches } = await supabase
    .from('matches')
    .select('home_team, home_team_flag, away_team, away_team_flag, home_score, away_score')
    .eq('status', 'finished')
    .gte('match_date', prevDate + 'T00:00:00-03:00')
    .lte('match_date', prevDate + 'T23:59:59-03:00')
    .order('match_date')

  const prevMap = Object.fromEntries((prev ?? []).map(s => [s.user_id, s]))

  const diffs = current
    .filter(s => prevMap[s.id])
    .map(s => {
      const p = prevMap[s.id]
      return {
        name: s.name.split(' ')[0],
        fullName: s.name,
        currentRank: Number(s.rank),
        prevRank: p.rank,
        rankChange: p.rank - Number(s.rank),
        ptsGained: s.total_pts - p.total_pts,
        totalPts: s.total_pts,
      }
    })

  const topGainer = [...diffs].sort((a, b) => b.ptsGained - a.ptsGained)[0]
  const worstDay = [...diffs].sort((a, b) => a.ptsGained - b.ptsGained)[0]
  const biggestClimb = [...diffs].sort((a, b) => b.rankChange - a.rankChange)[0]
  const biggestFall = [...diffs].sort((a, b) => a.rankChange - b.rankChange)[0]

  const leader = current[0]
  const last = current[current.length - 1]

  const dateLabel = new Date(prevDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  })

  const jogosStr = lastDayMatches?.length
    ? lastDayMatches.map(m =>
        `${m.home_team} ${m.home_score}x${m.away_score} ${m.away_team}`
      ).join('\n')
    : 'Nenhum jogo registrado'

  const contexto = `
Data de referência: ${dateLabel}
Líder atual: ${leader.name} com ${leader.total_pts} pts
Lanterna: ${last.name} com ${last.total_pts} pts
Maior pontuador do dia: ${topGainer.name} (+${topGainer.ptsGained} pts, agora em ${topGainer.currentRank}º)
Pior dia: ${worstDay.name} (+${worstDay.ptsGained} pts)
Maior subida: ${biggestClimb.rankChange > 0 ? `${biggestClimb.name} subiu ${biggestClimb.rankChange} posição(ões)` : 'ninguém subiu'}
Maior queda: ${biggestFall.rankChange < 0 ? `${biggestFall.name} caiu ${Math.abs(biggestFall.rankChange)} posição(ões)` : 'ninguém caiu'}
Classificação: ${diffs.map(d => `${d.currentRank}º ${d.name} (${d.totalPts}pts, ${d.ptsGained >= 0 ? '+' : ''}${d.ptsGained} hoje)`).join(', ')}

Jogos do dia:
${jogosStr}
`.trim()

  const prompt = `Você é o comentarista mais tosco, escrachado e bizarro de um bolão da Copa do Mundo num grupo de amigos brasileiros. Gere um texto curto (máximo 8 linhas) com os destaques do dia para mandar no WhatsApp do grupo.

Dados:
${contexto}

Regras:
- Comente os jogos do dia com humor: resultados surpresa, goleadas, empates frustrantes, azarões
- Relacione os resultados dos jogos com quem foi bem ou mal no bolão
- Invente apelidos cômicos baseados nos nomes das pessoas (ex: "Artur Pipoca", "Marco do Pé Frio")
- Use humor pesado, provoque quem foi mal e elogie quem foi bem de forma exagerada e ridícula
- Faça referências a memes brasileiros, futebol, situações absurdas
- NÃO use asteriscos para negrito, só texto puro (é para WhatsApp)
- Comece direto nos comentários, sem introdução`

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
