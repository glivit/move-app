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
  color = '#34C759',
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
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12, fill: '#C7C7CC' }} />
        <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} {...yAxisConfig} />
        <Tooltip contentStyle={tooltip || { backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }} />
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
  color = '#34C759',
  height = 300,
  xAxisKey = 'dateShort',
  yAxisConfig
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12, fill: '#C7C7CC' }} />
        <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} {...yAxisConfig} />
        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }} />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} name={name} />
      </BarChart>
    </ResponsiveContainer>
  )
}
