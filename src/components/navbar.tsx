'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, LayoutDashboard, ListChecks, LogOut, LogIn, Menu, X } from 'lucide-react'

interface NavbarProps {
  userName?: string | null
  isAdmin?: boolean
}

export function Navbar({ userName, isAdmin }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/', label: 'Início', icon: null },
    { href: '/ranking', label: 'Ranking', icon: <Trophy size={16} /> },
    ...(userName ? [
      { href: '/palpites', label: 'Palpites', icon: <ListChecks size={16} /> },
      { href: '/dashboard', label: 'Meu Painel', icon: <LayoutDashboard size={16} /> },
    ] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: null }] : []),
  ]

  return (
    <nav className="border-b border-gray-800 bg-gray-950/95 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">⚽</span>
          <span className="text-white">Bolão</span>
          <span className="text-orange-500">CFC 2026</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden md:flex items-center gap-3">
          {userName ? (
            <>
              <span className="text-sm text-gray-400">{userName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              <LogIn size={16} />
              Entrar
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-3 flex flex-col gap-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          {userName ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
              Sair ({userName})
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              <LogIn size={16} />
              Entrar
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
