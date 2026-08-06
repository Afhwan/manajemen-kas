'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function TrendChart({
  data,
}: {
  data: { label: string; masuk: number; keluar: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4dbcd" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#8a7662' }}
          axisLine={{ stroke: '#e4dbcd' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8a7662' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000000 ? `${Math.round(v / 1000000)}jt` : `${Math.round(v / 1000)}rb`
          }
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat('id-ID').format(typeof value === 'number' ? value : Number(value ?? 0))
          }
          labelStyle={{ color: '#2e1f1a' }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e4dbcd', background: '#f7f1e8' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="masuk" name="Pemasukan" fill="#3d6b4f" radius={[4, 4, 0, 0]} />
        <Bar dataKey="keluar" name="Pengeluaran" fill="#8c2f39" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
