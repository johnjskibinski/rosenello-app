'use client'

import { useEffect, useState } from 'react'
import { getKpiUnitTotals } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

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

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#475569',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
}

const td: React.CSSProperties = {
  padding: '11px 16px',
  color: '#cbd5e1',
  borderTop: '1px solid #0f172a',
}

export default function KpiPage() {
  // Unit counts
  const [unitData, setUnitData] = useState<any>(null)
  const [unitLoading, setUnitLoading] = useState(true)
  const [unitError, setUnitError] = useState('')
  const [activePeriod, setActivePeriod] = useState<typeof PERIODS[number]>('month')

  // Measure velocity
  const [weekly, setWeekly] = useState<WeekRow[]>([])
  const [quarterly, setQuarterly] = useState<QuarterRow[]>([])
  const [velLoading, setVelLoading] = useState(true)
  const [velError, setVelError] = useState('')

  useEffect(() => {
    getKpiUnitTotals()
      .then(setUnitData)
      .catch((e: any) => setUnitError(e.message))
      .finally(() => setUnitLoading(false))

    fetch(`${API}/api/kpi/measure-velocity`)
      .then(r => r.json())
      .then(d => {
        setWeekly(d.weekly || [])
        setQuarterly(d.quarterly || [])
      })
      .catch(() => setVelError('Failed to load measure velocity'))
      .finally(() => setVelLoading(false))
  }, [])

  const periodData = unitData?.periods?.[activePeriod] || {}
  const monthlyKeys = Object.keys(unitData?.monthly || {})
  const maxMeasured = Math.max(...weekly.map(w => w.measured), 1)

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>KPI Dashboard</h1>
      <div style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Unit counts · Measure volume · Order turnaround</div>

      {/* ── UNIT COUNTS ── */}
      <div style={sectionLabel}>Unit Counts</div>

      {unitLoading ? (
        <div style={{ color: '#64748b', marginBottom: 32 }}>Loading unit data…</div>
      ) : unitError ? (
        <div style={{ color: '#ef4444', marginBottom: 32 }}>Error: {unitError}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setActivePeriod(p)}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: activePeriod === p ? '#036A43' : '#1e293b',
                  color: activePeriod === p ? '#fff' : '#94a3b8' }}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {METRICS.map(m => (
              <div key={m.key} style={{ background: '#1e293b', border: `1px solid ${m.color}44`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                <div style={{ color: m.color, fontWeight: 700, fontSize: 36, marginTop: 6 }}>{periodData[m.key] ?? 0}</div>
                <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{periodData.job_count ?? 0} job{periodData.job_count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
            <div style={{ fontWeight: 700, color: '#F4C828', fontSize: 15, marginBottom: 16 }}>12-Month Trend</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ color: '#64748b', fontWeight: 700, textAlign: 'left', padding: '6px 10px' }}>Month</th>
                    {METRICS.map(m => (
                      <th key={m.key} style={{ color: m.color, fontWeight: 700, textAlign: 'right', padding: '6px 10px', whiteSpace: 'nowrap' }}>{m.label}</th>
                    ))}
                    <th style={{ color: '#64748b', fontWeight: 700, textAlign: 'right', padding: '6px 10px' }}>Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyKeys.map((month, i) => {
                    const row = unitData.monthly[month]
                    const isCurrentMonth = i === monthlyKeys.length - 1
                    return (
                      <tr key={month} style={{ borderBottom: '1px solid #0f172a', background: isCurrentMonth ? '#0e2a1e' : 'transparent' }}>
                        <td style={{ color: isCurrentMonth ? '#F4C828' : '#cbd5e1', fontWeight: isCurrentMonth ? 700 : 400, padding: '7px 10px' }}>
                          {month} {isCurrentMonth ? '●' : ''}
                        </td>
                        {METRICS.map(m => (
                          <td key={m.key} style={{ color: '#fff', textAlign: 'right', padding: '7px 10px' }}>{row[m.key] ?? 0}</td>
                        ))}
                        <td style={{ color: '#64748b', textAlign: 'right', padding: '7px 10px' }}>{row.job_count ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MEASURE VELOCITY ── */}
      <div style={sectionLabel}>Measure Velocity</div>

      {velLoading ? (
        <div style={{ color: '#64748b', marginBottom: 32 }}>Loading velocity data…</div>
      ) : velError ? (
        <div style={{ color: '#ef4444', marginBottom: 32 }}>{velError}</div>
      ) : (
        <>
          {quarterly.length > 0 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              {quarterly.map(q => (
                <div key={q.quarter} style={{ background: '#1e293b', borderRadius: 10, padding: '18px 22px', minWidth: 170, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{q.quarter}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{q.measured}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 14 }}>jobs measured</div>
                  <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, background: rateColor(q.order_rate) + '22', color: rateColor(q.order_rate), fontWeight: 700, fontSize: 14 }}>
                    {q.order_rate}% on time
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{q.ordered_within_7} of {q.measured} ordered ≤7 days</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden', marginBottom: 40 }}>
            {weekly.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                No measure events synced yet. Trigger a calendar sync to populate data.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {['Week Of', 'Measured', '', 'Ordered ≤7 Days', 'Rate'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...weekly].reverse().map((row, i) => (
                    <tr key={row.week_start} style={{ background: i % 2 === 0 ? '#1e293b' : '#192032' }}>
                      <td style={td}>{formatWeekLabel(row.week_start)}</td>
                      <td style={{ ...td, fontWeight: 700, color: '#fff' }}>{row.measured}</td>
                      <td style={{ ...td, width: 140 }}>
                        <div style={{ height: 6, borderRadius: 3, background: '#036A43', width: `${Math.round((row.measured / maxMeasured) * 120)}px`, minWidth: 4 }} />
                      </td>
                      <td style={td}>
                        <span style={{ color: '#94a3b8' }}>{row.ordered_within_7}<span style={{ color: '#334155' }}> / {row.measured}</span></span>
                      </td>
                      <td style={td}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12, background: rateColor(row.order_rate) + '22', color: rateColor(row.order_rate) }}>
                          {row.order_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
