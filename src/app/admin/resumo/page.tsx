'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, RefreshCw, Loader2, Sparkles, MessageCircle, Zap } from 'lucide-react'

const getBrtDate = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

export default function ResumoPage() {
  const [rankingText, setRankingText] = useState('')
  const [highlightsText, setHighlightsText] = useState('')
  const [highlightsCached, setHighlightsCached] = useState(false)
  const [missingCount, setMissingCount] = useState(0)
  const [loadingRanking, setLoadingRanking] = useState(true)
  const [loadingHighlights, setLoadingHighlights] = useState(false)
  const [copiedRanking, setCopiedRanking] = useState(false)
  const [copiedHighlights, setCopiedHighlights] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [highlightsError, setHighlightsError] = useState('')

  const cacheKey = `bolao_highlights_${getBrtDate()}`

  async function loadRanking() {
    setLoadingRanking(true)
    const res = await fetch('/api/daily-summary')
    const data = await res.json()
    setRankingText(data.text ?? '')
    setMissingCount(data.missingCount ?? 0)
    setLoadingRanking(false)
  }

  async function loadHighlights(forceNew = false) {
    setLoadingHighlights(true)
    setHighlightsError('')
    const url = forceNew ? '/api/daily-highlights?force=true' : '/api/daily-highlights'
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) {
      setHighlightsError(data.error)
    } else {
      const text = data.text ?? ''
      setHighlightsText(text)
      setHighlightsCached(data.cached === true)
      try { localStorage.setItem(cacheKey, text) } catch {}
    }
    setLoadingHighlights(false)
  }

  useEffect(() => {
    loadRanking()
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setHighlightsText(cached)
        setHighlightsCached(true)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function copy(text: string, setter: (v: boolean) => void) {
    await navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const fullText = [highlightsText, rankingText].filter(Boolean).join('\n\n---\n\n')

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-16">
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
            <p className="text-gray-400 text-sm mt-1">Gere e copie para o grupo do WhatsApp</p>
          </div>
          <button
            onClick={loadRanking}
            disabled={loadingRanking}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
          >
            {loadingRanking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
        </div>

        {/* Alerta palpites faltando */}
        {missingCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 mb-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-400 font-semibold text-sm">{missingCount} participante{missingCount > 1 ? 's' : ''} sem palpites para amanhã</p>
              <p className="text-gray-500 text-xs mt-0.5">O alerta já está incluso no texto do ranking abaixo</p>
            </div>
          </div>
        )}

        {/* Destaques IA */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" />
              <span className="font-semibold text-sm">Destaques do Dia</span>
              <span className="text-xs text-gray-500">(gerado por IA)</span>
            </div>
            <div className="flex items-center gap-2">
              {highlightsText && !loadingHighlights && (
                <button
                  onClick={() => loadHighlights(true)}
                  disabled={loadingHighlights}
                  title="Vai usar créditos da API"
                  className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-lg text-xs transition-colors"
                >
                  <Zap size={11} />
                  Regenerar
                </button>
              )}
              {!highlightsText && (
                <button
                  onClick={() => loadHighlights()}
                  disabled={loadingHighlights}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  {loadingHighlights
                    ? <><Loader2 size={12} className="animate-spin" />Gerando...</>
                    : <><Sparkles size={12} />Gerar comentários</>
                  }
                </button>
              )}
              {loadingHighlights && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-yellow-400 text-xs">
                  <Loader2 size={12} className="animate-spin" />Gerando...
                </span>
              )}
            </div>
          </div>

          {highlightsError && (
            <p className="text-red-400 text-sm">{highlightsError}</p>
          )}

          {highlightsCached && highlightsText && (
            <p className="text-xs text-gray-600 mb-3">
              Gerado hoje — clique em &quot;Regenerar&quot; para criar um novo estilo (usa créditos da API)
            </p>
          )}

          {highlightsText ? (
            <>
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed mb-4">
                {highlightsText}
              </pre>
              <button
                onClick={() => copy(highlightsText, setCopiedHighlights)}
                className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  copiedHighlights ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {copiedHighlights ? <><Check size={14} />Copiado!</> : <><Copy size={14} />Copiar só os destaques</>}
              </button>
            </>
          ) : !loadingHighlights && (
            <p className="text-gray-600 text-sm text-center py-4">
              Clique em &quot;Gerar comentários&quot; para criar os destaques com IA
            </p>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={16} className="text-orange-400" />
            <span className="font-semibold text-sm">Ranking</span>
          </div>

          {loadingRanking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-orange-500 animate-spin" />
            </div>
          ) : (
            <>
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed mb-4">
                {rankingText}
              </pre>
              <button
                onClick={() => copy(rankingText, setCopiedRanking)}
                className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  copiedRanking ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {copiedRanking ? <><Check size={14} />Copiado!</> : <><Copy size={14} />Copiar só o ranking</>}
              </button>
            </>
          )}
        </div>

        {/* Copiar tudo */}
        {highlightsText && rankingText && (
          <button
            onClick={() => copy(fullText, setCopiedAll)}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              copiedAll ? 'bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {copiedAll ? <><Check size={20} />Copiado tudo!</> : <><Copy size={20} />Copiar tudo para WhatsApp</>}
          </button>
        )}
      </div>
    </div>
  )
}
