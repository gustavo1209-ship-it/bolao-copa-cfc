import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  const serviceClient = createServiceClient()

  const { data, error, count } = await serviceClient
    .from('predictions')
    .select('user_id, match_id, home_score_prediction, away_score_prediction', { count: 'exact' })
    .limit(5000)

  const groupByStage = { group: 0, mata_mata: 0 }

  // Buscar matches para cruzar stage
  const { data: matches } = await serviceClient
    .from('matches')
    .select('id, stage')

  const stageMap: Record<string, string> = {}
  for (const m of matches ?? []) stageMap[m.id] = m.stage

  for (const p of data ?? []) {
    const stage = stageMap[p.match_id]
    if (stage === 'group') groupByStage.group++
    else groupByStage.mata_mata++
  }

  return NextResponse.json({
    total: count,
    returned: data?.length ?? 0,
    error: error?.message ?? null,
    groupByStage,
    sampleMataData: data?.filter(p => stageMap[p.match_id] !== 'group').slice(0, 5),
  })
}
