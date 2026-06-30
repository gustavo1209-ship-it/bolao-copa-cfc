import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899',
  '#eab308', '#06b6d4', '#ef4444', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#10b981', '#6366f1', '#84cc16', '#f43f5e',
]

// BRT = UTC-3
const toBrtDate = (iso: string) =>
  new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

export async function GET() {
  const supabase = createServiceClient()

  const [{ data: matches }, { data: predictions }, { data: profiles }, { data: standings }] =
    await Promise.all([
      supabase.from('matches').select('id, match_date').eq('status', 'finished').order('match_date'),
      supabase.from('predictions').select('user_id, match_id, pts_total'),
      supabase.from('profiles').select('id, name'),
      supabase.from('standings').select('id, rank').order('rank'),
    ])

  if (!matches?.length || !profiles?.length) {
    return NextResponse.json({ dates: [], series: [], totalParticipants: 0 })
  }

  // Cada jogo → data BRT
  const matchDateMap: Record<string, string> = {}
  for (const m of matches) {
    matchDateMap[m.id] = toBrtDate(m.match_date)
  }

  // Dias únicos com jogos (eixo X)
  const gameDays = [...new Set(Object.values(matchDateMap))].sort()

  // Pontos por usuário por dia
  const dailyPts: Record<string, Record<string, number>> = {}
  for (const pred of predictions ?? []) {
    const date = matchDateMap[pred.match_id]
    if (!date) continue
    if (!dailyPts[pred.user_id]) dailyPts[pred.user_id] = {}
    dailyPts[pred.user_id][date] = (dailyPts[pred.user_id][date] ?? 0) + (pred.pts_total ?? 0)
  }

  // Pontos cumulativos por usuário por dia
  const userIds = profiles.map(p => p.id)
  const cumPts: Record<string, Record<string, number>> = {}
  for (const userId of userIds) {
    cumPts[userId] = {}
    let running = 0
    for (const day of gameDays) {
      running += dailyPts[userId]?.[day] ?? 0
      cumPts[userId][day] = running
    }
  }

  // Rank por dia: ordena por pts cumulativos DESC
  const rankByUserDate: Record<string, Record<string, number>> = {}
  for (const day of gameDays) {
    const sorted = [...userIds].sort((a, b) => (cumPts[b][day] ?? 0) - (cumPts[a][day] ?? 0))
    sorted.forEach((userId, i) => {
      if (!rankByUserDate[userId]) rankByUserDate[userId] = {}
      rankByUserDate[userId][day] = i + 1
    })
  }

  // Ordena participantes pelo ranking atual
  const orderedIds = standings?.map(s => s.id) ?? userIds
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name.split(' ')[0]]))

  const series = orderedIds
    .filter(id => profileMap[id])
    .map((id, i) => ({
      id,
      name: profileMap[id],
      color: COLORS[i % COLORS.length],
      data: gameDays.map(day => rankByUserDate[id]?.[day] ?? null),
      pts: gameDays.map(day => cumPts[id]?.[day] ?? 0),
    }))

  return NextResponse.json(
    { dates: gameDays, series, totalParticipants: profiles.length },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
