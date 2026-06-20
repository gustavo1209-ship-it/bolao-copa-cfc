'use client'

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

export interface EvolutionSeries {
  id: string
  name: string
  color: string
  data: (number | null)[]
}

interface Props {
  dates: string[]
  series: EvolutionSeries[]
  totalParticipants: number
}

export function EvolutionChart({ dates, series, totalParticipants }: Props) {
  if (dates.length < 2) {
    return (
      <p className="text-gray-600 text-sm text-center py-8">
        Dados insuficientes para exibir o gráfico (mínimo 2 dias com jogos).
      </p>
    )
  }

  const names = Object.fromEntries(series.map(s => [s.id, s.name]))

  const chartData = dates.map((date, i) => {
    const point: Record<string, string | number | null> = {
      date: date.slice(5).replace('-', '/'),
    }
    for (const s of series) {
      point[s.id] = s.data[i]
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
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: '10px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#f9fafb', fontWeight: 600, marginBottom: 6 }}
          itemStyle={{ color: '#d1d5db' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, key: any) => [`${value}º lugar`, names[key] ?? key]}
          itemSorter={(item) => (item.value as number) ?? 999}
        />
        <Legend
          formatter={value => (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>{names[value] ?? value}</span>
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
