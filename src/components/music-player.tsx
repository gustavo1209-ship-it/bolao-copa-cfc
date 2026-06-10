'use client'
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function MusicPlayer() {
  const playerRef = useRef<any>(null)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function initPlayer() {
      playerRef.current = new (window as any).YT.Player('yt-bg-music', {
        videoId: 'TPoUcVQtDJ4',
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: 'TPoUcVQtDJ4',
          controls: 0,
          rel: 0,
        },
        events: {
          onReady: () => setReady(true),
        },
      })
    }

    if ((window as any).YT?.Player) {
      initPlayer()
    } else {
      ;(window as any).onYouTubeIframeAPIReady = initPlayer
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }
  }, [])

  function toggleMute() {
    if (!playerRef.current) return
    if (muted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(50)
      setMuted(false)
    } else {
      playerRef.current.mute()
      setMuted(true)
    }
  }

  return (
    <>
      <div
        id="yt-bg-music"
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }}
      />
      {ready && (
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
      )}
    </>
  )
}
