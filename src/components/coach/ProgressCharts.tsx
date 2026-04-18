'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ReactNode } from 'react'

interface ChartData {
  [key: string]: string | number
}

interface LineChartProps {
  data: ChartData[]
  dataKey: string
  name?: string
  color?: string
  height?: number
  xAxisKey?: string
  yAxisConfig?: any
  strokeWidth?: number
  connectNulls?: boolean
  tooltip?: any
}

interface BarChartProps {
  data: ChartData[]
  dataKey: string
  name?: string
  color?: string
  height?: number
  xAxisKey?: string
  yAxisConfig?: any
}

export function ProgressLineChart({
  data,
  dataKey,
  name,
  color = '#2FA65A',
  height = 300,
  xAxisKey = 'dateShort',
  yAxisConfig,
  strokeWidth = 2,
  connectNulls = true,
  tooltip
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#A6ADA7" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12, fill: '#CDD1CE' }} />
        <YAxis tick={{ fontSize: 12, fill: '#CDD1CE' }} {...yAxisConfig} />
        <Tooltip contentStyle={tooltip || { backgroundColor: 'white', border: '1px solid #A6ADA7', borderRadius: '0.75rem' }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={strokeWidth}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={connectNulls}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ProgressBarChart({
  data,
  dataKey,
  name,
  color = '#2FA65A',
  height = 300,
  xAxisKey = 'dateShort',
  yAxisConfig
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#A6ADA7" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12, fill: '#CDD1CE' }} />
        <YAxis tick={{ fontSize: 12, fill: '#CDD1CE' }} {...yAxisConfig} />
        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #A6ADA7', borderRadius: '0.75rem' }} />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} name={name} />
      </BarChart>
    </ResponsiveContainer>
  )
}
