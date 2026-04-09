'use client'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface CostRow {
  id: string
  cost_type: string
  mat_type: string
  category: string
  is_sub: boolean | null
  total_cost: number
  invoice_date: string | null
  comments: string | null
  updated_at: string
}

interface Props {
  lpJobId: number
  jobStatus: string
  completedAt?: string | null
  grossAmount?: number
}

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n: number, gross: number) => gross > 0 ? `${((n / gross) * 100).toFixed(1)}%` : '—'

const CAT_ORDER = ['Materials', 'Labor', 'Commission', 'Finance', 'Credit Card Fee', 'Mismeasure', 'Other']
const CAT_COLOR: Record<string, string> = {
  Materials: '#1a6eb5', Labor: '#036A43', Commission: '#7c3aed',
  Finance: '#b45309', 'Credit Card Fee': '#b45309', Mismeasure: '#c0392b', Other: '#888'
}

export default function CostComparisonSection({ lpJobId, jobStatus, completedAt, grossAmount }: Props) {
  const [costs, setCosts] = useState<CostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showLines, setShowLines] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/costs/${lpJobId}`)
      .then(r => r.json())
      .then(data => { setCosts(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lpJobId])

  const estimated = costs.filter(c => c.cost_type === 'estimated')
  const actual = costs.filter(c => c.cost_type === 'actual')

  const estMaterials = estimated.find(c => c.category === 'Materials')?.total_cost ?? null
  const estLabor = estimated.find(c => c.category === 'Labor')?.total_cost ?? null
  const estTotal = (estMaterials ?? 0) + (estLabor ?? 0)

  const actMaterials = actual.filter(c => c.category === 'Materials').reduce((s, r) => s + r.total_cost, 0)
  const actLabor = actual.filter(c => c.category === 'Labor').reduce((s, r) => s + r.total_cost, 0)
  const actCommission = actual.filter(c => c.category === 'Commission').reduce((s, r) => s + r.total_cost, 0)
  const actFinance = actual.filter(c => c.category === 'Finance' || c.category === 'Credit Card Fee').reduce((s, r) => s + r.total_cost, 0)
  const actMismeasure = actual.filter(c => c.category === 'Mismeasure').reduce((s, r) => s + r.total_cost, 0)
  const actOther = actual.filter(c => !['Materials','Labor','Commission','Finance','Credit Card Fee','Mismeasure'].includes(c.category)).reduce((s, r) => s + r.total_cost, 0)
  const actTotal = actual.reduce((s, r) => s + r.total_cost, 0)

  const gross = grossAmount || 0
  const grossProfit = gross - actTotal
  const hasEstimated = estMaterials != null || estLabor != null
  const hasActual = actual.length > 0
  const isComplete = jobStatus === 'C'

  const varColor = (v: number | null) => v == null ? '#aaa' : v > 0 ? '#c0392b' : v < 0 ? '#036A43' : '#666'
  const varFmt = (v: number | null) => { if (v == null) return '—'; return `${v > 0 ? '+' : ''}${fmtD(v)}` }

  // Group actual line items by category
  const grouped: Record<string, CostRow[]> = {}
  for (const c of actual) {
    const cat = c.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(c)
  }

  if (loading) return null
  if (!hasEstimated && !hasActual) return null

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #eee', marginBottom: 12, gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Costs</div>
        {hasActual && (
          <button onClick={() => setShowLines(p => !p)}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid #ddd', background: '#f8f8f8', color: '#555', cursor: 'pointer' }}>
            {showLines ? 'Hide Line Items' : 'Show Line Items'}
          </button>
        )}
      </div>

      {/* % Summary cards */}
      {hasActual && gross > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Materials %', val: pct(actMaterials, gross), color: CAT_COLOR.Materials },
            { label: 'Labor %', val: pct(actLabor, gross), color: CAT_COLOR.Labor },
            { label: 'Commission %', val: pct(actCommission, gross), color: CAT_COLOR.Commission },
            { label: 'Gross Profit %', val: pct(grossProfit, gross), color: grossProfit >= 0 ? '#036A43' : '#c0392b' },
          ].map(c => (
            <div key={c.label} style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 500, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Est vs Actual summary table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: showLines ? 16 : 0 }}>
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
          {[
            { label: 'Materials', est: estMaterials, act: hasActual ? actMaterials : null, var: hasActual && estMaterials != null ? actMaterials - estMaterials : null },
            { label: 'Labor',     est: estLabor,     act: hasActual ? actLabor : null,     var: hasActual && estLabor != null ? actLabor - estLabor : null },
          ].map(row => (
            <tr key={row.label} style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>{row.label}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>{row.est != null ? fmtD(row.est) : '—'}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: hasActual ? '#333' : '#ccc' }}>{row.act != null ? fmtD(row.act) : '—'}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: varColor(row.var), fontWeight: 500 }}>{varFmt(row.var)}</td>
            </tr>
          ))}
          {hasActual && actCommission > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Commission</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>{fmtD(actCommission)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          {hasActual && actFinance > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Finance / Fees</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#333' }}>{fmtD(actFinance)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          {hasActual && actMismeasure > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#c0392b', fontWeight: 500 }}>Mismeasure</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#c0392b' }}>{fmtD(actMismeasure)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          {hasActual && actOther > 0 && (
            <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td style={{ padding: '6px 0', color: '#888', fontWeight: 500 }}>Other</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#ccc' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#888' }}>{fmtD(actOther)}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', color: '#aaa' }}>—</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 0', color: '#1a1a1a', fontWeight: 600 }}>Total</td>
            <td style={{ textAlign: 'right', padding: '8px 8px', color: '#1a1a1a', fontWeight: 600 }}>{hasEstimated ? fmtD(estTotal) : '—'}</td>
            <td style={{ textAlign: 'right', padding: '8px 8px', color: hasActual ? '#1a1a1a' : '#ccc', fontWeight: 600 }}>{hasActual ? fmtD(actTotal) : '—'}</td>
            <td style={{ textAlign: 'right', padding: '8px 0', color: varColor(hasActual && hasEstimated ? actTotal - estTotal : null), fontWeight: 600 }}>
              {varFmt(hasActual && hasEstimated ? actTotal - estTotal : null)}
            </td>
          </tr>
          {gross > 0 && hasActual && (
            <tr style={{ borderTop: '1px solid #eee', background: grossProfit >= 0 ? '#f0faf5' : '#fff5f5' }}>
              <td style={{ padding: '8px 0', color: grossProfit >= 0 ? '#036A43' : '#c0392b', fontWeight: 600 }}>Gross Profit</td>
              <td colSpan={2} style={{ textAlign: 'right', padding: '8px 8px', color: grossProfit >= 0 ? '#036A43' : '#c0392b', fontWeight: 700, fontSize: 14 }}>{fmtD(grossProfit)}</td>
              <td style={{ textAlign: 'right', padding: '8px 0', color: grossProfit >= 0 ? '#036A43' : '#c0392b', fontWeight: 600 }}>{pct(grossProfit, gross)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Line items */}
      {showLines && hasActual && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Line Items</div>
          {CAT_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CAT_COLOR[cat] || '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</div>
              {grouped[cat].map((r, i) => (
                <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 5, background: i % 2 === 0 ? '#f8f8f8' : '#fff', fontSize: 12 }}>
                  <div>
                    <span style={{ fontWeight: 500, color: '#333' }}>{r.mat_type}</span>
                    {r.is_sub === true && <span style={{ fontSize: 10, marginLeft: 6, color: '#7c3aed', background: '#f3e8ff', borderRadius: 3, padding: '1px 5px' }}>Sub</span>}
                    {r.is_sub === false && <span style={{ fontSize: 10, marginLeft: 6, color: '#036A43', background: '#e6f4ee', borderRadius: 3, padding: '1px 5px' }}>In-House</span>}
                    {r.comments && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>{r.comments}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {r.invoice_date && <span style={{ fontSize: 11, color: '#aaa' }}>{r.invoice_date}</span>}
                    <span style={{ fontWeight: 600, color: '#333' }}>{fmtD(r.total_cost)}</span>
                    {gross > 0 && <span style={{ fontSize: 11, color: '#aaa', minWidth: 40, textAlign: 'right' }}>{pct(r.total_cost, gross)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

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
