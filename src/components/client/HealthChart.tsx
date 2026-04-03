'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartData {
  date: string
  slaap: number
  stappen: number
  water: number
}

interface Props {
  data: ChartData[]
}

export function HealthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B5EA7" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#7B5EA7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ACACAC' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
        />
        <Area type="monotone" dataKey="slaap" stroke="#7B5EA7" fill="url(#sleepGrad)" strokeWidth={2} name="Slaap (u)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
