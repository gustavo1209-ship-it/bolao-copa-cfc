import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
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

  const { data: current } = await supabase
    .from('standings')
    .select('id, name, total_pts, rank')
    .order('rank')

  if (!prevMeta || !current?.length) {
    return NextResponse.json({ error: 'Sem dados suficientes para gerar destaques.' }, { status: 400 })
  }

  const { data: prev } = await supabase
    .from('standings_snapshots')
    .select('user_id, rank, total_pts')
    .eq('snapshot_date', prevMeta.snapshot_date)

  const prevMap = Object.fromEntries((prev ?? []).map(s => [s.user_id, s]))

  // Calcular variações
  const diffs = current
    .filter(s => prevMap[s.id])
    .map(s => {
      const p = prevMap[s.id]
      return {
        name: s.name.split(' ')[0], // primeiro nome
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

  const dateLabel = brtNow.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  const contexto = `
Data: ${dateLabel}
Líder atual: ${leader.name} com ${leader.total_pts} pts
Lanterna: ${last.name} com ${(current[current.length - 1] as typeof current[0]).total_pts} pts
Maior pontuador do dia: ${topGainer.name} (+${topGainer.ptsGained} pts, agora em ${topGainer.currentRank}º lugar)
Pior dia: ${worstDay.name} (+${worstDay.ptsGained} pts)
Maior subida: ${biggestClimb.rankChange > 0 ? `${biggestClimb.name} subiu ${biggestClimb.rankChange} posições` : 'ninguém subiu'}
Maior queda: ${biggestFall.rankChange < 0 ? `${biggestFall.name} caiu ${Math.abs(biggestFall.rankChange)} posições` : 'ninguém caiu'}
Classificação completa: ${diffs.map(d => `${d.currentRank}º ${d.name} (${d.totalPts}pts, ${d.ptsGained >= 0 ? '+' : ''}${d.ptsGained} hoje)`).join(', ')}
`.trim()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Você é o comentarista mais tosco, escrachado e bizarro de um bolão da Copa do Mundo num grupo de amigos brasileiros. Gere um texto curto (máximo 6 linhas) com os destaques do dia para mandar no WhatsApp do grupo.

Dados do dia:
${contexto}

Regras:
- Use humor pesado, provoque quem foi mal e elogie quem foi bem de forma exagerada e ridícula
- Invente apelidos ofensivos mas divertidos baseados nos nomes (ex: "Artur Pipoca", "Marco do Pé Frio")
- Faça referências a futebol, memes brasileiros, Copa do Mundo
- Seja criativo, surpreendente e um pouco absurdo
- NÃO use asteriscos para negrito, só texto puro (é para WhatsApp)
- Comece direto nos comentários, sem introdução`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ text, context: { topGainer, worstDay, biggestClimb, biggestFall } })
}
