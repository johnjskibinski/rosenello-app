'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

interface WeekRow {
  week_start: string
  measured: number
  ordered_within_7: number
  order_rate: number
}

interface QuarterRow {
  quarter: string
  measured: number
  ordered_within_7: number
  order_rate: number
}

function rateColor(rate: number) {
  if (rate >= 80) return '#22c55e'
  if (rate >= 60) return '#f4c828'
  return '#ef4444'
}

function formatWeekLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function KpiPage() {
  const [weekly, setWeekly] = useState<WeekRow[]>([])
  const [quarterly, setQuarterly] = useState<QuarterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/api/kpi/measure-velocity`)
      .then(r => r.json())
      .then(d => {
        setWeekly(d.weekly || [])
        setQuarterly(d.quarterly || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load KPI data')
        setLoading(false)
      })
  }, [])

  const maxMeasured = Math.max(...weekly.map(w => w.measured), 1)

  if (loading) return <div style={{ padding: 40, color: '#fff', fontFamily: 'sans-serif' }}>Loading...</div>
  if (error) return <div style={{ padding: 40, color: '#ef4444', fontFamily: 'sans-serif' }}>{error}</div>

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'sans-serif', color: '#f1f5f9', maxWidth: 1000 }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' }}>KPI Dashboard</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
          Measure volume · Order turnaround (≤7 days from measure)
        </p>
      </div>

      {/* Quarterly cards */}
      {quarterly.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Quarterly
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
            {quarterly.map(q => (
              <div key={q.quarter} style={{
                background: '#1e293b',
                borderRadius: 10,
                padding: '18px 22px',
                minWidth: 170,
                border: '1px solid #334155',
              }}>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  {q.quarter}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {q.measured}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 14 }}>
                  jobs measured
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: rateColor(q.order_rate) + '22',
                  color: rateColor(q.order_rate),
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                  {q.order_rate}% on time
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                  {q.ordered_within_7} of {q.measured} ordered ≤7 days
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Weekly table */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Weekly Breakdown
      </div>
      <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden' }}>
        {weekly.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
            No measure events synced yet. Trigger a calendar sync to populate data.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Week Of', 'Measured', '', 'Ordered ≤7 Days', 'Rate'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...weekly].reverse().map((row, i) => (
                <tr key={row.week_start} style={{ background: i % 2 === 0 ? '#1e293b' : '#192032' }}>
                  <td style={td}>{formatWeekLabel(row.week_start)}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#fff' }}>{row.measured}</td>
                  <td style={{ ...td, width: 140 }}>
                    <div style={{
                      height: 6, borderRadius: 3, background: '#036A43',
                      width: `${Math.round((row.measured / maxMeasured) * 120)}px`,
                      minWidth: 4,
                    }} />
                  </td>
                  <td style={td}>
                    <span style={{ color: '#94a3b8' }}>
                      {row.ordered_within_7}
                      <span style={{ color: '#334155' }}> / {row.measured}</span>
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12,
                      background: rateColor(row.order_rate) + '22',
                      color: rateColor(row.order_rate),
                    }}>
                      {row.order_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const td: React.CSSProperties = {
  padding: '11px 16px',
  color: '#cbd5e1',
  borderTop: '1px solid #0f172a',
}
