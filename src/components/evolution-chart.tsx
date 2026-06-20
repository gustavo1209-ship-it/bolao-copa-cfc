'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface EvolutionSeries {
  id: string
  name: string
  color: string
  data: (number | null)[]
  pts: number[]
}

interface EvolutionData {
  dates: string[]
  series: EvolutionSeries[]
  totalParticipants: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, colorMap, nameMap }: any) {
  if (!active || !payload?.length) return null

  const entries = [...payload]
    .filter((e: any) => e.value != null)
    .sort((a: any, b: any) => (a.value ?? 999) - (b.value ?? 999))

  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1f2937',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 160,
    }}>
      <p style={{ color: '#f9fafb', fontWeight: 600, marginBottom: 8 }}>{label}</p>
      {entries.map((entry: any) => {
        const userId = entry.dataKey
        const pts = entry.payload[`${userId}_pts`] ?? 0
        return (
          <div key={userId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colorMap[userId], flexShrink: 0 }} />
            <span style={{ color: '#d1d5db', flex: 1 }}>{nameMap[userId] ?? userId}</span>
            <span style={{ color: '#f9fafb', fontWeight: 600, marginLeft: 8 }}>
              {entry.value}º
            </span>
            <span style={{ color: '#6b7280', marginLeft: 4 }}>
              · {pts} pts
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function EvolutionChart() {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/evolution')
      .then(r => r.json())
      .then((d: EvolutionData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        Carregando evolução...
      </div>
    )
  }

  if (!data || data.dates.length < 2) {
    return (
      <p className="text-gray-600 text-sm text-center py-8">
        Dados insuficientes para exibir o gráfico (mínimo 2 dias com jogos).
      </p>
    )
  }

  const { dates, series, totalParticipants } = data
  const nameMap = Object.fromEntries(series.map(s => [s.id, s.name]))
  const colorMap = Object.fromEntries(series.map(s => [s.id, s.color]))

  const chartData = dates.map((date, i) => {
    const point: Record<string, string | number | null> = {
      date: date.slice(5).replace('-', '/'),
    }
    for (const s of series) {
      point[s.id] = s.data[i]
      point[`${s.id}_pts`] = s.pts[i]
    }
    return point
  })

  const ticks = Array.from({ length: totalParticipants }, (_, i) => i + 1)

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis
          reversed
          domain={[1, totalParticipants]}
          ticks={ticks}
          tickFormatter={(v) => `${v}º`}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip colorMap={colorMap} nameMap={nameMap} />} />
        <Legend
          formatter={value => (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>{nameMap[value] ?? value}</span>
          )}
          wrapperStyle={{ paddingTop: 16 }}
        />
        {series.map(s => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
