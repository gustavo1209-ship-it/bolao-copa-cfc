'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const inputCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/auth/reset-password`,
    })

    // Sempre mostra sucesso (não revelar se email existe ou não)
    setForgotSent(true)
    setForgotLoading(false)
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-4xl">⚽</span>
            <h1 className="text-2xl font-bold mt-3">
              Bolão <span className="text-orange-500">CFC 2026</span>
            </h1>
            <p className="text-gray-400 text-sm mt-2">Recuperar senha</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Mail size={24} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Email enviado!</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Se esse email está cadastrado, você receberá um link para redefinir sua senha.
                  </p>
                </div>
                <button
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail('') }}
                  className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Informe seu email e enviaremos um link para redefinir sua senha.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  Enviar link
                </button>
              </form>
            )}
          </div>

          {!forgotSent && (
            <button
              onClick={() => setForgotMode(false)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mx-auto mt-6 transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-bold mt-3">
            Bolão <span className="text-orange-500">CFC 2026</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">Entre na sua conta</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-300">Senha</label>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setForgotEmail(email) }}
                  className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Não tem conta?{' '}
          <Link href="/register" className="text-orange-500 hover:text-orange-400 font-medium">
            Cadastre-se
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          <Link href="/" className="hover:text-gray-400">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  )
}
