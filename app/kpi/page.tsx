'use client'

import { useEffect, useState } from 'react'
import { getKpiUnitTotals } from '@/lib/api'

const METRICS = [
  { key: 'total_windows',  label: 'Windows',       color: '#3b82f6' },
  { key: 'total_doors',    label: 'Doors',          color: '#8b5cf6' },
  { key: 'bay_windows',    label: 'Bay Windows',    color: '#06b6d4' },
  { key: 'bow_windows',    label: 'Bow Windows',    color: '#f59e0b' },
  { key: 'total_openings', label: 'Total Openings', color: '#ec4899' },
  { key: 'total_units',    label: 'Total Units',    color: '#F4C828' },
]

const PERIODS = ['week', 'month', 'quarter', 'year'] as const
const PERIOD_LABELS = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year' }

export default function KpiPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePeriod, setActivePeriod] = useState<typeof PERIODS[number]>('month')

  useEffect(() => {
    getKpiUnitTotals()
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, color: '#ccc' }}>Loading KPI data...</div>
  if (error) return <div style={{ padding: 32, color: '#f87' }}>Error: {error}</div>
  if (!data) return null

  const periodData = data.periods[activePeriod] || {}
  const monthlyKeys = Object.keys(data.monthly || {})

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 4 }}>KPI Dashboard</h1>
      <div style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>Unit counts from uploaded measure sheets</div>

      {/* Period Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setActivePeriod(p)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: activePeriod === p ? '#036A43' : '#1a1a1a',
              color: activePeriod === p ? '#fff' : '#aaa',
            }}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Metric Tiles for Selected Period */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {METRICS.map(m => (
          <div key={m.key} style={{
            background: '#1a1a1a', border: `1px solid ${m.color}44`,
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ color: m.color, fontWeight: 700, fontSize: 36, marginTop: 6 }}>
              {periodData[m.key] ?? 0}
            </div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
              {periodData.job_count ?? 0} job{periodData.job_count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* 12-Month Trend Table */}
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, color: '#F4C828', fontSize: 16, marginBottom: 16 }}>
          12-Month Trend
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ color: '#888', fontWeight: 700, textAlign: 'left', padding: '6px 10px' }}>Month</th>
                {METRICS.map(m => (
                  <th key={m.key} style={{ color: m.color, fontWeight: 700, textAlign: 'right', padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ color: '#888', fontWeight: 700, textAlign: 'right', padding: '6px 10px' }}>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {monthlyKeys.map((month, i) => {
                const row = data.monthly[month]
                const isCurrentMonth = i === monthlyKeys.length - 1
                return (
                  <tr key={month} style={{
                    borderBottom: '1px solid #1e1e1e',
                    background: isCurrentMonth ? '#0e2a1e' : 'transparent'
                  }}>
                    <td style={{ color: isCurrentMonth ? '#F4C828' : '#ccc', fontWeight: isCurrentMonth ? 700 : 400, padding: '7px 10px' }}>
                      {month} {isCurrentMonth ? '●' : ''}
                    </td>
                    {METRICS.map(m => (
                      <td key={m.key} style={{ color: '#fff', textAlign: 'right', padding: '7px 10px' }}>
                        {row[m.key] ?? 0}
                      </td>
                    ))}
                    <td style={{ color: '#888', textAlign: 'right', padding: '7px 10px' }}>{row.job_count ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
