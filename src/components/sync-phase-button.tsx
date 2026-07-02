'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function SyncPhaseButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [result, setResult] = useState<{ updated: string[]; skipped: string[]; message: string } | null>(null)

  async function handleSync() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/espn/sync-phase', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setResult(data)
      setStatus('ok')
    } catch (e) {
      setResult({ updated: [], skipped: [], message: String(e) })
      setStatus('error')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-violet-500/40 rounded-2xl p-6 transition-colors">
      <RefreshCw size={28} className="text-violet-400 mb-3" />
      <h2 className="font-bold text-lg mb-1">Sincronizar Confrontos</h2>
      <p className="text-sm text-gray-500 mb-4">
        Preenche automaticamente times TBD nas próximas fases usando a ESPN
      </p>

      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        {status === 'loading'
          ? <><Loader2 size={14} className="animate-spin" /> Sincronizando...</>
          : <><RefreshCw size={14} /> Sincronizar agora</>
        }
      </button>

      {result && (
        <div className={`mt-4 rounded-lg p-3 text-xs ${status === 'ok' ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'}`}>
          <div className="flex items-center gap-1.5 font-medium mb-2">
            {status === 'ok'
              ? <CheckCircle size={13} className="text-green-400" />
              : <AlertCircle size={13} className="text-red-400" />
            }
            {result.message}
          </div>
          {result.updated.length > 0 && (
            <ul className="space-y-0.5 text-green-300">
              {result.updated.map(u => <li key={u}>✓ {u}</li>)}
            </ul>
          )}
          {result.skipped.length > 0 && (
            <ul className="space-y-0.5 text-gray-500 mt-1">
              {result.skipped.map(s => <li key={s}>– {s}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
