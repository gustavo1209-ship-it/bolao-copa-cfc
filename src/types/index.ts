export type Stage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'third_place'
  | 'final'

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished'

export interface Profile {
  id: string
  name: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface Match {
  id: string
  home_team: string
  away_team: string
  home_team_flag: string
  away_team_flag: string
  home_score: number | null
  away_score: number | null
  match_date: string
  stage: Stage
  group_name: string | null
  status: MatchStatus
  sofascore_id: number | null
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  home_score_prediction: number
  away_score_prediction: number
  pts_result: number
  pts_home_goals: number
  pts_away_goals: number
  pts_exact_bonus: number
  pts_total: number
  created_at: string
  updated_at: string
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}

export interface Standing {
  id: string
  name: string
  total_pts: number
  exact_scores: number
  correct_results: number
  rank: number
}

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Rodada dos 32',
  round_of_16: 'Oitavas de Final',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinais',
  third_place: '3º Lugar',
  final: 'Final',
}

export const STAGE_MULTIPLIERS: Record<Stage, number> = {
  group: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarterfinal: 4,
  semifinal: 5,
  third_place: 4,
  final: 6,
}

export const STAGE_BADGE_COLORS: Record<Stage, string> = {
  group: 'bg-blue-900/60 text-blue-300 border-blue-700',
  round_of_32: 'bg-violet-900/60 text-violet-300 border-violet-700',
  round_of_16: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  quarterfinal: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  semifinal: 'bg-orange-900/60 text-orange-300 border-orange-700',
  third_place: 'bg-amber-900/60 text-amber-300 border-amber-700',
  final: 'bg-red-900/60 text-red-300 border-red-700',
}

export const MAX_PARTICIPANTS = 20
