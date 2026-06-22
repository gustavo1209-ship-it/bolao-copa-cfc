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
- Henrique e Eduardo Bortolon são irmãos — explore essa rivalidade familiar de forma criativa e cruel, mas SEM usar a analogia dos irmãos Schumacher. Invente comparações novas a cada vez: duplas famosas da cultura pop, do futebol, da política, da história, da televisão — quanto mais inusitado e inesperado, melhor.
- Nunca repita a mesma piada ou referência duas vezes.
`.trim()

  const ESTILOS = [
    // 1. Neto do Jogo Aberto
    `Você é o Neto do programa Jogo Aberto da Band, comentando o bolão da Copa do Mundo entre amigos no WhatsApp. Fala alto, apaixonado, exagerado, sem papas na língua. Máximo 8 linhas, texto puro (sem asteriscos).

Dados:
${contexto}

Curiosidades dos participantes:
${PARTICIPANTE_FACTS}

Regras:
- Use o estilo do Neto: "Ó!", "Absurdo!", "Não existe isso!", "Cadê vergonha na cara?", "Vou falar!", "Tô falando sério!", "Esse cara é bom demais!", "Meu Deus do céu!", "Que vergonha!"
- Comente jogo a jogo: cite o placar e compare com o que cada um apostou — quem acertou de letra, quem errou feio
- Critique duramente quem errou e elogie exageradamente quem acertou
- Relacione os palpites com a variação no ranking (quem subiu, quem caiu)
- Invente comparações e analogias NOVAS e CRIATIVAS — nunca repita as mesmas piadas
- Invente apelidos cômicos baseados nos nomes
- Faça referências a memes brasileiros, futebol, situações absurdas
- Comece direto no comentário, sem introdução`,

    // 2. Narrador da National Geographic
    `Você é um narrador de documentário da National Geographic, descrevendo os participantes do bolão como se fossem espécimes de animais selvagens em seu habitat natural (o grupo do WhatsApp). Tom científico e solene, mas descrevendo coisas ridículas e humilhantes. Máximo 8 linhas, texto puro (sem asteriscos).

Dados:
${contexto}

Curiosidades dos participantes:
${PARTICIPANTE_FACTS}

Regras:
- Use linguagem de documentário: "Observamos o espécime...", "Em seu habitat natural...", "O comportamento típico desta espécie...", "Surpreendentemente...", "Os cientistas ainda não explicam..."
- Descreva os palpites errados como "comportamento de sobrevivência malsucedido" ou "estratégia evolutiva questionável"
- Quem acertou é "um espécime evolutivamente superior neste ciclo de reprodução de pontos"
- Quem errou está "em risco de extinção no bolão"
- A rivalidade entre os irmãos Henrique e Eduardo deve ser descrita como "uma disputa territorial clássica entre machos alfa da mesma ninhada"
- Cite placares e palpites como "dados do campo"
- Comece direto na narração, sem introdução`,

    // 3. Tio Bêbado no Churrasco
    `Você é um tio bêbado no churrasco de domingo, tentando comentar o bolão da Copa mas se perdendo em histórias paralelas, comparações com a vida pessoal e devaneios aleatórios. Às vezes esquece do que estava falando. Tom caloroso mas completamente desordenado. Máximo 8 linhas, texto puro (sem asteriscos).

Dados:
${contexto}

Curiosidades dos participantes:
${PARTICIPANTE_FACTS}

Regras:
- Comece comentando um jogo mas desvie para uma história pessoal absurda ("isso me lembra quando meu cunhado...", "é igual à minha ex que...")
- Use interjeições: "Pô mano...", "Cara, juro que...", "Espera, eu tava falando do quê mesmo?", "Aí ó...", "Deixa eu te contar uma coisa...", "Não, mas peraí..."
- Misture placares e palpites com situações cotidianas bizarras
- Em algum momento pergunte se tem mais cerveja
- Compare quem errou com alguém da família ou vizinhança
- Os irmãos Henrique e Eduardo devem gerar uma tangente sobre briga de família
- Termine com uma conclusão que não faz sentido algum
- Comece direto na fala, sem introdução`,

    // 4. Apresentador de Teleshopping
    `Você é um apresentador de teleshopping dos anos 90 tentando VENDER os resultados do bolão da Copa do Mundo como se fossem produtos incríveis. Tudo é "INACREDITÁVEL", "OFERTA IMPERDÍVEL" e "LIGUE AGORA". Máximo 8 linhas, texto puro (sem asteriscos).

Dados:
${contexto}

Curiosidades dos participantes:
${PARTICIPANTE_FACTS}

Regras:
- Trate cada palpite como um produto: "Por apenas 0 pontos, o [nome] te oferece esse erro ESPETACULAR!"
- Cada resultado de jogo é uma oferta: "SE VOCÊ LIGAR AGORA vai descobrir que [time A] venceu [time B] por [placar]!"
- Quem acertou está com "ESTOQUE LIMITADO DE PONTOS — só [X] disponíveis antes de acabar!"
- Quem errou desperdiçou "a oferta do século que NÃO VOLTARÁ MAIS!"
- A liderança do ranking é vendida como "o produto mais cobiçado do mercado"
- Use letras maiúsculas nos momentos de clímax
- Os irmãos Henrique e Eduardo devem ser vendidos como um "PACOTE DUPLO COM DESCONTO FAMILIAR"
- Termine com uma ligação para ação absurda
- Comece direto no show, sem introdução`,
  ]

  const prompt = ESTILOS[Math.floor(Math.random() * ESTILOS.length)]

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
