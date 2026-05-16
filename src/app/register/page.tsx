'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Loader2, Users } from 'lucide-react'
import { MAX_PARTICIPANTS } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [participantCount, setParticipantCount] = useState<number | null>(null)

  useEffect(() => {
    async function checkCount() {
      const supabase = createClient()
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      setParticipantCount(count ?? 0)
    }
    checkCount()
  }, [])

  const isFull = participantCount !== null && participantCount >= MAX_PARTICIPANTS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Verificar novamente antes de criar
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    if ((count ?? 0) >= MAX_PARTICIPANTS) {
      setError('O bolão já atingiu o limite de 20 participantes.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este email já está cadastrado.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // Criar perfil manualmente (caso o trigger não esteja ativo)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        email,
        is_admin: false,
      })
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-bold mt-3">
            Bolão <span className="text-orange-500">CFC 2026</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">Cadastre-se para participar</p>
        </div>

        {/* Vagas restantes */}
        {participantCount !== null && (
          <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm ${
            isFull
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>
            <Users size={16} />
            {isFull
              ? 'Bolão lotado — todas as 20 vagas preenchidas.'
              : `${participantCount}/${MAX_PARTICIPANTS} participantes — ${MAX_PARTICIPANTS - participantCount} vagas restantes`}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={isFull}
                placeholder="Seu nome completo"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isFull}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isFull}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || isFull}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {isFull ? 'Bolão lotado' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium">
            Entrar
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          <Link href="/" className="hover:text-gray-400">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  )
}
