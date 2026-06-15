import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { Settings, Calendar, Users, RefreshCw, MessageCircle } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true })
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: predCount } = await supabase.from('predictions').select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name} isAdmin={true} />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-orange-500/20 rounded-xl">
            <Settings size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Admin</h1>
            <p className="text-gray-400 text-sm">Gerenciar partidas, resultados e participantes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{matchCount ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Partidas</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{userCount ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Participantes</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{predCount ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Palpites</div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/admin/partidas"
            className="bg-gray-900 border border-gray-800 hover:border-orange-500/40 rounded-2xl p-6 transition-colors group"
          >
            <Calendar size={28} className="text-orange-500 mb-3" />
            <h2 className="font-bold text-lg mb-1 group-hover:text-orange-400 transition-colors">Gerenciar Partidas</h2>
            <p className="text-sm text-gray-500">Adicionar partidas, atualizar placares e sincronizar com SofaScore</p>
          </Link>

          <Link
            href="/ranking"
            className="bg-gray-900 border border-gray-800 hover:border-orange-500/40 rounded-2xl p-6 transition-colors group"
          >
            <Users size={28} className="text-orange-500 mb-3" />
            <h2 className="font-bold text-lg mb-1 group-hover:text-orange-400 transition-colors">Ver Ranking</h2>
            <p className="text-sm text-gray-500">Acompanhe a classificação de todos os participantes</p>
          </Link>

          <Link
            href="/admin/resumo"
            className="bg-gray-900 border border-gray-800 hover:border-green-500/40 rounded-2xl p-6 transition-colors group"
          >
            <MessageCircle size={28} className="text-green-500 mb-3" />
            <h2 className="font-bold text-lg mb-1 group-hover:text-green-400 transition-colors">Resumo do Dia</h2>
            <p className="text-sm text-gray-500">Gere o texto com ranking e variações para enviar no WhatsApp</p>
          </Link>
        </div>

        <div className="mt-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300 flex items-center gap-2">
            <RefreshCw size={14} />
            Para sincronizar resultados com o SofaScore: vá em <strong>Gerenciar Partidas</strong>, localize a partida finalizada e clique em <strong>&quot;Sincronizar SofaScore&quot;</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
