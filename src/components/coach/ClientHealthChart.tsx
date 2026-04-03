'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartData {
  date: string
  slaap: number
  stappen: number
  stress: number
}

interface Props {
  data: ChartData[]
}

export function ClientHealthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#C7C7CC' }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, 10]} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Bar dataKey="slaap" fill="#AF52DE" radius={[4, 4, 0, 0]} name="Slaap (u)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
