import { type Stage, STAGE_MULTIPLIERS } from '@/types'

interface ScoreInput {
  homePrediction: number
  awayPrediction: number
  homeActual: number
  awayActual: number
  stage: Stage
}

export interface ScoreBreakdown {
  ptsResult: number
  ptsHomeGoals: number
  ptsAwayGoals: number
  ptsExactBonus: number
  ptsTotal: number
}

export function calculatePoints(input: ScoreInput): ScoreBreakdown {
  const { homePrediction, awayPrediction, homeActual, awayActual, stage } = input
  const multiplier = STAGE_MULTIPLIERS[stage]

  const predictedResult = Math.sign(homePrediction - awayPrediction)
  const actualResult = Math.sign(homeActual - awayActual)

  const correctResult = predictedResult === actualResult
  const correctHome = homePrediction === homeActual
  const correctAway = awayPrediction === awayActual
  const exactScore = correctHome && correctAway

  const ptsResult = correctResult ? 3 * multiplier : 0
  const ptsHomeGoals = correctHome ? 1 * multiplier : 0
  const ptsAwayGoals = correctAway ? 1 * multiplier : 0
  const ptsExactBonus = exactScore ? 3 * multiplier : 0

  return {
    ptsResult,
    ptsHomeGoals,
    ptsAwayGoals,
    ptsExactBonus,
    ptsTotal: ptsResult + ptsHomeGoals + ptsAwayGoals + ptsExactBonus,
  }
}
