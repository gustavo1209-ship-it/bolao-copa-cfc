import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const soccerScoreboard = localFont({
  src: '../../public/fonts/SoccerScoreboard.otf',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bolão Copa 2026 – CFC',
  description: 'Bolão da Copa do Mundo 2026 da turma do CFC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={soccerScoreboard.className}>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
