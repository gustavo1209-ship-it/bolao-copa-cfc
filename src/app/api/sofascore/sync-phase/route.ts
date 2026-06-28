import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Mapeamento Sofascore (EN) → PT-BR + emoji de bandeira
const SOFA_TO_PT: Record<string, { name: string; flag: string }> = {
  'South Africa':           { name: 'África do Sul',       flag: '🇿🇦' },
  'Canada':                 { name: 'Canadá',              flag: '🇨🇦' },
  'Brazil':                 { name: 'Brasil',              flag: '🇧🇷' },
  'Japan':                  { name: 'Japão',               flag: '🇯🇵' },
  'Germany':                { name: 'Alemanha',            flag: '🇩🇪' },
  'Paraguay':               { name: 'Paraguai',            flag: '🇵🇾' },
  'Netherlands':            { name: 'Holanda',             flag: '🇳🇱' },
  'Morocco':                { name: 'Marrocos',            flag: '🇲🇦' },
  "Côte d'Ivoire":          { name: 'Costa do Marfim',     flag: '🇨🇮' },
  'Ivory Coast':            { name: 'Costa do Marfim',     flag: '🇨🇮' },
  'Norway':                 { name: 'Noruega',             flag: '🇳🇴' },
  'France':                 { name: 'França',              flag: '🇫🇷' },
  'Sweden':                 { name: 'Suécia',              flag: '🇸🇪' },
  'Mexico':                 { name: 'México',              flag: '🇲🇽' },
  'Ecuador':                { name: 'Equador',             flag: '🇪🇨' },
  'England':                { name: 'Inglaterra',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'DR Congo':               { name: 'Congo (RD)',          flag: '🇨🇩' },
  'Belgium':                { name: 'Bélgica',             flag: '🇧🇪' },
  'Senegal':                { name: 'Senegal',             flag: '🇸🇳' },
  'USA':                    { name: 'Estados Unidos',      flag: '🇺🇸' },
  'United States':          { name: 'Estados Unidos',      flag: '🇺🇸' },
  'Bosnia & Herzegovina':   { name: 'Bósnia-Herzegovina',  flag: '🇧🇦' },
  'Bosnia and Herzegovina': { name: 'Bósnia-Herzegovina',  flag: '🇧🇦' },
  'Spain':                  { name: 'Espanha',             flag: '🇪🇸' },
  'Portugal':               { name: 'Portugal',            flag: '🇵🇹' },
  'Croatia':                { name: 'Croácia',             flag: '🇭🇷' },
  'Switzerland':            { name: 'Suíça',               flag: '🇨🇭' },
  'Australia':              { name: 'Austrália',           flag: '🇦🇺' },
  'Egypt':                  { name: 'Egito',               flag: '🇪🇬' },
  'Argentina':              { name: 'Argentina',           flag: '🇦🇷' },
  'Cabo Verde':             { name: 'Cabo Verde',          flag: '🇨🇻' },
  'Cape Verde':             { name: 'Cabo Verde',          flag: '🇨🇻' },
  'Colombia':               { name: 'Colômbia',            flag: '🇨🇴' },
  'Ghana':                  { name: 'Gana',                flag: '🇬🇭' },
  'Scotland':               { name: 'Escócia',             flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'South Korea':            { name: 'Coreia do Sul',       flag: '🇰🇷' },
  'Czech Republic':         { name: 'Rep. Tcheca',         flag: '🇨🇿' },
  'Czechia':                { name: 'Rep. Tcheca',         flag: '🇨🇿' },
  'Turkey':                 { name: 'Turquia',             flag: '🇹🇷' },
  'Qatar':                  { name: 'Catar',               flag: '🇶🇦' },
  'Haiti':                  { name: 'Haiti',               flag: '🇭🇹' },
  'Curaçao':                { name: 'Curaçao',             flag: '🇨🇼' },
  'Tunisia':                { name: 'Tunísia',             flag: '🇹🇳' },
  'Iran':                   { name: 'Irã',                 flag: '🇮🇷' },
  'New Zealand':            { name: 'Nova Zelândia',       flag: '🇳🇿' },
  'Saudi Arabia':           { name: 'Arábia Saudita',      flag: '🇸🇦' },
  'Uruguay':                { name: 'Uruguai',             flag: '🇺🇾' },
  'Iraq':                   { name: 'Iraque',              flag: '🇮🇶' },
  'Algeria':                { name: 'Argélia',             flag: '🇩🇿' },
  'Austria':                { name: 'Áustria',             flag: '🇦🇹' },
  'Jordan':                 { name: 'Jordânia',            flag: '🇯🇴' },
  'Uzbekistan':             { name: 'Uzbequistão',         flag: '🇺🇿' },
  'Panama':                 { name: 'Panamá',              flag: '🇵🇦' },
}

// Padrões que indicam time ainda não definido no Sofascore
const TBD_PATTERNS = /^\d[A-Z]$|^[0-9]+[A-Z]\/|^W\d|^L\d/

function isTBD(name: string): boolean {
  return !name || name === 'TBD' || TBD_PATTERNS.test(name)
}

function mapTeam(sofaName: string): { name: string; flag: string } | null {
  if (isTBD(sofaName)) return null
  return SOFA_TO_PT[sofaName] ?? { name: sofaName, flag: '' }
}

export async function POST(request: Request) {
  // Auth — apenas admin
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await authClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const supabase = createServiceClient()

  // Buscar próximos eventos no Sofascore
  let sofaEvents: Array<{
    id: number
    homeTeam: { name: string }
    awayTeam: { name: string }
    startTimestamp: number
    roundInfo?: { name?: string; round?: number }
  }>

  try {
    const res = await fetch(
      'https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/next/0',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
          'Accept': 'application/json',
          'Referer': 'https://www.sofascore.com/',
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) throw new Error(`Sofascore HTTP ${res.status}`)
    const data = await res.json()
    sofaEvents = data.events ?? []
  } catch (e) {
    return NextResponse.json({ error: `Erro ao buscar Sofascore: ${String(e)}` }, { status: 502 })
  }

  // Buscar partidas do banco que ainda têm algum TBD
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, sofascore_id, stage')
    .neq('status', 'finished')
    .or('home_team.eq.TBD,away_team.eq.TBD')

  const updated: string[] = []
  const skipped: string[] = []

  for (const dbMatch of dbMatches ?? []) {
    const dbTs = new Date(dbMatch.match_date).getTime()

    // Localizar evento Sofascore pelo sofascore_id ou por timestamp (±5min)
    const sofaEv = sofaEvents.find(e => {
      if (dbMatch.sofascore_id && e.id === dbMatch.sofascore_id) return true
      const sofaTs = e.startTimestamp * 1000
      return Math.abs(sofaTs - dbTs) <= 5 * 60 * 1000
    })

    if (!sofaEv) {
      skipped.push(`${dbMatch.home_team} vs ${dbMatch.away_team}: não encontrado no Sofascore`)
      continue
    }

    const homeMap = mapTeam(sofaEv.homeTeam.name)
    const awayMap = mapTeam(sofaEv.awayTeam.name)

    const update: Record<string, unknown> = { sofascore_id: sofaEv.id }

    if (dbMatch.home_team === 'TBD' && homeMap) {
      update.home_team = homeMap.name
      update.home_team_flag = homeMap.flag
    }
    if (dbMatch.away_team === 'TBD' && awayMap) {
      update.away_team = awayMap.name
      update.away_team_flag = awayMap.flag
    }

    if (Object.keys(update).length <= 1 && !homeMap && !awayMap) {
      skipped.push(`${dbMatch.home_team} vs ${dbMatch.away_team}: ainda TBD no Sofascore`)
      continue
    }

    await supabase.from('matches').update(update).eq('id', dbMatch.id)
    updated.push(
      `${update.home_team ?? dbMatch.home_team} vs ${update.away_team ?? dbMatch.away_team}`
    )
  }

  return NextResponse.json({
    updated,
    skipped,
    message: `${updated.length} atualizada(s) | ${skipped.length} ignorada(s)`,
  })
}
