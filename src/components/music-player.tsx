'use client'
import { useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function MusicPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [muted, setMuted] = useState(true)

  function sendCommand(func: string, args?: unknown[]) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: args ?? [] }),
      '*'
    )
  }

  function toggleMute() {
    if (muted) {
      sendCommand('unMute')
      sendCommand('setVolume', [50])
      setMuted(false)
    } else {
      sendCommand('mute')
      setMuted(true)
    }
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
      <iframe
        ref={iframeRef}
        src="https://www.youtube.com/embed/TPoUcVQtDJ4?autoplay=1&mute=1&loop=1&playlist=TPoUcVQtDJ4&controls=0&enablejsapi=1&playsinline=1"
        style={{ position: 'fixed', top: -9999, left: -9999, width: 200, height: 200, pointerEvents: 'none' }}
        allow="autoplay; encrypted-media"
        title="background music"
      />
      <button
        onClick={toggleMute}
        className="fixed bottom-6 right-4 z-40 w-10 h-10 rounded-full bg-gray-800/90 border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
        title={muted ? 'Ligar música' : 'Silenciar música'}
      >
        {muted ? (
          <VolumeX size={16} className="text-gray-500" />
        ) : (
          <Volume2 size={16} className="text-orange-400" />
        )}
      </button>
    </>
  )
}
