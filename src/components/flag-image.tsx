// Converte emoji de bandeira (ex: 🇧🇷) para código ISO-3166 (ex: "br")
function flagEmojiToCode(emoji: string): string | null {
  try {
    const chars = [...emoji]
    if (chars.length !== 2) return null
    const a = chars[0].codePointAt(0)!
    const b = chars[1].codePointAt(0)!
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

export function FlagImage({ flag, size = 24, className = '' }: FlagImageProps) {
  const code = flagEmojiToCode(flag)
  if (!code) return <span>{flag}</span>

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w${size * 2}/${code}.png`}
      alt={flag}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block object-cover rounded-[2px] ${className}`}
    />
  )
}
