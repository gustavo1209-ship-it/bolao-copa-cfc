import { type Stage, STAGE_LABELS, STAGE_BADGE_COLORS, STAGE_MULTIPLIERS } from '@/types'

interface StageBadgeProps {
  stage: Stage
  showMultiplier?: boolean
}

export function StageBadge({ stage, showMultiplier }: StageBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STAGE_BADGE_COLORS[stage]}`}>
      {STAGE_LABELS[stage]}
      {showMultiplier && (
        <span className="opacity-75">×{STAGE_MULTIPLIERS[stage]}</span>
      )}
    </span>
  )
}
