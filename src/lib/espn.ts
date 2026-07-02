// Integração com a API pública da ESPN (scoreboard da Copa do Mundo 2026)

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

// Nomes exatamente como a ESPN retorna (team.displayName) -> nome PT-BR usado no banco + bandeira
export const TEAM_EN_TO_PT: Record<string, { name: string; flag: string }> = {
  'Algeria': { name: 'Argélia', flag: '🇩🇿' },
  'Argentina': { name: 'Argentina', flag: '🇦🇷' },
  'Australia': { name: 'Austrália', flag: '🇦🇺' },
  'Austria': { name: 'Áustria', flag: '🇦🇹' },
  'Belgium': { name: 'Bélgica', flag: '🇧🇪' },
  'Bosnia-Herzegovina': { name: 'Bósnia-Herzegovina', flag: '🇧🇦' },
  'Brazil': { name: 'Brasil', flag: '🇧🇷' },
  'Canada': { name: 'Canadá', flag: '🇨🇦' },
  'Cape Verde': { name: 'Cabo Verde', flag: '🇨🇻' },
  'Colombia': { name: 'Colômbia', flag: '🇨🇴' },
  'Congo DR': { name: 'Congo (RD)', flag: '🇨🇩' },
  'Croatia': { name: 'Croácia', flag: '🇭🇷' },
  'Curaçao': { name: 'Curaçao', flag: '🇨🇼' },
  'Czechia': { name: 'Rep. Tcheca', flag: '🇨🇿' },
  'Ecuador': { name: 'Equador', flag: '🇪🇨' },
  'Egypt': { name: 'Egito', flag: '🇪🇬' },
  'England': { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'France': { name: 'França', flag: '🇫🇷' },
  'Germany': { name: 'Alemanha', flag: '🇩🇪' },
  'Ghana': { name: 'Gana', flag: '🇬🇭' },
  'Haiti': { name: 'Haiti', flag: '🇭🇹' },
  'Iran': { name: 'Irã', flag: '🇮🇷' },
  'Iraq': { name: 'Iraque', flag: '🇮🇶' },
  'Ivory Coast': { name: 'Costa do Marfim', flag: '🇨🇮' },
  'Japan': { name: 'Japão', flag: '🇯🇵' },
  'Jordan': { name: 'Jordânia', flag: '🇯🇴' },
  'Mexico': { name: 'México', flag: '🇲🇽' },
  'Morocco': { name: 'Marrocos', flag: '🇲🇦' },
  'Netherlands': { name: 'Holanda', flag: '🇳🇱' },
  'New Zealand': { name: 'Nova Zelândia', flag: '🇳🇿' },
  'Norway': { name: 'Noruega', flag: '🇳🇴' },
  'Panama': { name: 'Panamá', flag: '🇵🇦' },
  'Paraguay': { name: 'Paraguai', flag: '🇵🇾' },
  'Portugal': { name: 'Portugal', flag: '🇵🇹' },
  'Qatar': { name: 'Catar', flag: '🇶🇦' },
  'Saudi Arabia': { name: 'Arábia Saudita', flag: '🇸🇦' },
  'Scotland': { name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Senegal': { name: 'Senegal', flag: '🇸🇳' },
  'South Africa': { name: 'África do Sul', flag: '🇿🇦' },
  'South Korea': { name: 'Coreia do Sul', flag: '🇰🇷' },
  'Spain': { name: 'Espanha', flag: '🇪🇸' },
  'Sweden': { name: 'Suécia', flag: '🇸🇪' },
  'Switzerland': { name: 'Suíça', flag: '🇨🇭' },
  'Tunisia': { name: 'Tunísia', flag: '🇹🇳' },
  'Türkiye': { name: 'Turquia', flag: '🇹🇷' },
  'United States': { name: 'Estados Unidos', flag: '🇺🇸' },
  'Uruguay': { name: 'Uruguai', flag: '🇺🇾' },
  'Uzbekistan': { name: 'Uzbequistão', flag: '🇺🇿' },
}

// Derivado do mapa acima: nome PT-BR (nosso banco) -> nome usado pela ESPN
export const TEAM_PT_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_EN_TO_PT).map(([en, { name }]) => [name, en])
)

export function normTeamName(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function teamMatches(dbName: string, espnName: string): boolean {
  const en = TEAM_PT_TO_EN[dbName] ?? dbName
  return normTeamName(en) === normTeamName(espnName)
}

export interface EspnCompetitor {
  id: string
  homeAway: 'home' | 'away'
  winner?: boolean
  score: string
  shootoutScore?: number
  team: { id: string; displayName: string }
}

export interface EspnEvent {
  id: string
  date: string
  season?: { slug: string }
  status: {
    type: {
      name: string // ex: STATUS_SCHEDULED, STATUS_FULL_TIME, STATUS_FINAL_AET, STATUS_FINAL_PEN
      state: string // pre | in | post
      completed: boolean
    }
  }
  competitions: Array<{
    competitors: EspnCompetitor[]
  }>
}

// dates aceita tanto uma data única "YYYYMMDD" quanto um intervalo "YYYYMMDD-YYYYMMDD"
export async function fetchEspnEvents(dates: string): Promise<EspnEvent[]> {
  const res = await fetch(`${ESPN_SCOREBOARD_URL}?dates=${dates}&limit=200`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const data = await res.json() as { events?: EspnEvent[] }
  return data.events ?? []
}

export function findEspnEvent(events: EspnEvent[], homeTeam: string, awayTeam: string): EspnEvent | undefined {
  return events.find(ev => {
    const comps = ev.competitions?.[0]?.competitors ?? []
    const home = comps.find(c => c.homeAway === 'home')
    const away = comps.find(c => c.homeAway === 'away')
    return !!home && !!away && teamMatches(homeTeam, home.team.displayName) && teamMatches(awayTeam, away.team.displayName)
  })
}

export interface EspnResult {
  homeScore: number
  awayScore: number
  penaltyWinner: string | null
  eventId: number
}

// Extrai placar final e (se houve) vencedor nos pênaltis de um evento já finalizado.
// homeTeam/awayTeam devem ser os nomes PT-BR (do banco) para preencher penaltyWinner corretamente.
export function extractResult(event: EspnEvent, homeTeam: string, awayTeam: string): EspnResult {
  const comps = event.competitions[0]!.competitors
  const homeComp = comps.find(c => c.homeAway === 'home')!
  const awayComp = comps.find(c => c.homeAway === 'away')!
  const homeScore = parseInt(homeComp.score)
  const awayScore = parseInt(awayComp.score)

  let penaltyWinner: string | null = null
  if (event.status.type.name === 'STATUS_FINAL_PEN') {
    if (homeComp.winner) penaltyWinner = homeTeam
    else if (awayComp.winner) penaltyWinner = awayTeam
  }

  return { homeScore, awayScore, penaltyWinner, eventId: parseInt(event.id) }
}
