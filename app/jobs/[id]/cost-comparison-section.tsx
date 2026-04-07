'use client'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface CostRow {
  cost_type: string
  mat_type: string
  category: string
  total_cost: number
  updated_at: string
}

interface Props {
  lpJobId: number
  jobStatus: string
  completedAt?: string | null
}

const fmt = (n: number) => n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const pct = (n: number) => n != null ? `${n.toFixed(1)}%` : '—'

export default function CostComparisonSection({ lpJobId, jobStatus, completedAt }: Props) {
  const [costs, setCosts] = useState<CostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/costs/${lpJobId}`)
      .then(r => r.json())
      .then(data => {
        setCosts(data || [])
        const dates = (data || []).map((r: CostRow) => r.updated_at).filter(Boolean)
        if (dates.length) setLastUpdated(new Date(Math.max(...dates.map((d: string) => new Date(d).getTime()))).toLocaleDateString())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lpJobId])

  const estimated = costs.filter(c => c.cost_type === 'estimated')
  const actual = costs.filter(c => c.cost_type === 'actual')

  const estMaterials = estimated.find(c => c.category === 'Materials')?.total_cost ?? null
  const estLabor = estimated.find(c => c.category === 'Labor')?.total_cost ?? null
  const estTotal = (estMaterials ?? 0) + (estLabor ?? 0)

  const actMaterials = actual.filter(c => c.category === 'Materials').reduce((s, r) => s + (r.total_cost || 0), 0)
  const actLabor = actual.filter(c => c.category === 'Labor').reduce((s, r) => s + (r.total_cost || 0), 0)
  const actCommission = actual.filter(c => c.category === 'Commission').reduce((s, r) => s + (r.total_cost || 0), 0)
  const actFinance = actual.filter(c => c.category === 'Finance' || c.category === 'Credit Card Fee').reduce((s, r) => s + (r.total_cost || 0), 0)
  const actMismeasure = actual.filter(c => c.category === 'Mismeasure').reduce((s, r) => s + (r.total_cost || 0), 0)
  const actTotal = actual.reduce((s, r) => s + (r.total_cost || 0), 0)

  const hasEstimated = estMaterials != null || estLabor != null
  const hasActual = actual.length > 0
  const isComplete = jobStatus === 'C'

  const varMaterials = hasActual && estMaterials != null ? actMaterials - estMaterials : null
  const varLabor = hasActual && estLabor != null ? actLabor - estLabor : null
  const varTotal = hasActual && hasEstimated ? actTotal - estTotal : null

  const varColor = (v: number | null) => {
    if (v == null) return '#aaa'
    return v > 0 ? '#c0392b' : v < 0 ? '#036A43' : '#666'
  }

  const varFmt = (v: number | null) => {
    if (v == null) return '—'
    const sign = v > 0 ? '+' : ''
    return `${sign}${fmt(v)}`
  }

  if (loading) return null
  if (!hasEstimated && !hasActual) return null

  const rows = [
    { label: 'Materials', est: estMaterials, act: hasActual ? actMaterials : null, var: varMaterials },
    { label: 'Labor', est: estLabor, act: hasActual ? actLabor : null, var: varLabor },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #eee', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Job Costs
        </div>
        {lastUpdated && (
          <div style={{ fontSize: 10, color: '#aaa' }}>Updated {lastUpdated}</div>
        )}
      </div>

      {/* Estimated vs Actual table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '4px 0', color: '#aaa', fontWeight: 500, fontSize: 11 }}></th>
            <th style={{ textAlign: 'right', padding: '4px 8px', color: '#aaa', fontWeight: 500, fontSize: 11 }}>Estimated</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', color: '#aaa', fontWeight: 500, fontSize: 11 }}>
              {isComplete ? 'Actual' : <span style={{ color: '#f0a500' }}>Actual (pending)</span>}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', color: '#aaa', fontWeight: 500, fontSize: 11 }}>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>{row.label}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>
                {row.est != null ? fmt(row.est) : '—'}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: hasActual ? '#333' : '#ccc' }}>
                {row.act != null ? fmt(row.act) : '—'}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: varColor(row.var), fontWeight: 500 }}>
                {varFmt(row.var)}
              </td>
            </tr>
          ))}

          {/* Additional actual-only rows */}
          {hasActual && actCommission > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Commission</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>{fmt(actCommission)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          {hasActual && actFinance > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Finance / Fees</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>{fmt(actFinance)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          {hasActual && actMismeasure > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#c0392b', fontWeight: 500 }}>Mismeasure</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#c0392b' }}>{fmt(actMismeasure)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}

          {/* Total row */}
          <tr style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 0', color: '#1a1a1a', fontWeight: 600 }}>Total</td>
            <td style={{ textAlign: 'right', padding: '8px 8px', color: '#1a1a1a', fontWeight: 600 }}>
              {hasEstimated ? fmt(estTotal) : '—'}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 8px', color: hasActual ? '#1a1a1a' : '#ccc', fontWeight: 600 }}>
              {hasActual ? fmt(actTotal) : '—'}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 0', color: varColor(varTotal), fontWeight: 600 }}>
              {varFmt(varTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {!isComplete && hasActual && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#f0a500', background: '#fffbf0', borderRadius: 6, padding: '6px 10px' }}>
          Costs may still be pending — actuals pull for 220 days post-completion
        </div>
      )}

      {!hasActual && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#aaa', background: '#f8f8f8', borderRadius: 6, padding: '6px 10px' }}>
          Actual costs not yet available
        </div>
      )}
    </div>
  )
}
