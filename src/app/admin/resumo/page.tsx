'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, RefreshCw, Loader2 } from 'lucide-react'

export default function ResumoPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load(showSpin = false) {
    if (showSpin) setRefreshing(true)
    else setLoading(true)
    const res = await fetch('/api/daily-summary')
    const data = await res.json()
    setText(data.text ?? '')
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Resumo do Dia</h1>
            <p className="text-gray-400 text-sm mt-1">Copie e cole no grupo do WhatsApp</p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-orange-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                {text}
              </pre>
            </div>

            <button
              onClick={copy}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copiar para WhatsApp
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
