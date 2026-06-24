import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
  // Auth: apenas admins podem gerar destaques
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: profile } = await authClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const force = new URL(request.url).searchParams.get('force') === 'true'
  const supabase = createServiceClient()

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

  // Cache: retorna texto salvo para o mesmo dia de jogo, a menos que force=true
  if (!force) {
    const { data: cached } = await supabase
      .from('daily_highlights_cache')
      .select('text')
      .eq('cache_date', lastGameDay)
      .single()
    if (cached?.text) {
      return NextResponse.json({ text: cached.text, cached: true })
    }
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

  const REGRAS = `Nunca mencione que dois participantes têm o mesmo sobrenome ou são parentes. Nunca repita piada ou referência usada antes. Cite pelo menos um placar específico e uma previsão errada ou certa de alguém.`

  const BASE = `\n\nDados:\n${contexto}\n\nRegras: ${REGRAS}\n\nMáximo 7 linhas, texto puro (sem asteriscos, sem markdown). Comece direto, sem introdução.`

  const ESTILOS = [
    // 1. Neto do Jogo Aberto
    `Você é o Neto do Jogo Aberto da Band num comentário EXPLOSIVO no grupo do WhatsApp do bolão. Berre mesmo por escrito. Cite erros de palpite como "crime hediondo contra o futebol". Para quem liderou: gratidão dramática. Para quem errou: invente um apelido vexaminoso que vai durar para sempre. Use "Ó meu!", "Absurdo total!", "Vou falar!", "Cadê a vergonha?", "Tô maluco ou esse cara palpitou isso?!". É apaixonado, injusto e hilário.${BASE}`,

    // 2. Narrador da National Geographic
    `Você é o narrador de um documentário da National Geographic acompanhando espécimes raros num grupo de WhatsApp chamado Bolão CFC. Tom grave, científico e reverente para situações ridículas. Invente nomes científicos latinos para cada espécime (ex: "Homo Palpiticus Desperatus"). Use "Observamos o espécime", "A ciência ainda não explica", "Em seu habitat natural". Palpites errados são "estratégia de sobrevivência malsucedida". Quem acertou "demonstra adaptação superior ao ecossistema do bolão".${BASE}`,

    // 3. Tio Bêbado no Churrasco
    `Você é um tio de 52 anos, já na quarta cerveja, tentando comentar o bolão no churrasco mas desviando completamente. Começa comentando um resultado mas de repente lembra de um causo com o cunhado que não tem nada a ver. Volta para o assunto errado. Pergunta se tem mais coxinha. Compara alguém com um jogador dos anos 80. Termina com uma frase filosófica que não faz sentido nenhum. Use "Pô, mas espera...", "Isso me lembra quando...", "Não, mas peraí que eu me perdi", "Ô vida...".${BASE}`,

    // 4. Apresentador de Teleshopping
    `Você é o apresentador da ShopTime dos anos 90 VENDENDO os resultados do bolão como produtos de catálogo. Cada palpite certo é "PRODUTO PREMIUM DE ALTA QUALIDADE". Cada erro é "ITEM COM DEFEITO DE FÁBRICA — DEVOLVA IMEDIATAMENTE". A liderança é "O PRODUTO MAIS DESEJADO DO MERCADO". "LIGUE AGORA nos próximos 30 segundos e ganhe bônus de posição no ranking GRÁTIS!". Cite pontos como preços: "por apenas 4 pontos, fulano entrega esse erro HISTÓRICO!". Maiúsculas nos momentos de clímax.${BASE}`,

    // 5. Comentarista de Rádio dos Anos 80
    `Você é um comentarista de rádio esportivo dos anos 80, narrando os resultados do bolão com emoção de final de campeonato. Drama total, voz embargada, pausas dramáticas (reticências...). "E AQUI ESTÁ, AMIGOS OUVINTES, A CLASSIFICAÇÃO QUE VAI ENTRAR PARA A HISTÓRIA DO BOLÃO CFC!". Quem foi bem é um craque eterno. Quem errou "vai carregar essa falha até o fim dos tempos". Use muitas exclamações, compare com jogadas históricas do futebol brasileiro.${BASE}`,
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

  // Salva no cache (upsert para sobrescrever se force=true)
  await supabase
    .from('daily_highlights_cache')
    .upsert({ cache_date: lastGameDay, text })

  return NextResponse.json({ text, matches: lastDayMatches, context: { topGainer, worstDay, biggestClimb, biggestFall } })
}
