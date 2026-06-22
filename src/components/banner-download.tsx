'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'

export function BannerDownload() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 900
    const H = 280
    canvas.width = W
    canvas.height = H

    // Fundo escuro
    ctx.fillStyle = '#030712'
    ctx.fillRect(0, 0, W, H)

    // Brilho laranja central
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55)
    glow.addColorStop(0, 'rgba(249,115,22,0.22)')
    glow.addColorStop(1, 'rgba(249,115,22,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    // Linha superior e inferior laranja
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); ctx.stroke()

    // Título principal
    ctx.textAlign = 'center'
    ctx.font = 'bold 68px Arial Black, Arial, sans-serif'
    ctx.fillStyle = '#f97316'
    ctx.fillText('BOLÃO CFC', W / 2, 112)

    // Subtítulo
    ctx.font = 'bold 34px Arial, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Copa do Mundo 2026', W / 2, 162)

    // Data atual em BRT
    const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const dateStr = brt.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    })
    ctx.font = '22px Arial, sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), W / 2, 208)

    // Emojis laterais de bola
    ctx.font = '40px serif'
    ctx.fillText('⚽', 60, 120)
    ctx.fillText('⚽', W - 60, 120)

    // Rodapé sutil
    ctx.font = '15px Arial, sans-serif'
    ctx.fillStyle = '#374151'
    ctx.fillText('bolao-copa-cfc.vercel.app', W / 2, 258)
  }, [])

  useEffect(() => { draw() }, [draw])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'bolao-cfc-banner.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-gray-800"
        style={{ imageRendering: 'auto' }}
      />
      <button
        onClick={download}
        className="mt-3 w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
      >
        <Download size={14} />
        Baixar banner para WhatsApp
      </button>
    </div>
  )
}
