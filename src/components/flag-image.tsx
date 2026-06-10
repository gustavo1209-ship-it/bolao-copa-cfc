// Converte emoji de bandeira para código aceito pelo flagcdn.com
function flagEmojiToCode(emoji: string): string | null {
  try {
    const codepoints = [...emoji].map(c => c.codePointAt(0)!)

    // Emoji de subdivisão: começa com 🏴 (U+1F3F4) + tag letters (U+E0061–U+E007A)
    // Ex: 🏴󠁧󠁢󠁳󠁣󠁴󠁿 → tag letters g,b,s,c,t → "gbsct" → "gb-sct"
    if (codepoints[0] === 0x1F3F4 && codepoints.length > 2) {
      const tagLetters = codepoints
        .slice(1)
        .filter(cp => cp >= 0xE0061 && cp <= 0xE007A)
        .map(cp => String.fromCharCode(cp - 0xE0000))
        .join('')
      if (tagLetters.length >= 4) {
        return tagLetters.slice(0, 2) + '-' + tagLetters.slice(2)
      }
    }

    // Emoji de país padrão: dois regional indicators (ex: 🇧🇷 → "br")
    if (codepoints.length !== 2) return null
    const [a, b] = codepoints
    if (a < 0x1F1E6 || a > 0x1F1FF || b < 0x1F1E6 || b > 0x1F1FF) return null
    return String.fromCharCode(a - 0x1F1E6 + 97, b - 0x1F1E6 + 97)
  } catch {
    return null
  }
}

interface FlagImageProps {
  flag: string
  size?: number
  className?: string
}

// flagcdn.com só aceita estas larguras
const CDN_WIDTHS = [20, 40, 80, 160, 320]

function cdnWidth(size: number): number {
  const target = size * 2
  return CDN_WIDTHS.find(w => w >= target) ?? 320
}

export function FlagImage({ flag, size = 24, className = '' }: FlagImageProps) {
  const code = flagEmojiToCode(flag)
  if (!code) return <span>{flag}</span>

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w${cdnWidth(size)}/${code}.png`}
      alt={flag}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block object-cover rounded-[2px] ${className}`}
    />
  )
}
