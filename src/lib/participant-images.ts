// Maps participant first name (lowercase, stripped of punctuation) → image file prefix
const NAME_TO_PREFIX: Record<string, string> = {
  andrei:    'ANDY',
  berga:     'BERGA',
  anderson:  'BOITO',
  henrique:  'BORT',
  eduardo:   'BORTOLINHO',
  kaue:      'KAUE',
  artur:     'TODE',
  gabriel:   'ARTICO',
  douglas:   'DOGA',
  micuim:    'MICUIM',
  ponza:     'PONZA',
  ronaldo:   'RONI',
  joel:      'JO',
  marco:     'MARCO',
}

// rank 1 = melhor, rank total = pior; 5 níveis de felicidade
// Distribuição (14 participantes): 1→5, 2-5→4, 6-9→3, 10-13→2, 14→sem número
export function getImageLevel(rank: number, total: number): string {
  if (rank === 1) return '5'
  if (rank >= total) return ''
  const remaining = total - 2            // posições 2 até (total-1)
  const bucketSize = Math.ceil(remaining / 3)
  const pos = rank - 2                   // 0-indexed a partir do rank 2
  if (pos < bucketSize) return '4'
  if (pos < bucketSize * 2) return '3'
  return '2'
}

export function getImagePath(name: string, rank: number, total: number): string {
  const first = name.split(' ')[0].replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase()
  const prefix = NAME_TO_PREFIX[first]
  if (!prefix) return ''
  const level = getImageLevel(rank, total)
  return `/rostos/${prefix}${level}.jpg`
}
