'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AutoRefreshProps {
  intervalMs?: number
}

// Recarrega dados do servidor periodicamente (chama router.refresh sem recarregar a página)
export function AutoRefresh({ intervalMs = 60_000 }: AutoRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
