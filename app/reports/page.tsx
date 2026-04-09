'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const fmt = (n: number) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'
const fmtD = (n: number) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtP = (n: number) => n != null ? `${Number(n).toFixed(1)}%` : '—'

const PRODUCTS = ['Win', 'ED', 'PD', 'SR', 'Sid', 'FR', 'SG', 'MW', 'IntCarp', 'SVC']

const ninetyDaysAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().split('T')[0]
}

const today = () => new Date().toISOString().split('T')[0]

type ReportTab = 'financial' | 'mismeasure'

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('financial')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  // Filters
  const [startDate, setStartDate] = useState(ninetyDaysAgo())
  const [endDate, setEndDate] = useState(today())
  const [dateField, setDateField] = useState('completed_at')
  const [groupBy, setGroupBy] = useState('month')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [laborType, setLaborType] = useState('both')
  const [errorType, setErrorType] = useState('')
  const [mmStatus, setMmStatus] = useState('')

  const runReport = useCallback(async () => {
    setLoading(true)
    setData(null)
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        date_field: dateField,
        group_by: groupBy,
      })
      if (selectedProducts.length) params.set('product', selectedProducts.join(','))
      if (tab === 'financial') params.set('labor_type', laborType)
      if (tab === 'mismeasure' && errorType) params.set('error_type', errorType)
      if (tab === 'mismeasure' && mmStatus) params.set('status', mmStatus)

      const res = await fetch(`${API_URL}/api/reports/${tab}?${params}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [tab, startDate, endDate, dateField, groupBy, selectedProducts, laborType, errorType, mmStatus])

  useEffect(() => { runReport() }, [tab])

  const toggleProduct = (p: string) => {
    setSelectedProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const labelStyle = { fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 4, display: 'block' as const }
  const selectStyle = { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', outline: 'none' }
  const inputStyle = { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', outline: 'none' }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f3' }}>

        {/* Header */}
        <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Reports</div>
          <button
            onClick={() => window.print()}
            style={{ fontSize: 13, padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 500 }}
          >
            Export PDF
          </button>
        </div>

        {/* Tabs */}
        <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', display: 'flex', gap: 0 }}>
          {([['financial', 'Financial Summary'], ['mismeasure', 'Mismeasure Report']] as [ReportTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '12px 20px', fontSize: 13, fontWeight: tab === key ? 600 : 400, color: tab === key ? '#036A43' : '#888', borderBottom: tab === key ? '2px solid #036A43' : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* Filters */}
          <div className="no-print" style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #eee', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date Field</label>
                <select value={dateField} onChange={e => setDateField(e.target.value)} style={selectStyle}>
                  <option value="completed_at">Completion Date</option>
                  <option value="contract_date">Contract Date</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </div>
              {tab === 'financial' && (
                <div>
                  <label style={labelStyle}>Labor Type</label>
                  <select value={laborType} onChange={e => setLaborType(e.target.value)} style={selectStyle}>
                    <option value="both">All Labor</option>
                    <option value="inhouse">In-House Only</option>
                    <option value="sub">Sub Only</option>
                  </select>
                </div>
              )}
              {tab === 'mismeasure' && (
                <>
                  <div>
                    <label style={labelStyle}>Error Type</label>
                    <select value={errorType} onChange={e => setErrorType(e.target.value)} style={selectStyle}>
                      <option value="">All Types</option>
                      <option value="sales">Sales</option>
                      <option value="production">Production</option>
                      <option value="installer">Installer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={mmStatus} onChange={e => setMmStatus(e.target.value)} style={selectStyle}>
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Product filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>PRODUCT:</span>
              {PRODUCTS.map(p => (
                <button key={p} onClick={() => toggleProduct(p)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                    borderColor: selectedProducts.includes(p) ? '#036A43' : '#ddd',
                    background: selectedProducts.includes(p) ? '#036A43' : '#fff',
                    color: selectedProducts.includes(p) ? '#fff' : '#555',
                    fontWeight: selectedProducts.includes(p) ? 600 : 400 }}>
                  {p}
                </button>
              ))}
              {selectedProducts.length > 0 && (
                <button onClick={() => setSelectedProducts([])}
                  style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear
                </button>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button onClick={runReport} disabled={loading}
                style={{ fontSize: 13, padding: '8px 20px', borderRadius: 6, border: 'none', background: '#036A43', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Running...' : 'Run Report'}
              </button>
            </div>
          </div>

          {/* Print header */}
          <div className="print-only" style={{ display: 'none', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#036A43' }}>Rosenello {tab === 'financial' ? 'Financial Summary' : 'Mismeasure Report'}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {startDate} to {endDate} · Grouped by {groupBy} · Generated {new Date().toLocaleDateString()}
              {selectedProducts.length > 0 && ` · Products: ${selectedProducts.join(', ')}`}
            </div>
          </div>

          {/* Results */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Running report...</div>
          )}

          {!loading && data && tab === 'financial' && (
            <FinancialReport data={data} />
          )}

          {!loading && data && tab === 'mismeasure' && (
            <MismeasureReport data={data} />
          )}

          {!loading && !data && (
            <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Set filters and click Run Report</div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}

function FinancialReport({ data }: { data: any }) {
  const { rows, summary } = data
  if (!rows?.length) return <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>No data for selected filters</div>

  const thStyle = { textAlign: 'right' as const, padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 600, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' as const }
  const tdStyle = { textAlign: 'right' as const, padding: '8px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f5f5f5' }
  const tdL = { ...tdStyle, textAlign: 'left' as const }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Jobs', val: summary.job_count },
          { label: 'Gross Revenue', val: fmt(summary.gross) },
          { label: 'Total Cost', val: fmt(summary.total_cost) },
          { label: 'Gross Profit', val: fmt(summary.gross_profit), color: summary.gross_profit > 0 ? '#036A43' : '#c0392b' },
          { label: 'Margin', val: fmtP(summary.margin_pct), color: summary.margin_pct > 30 ? '#036A43' : summary.margin_pct > 15 ? '#f0a500' : '#c0392b' },
          { label: 'Mismeasure Cost', val: fmt(summary.mismeasure), color: '#c0392b' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', border: '1px solid #eee' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: (c as any).color || '#1a1a1a' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Period</th>
              <th style={thStyle}>Jobs</th>
              <th style={thStyle}>Gross</th>
              <th style={thStyle}>Materials</th>
              <th style={thStyle}>Labor (IH)</th>
              <th style={thStyle}>Labor (Sub)</th>
              <th style={thStyle}>Labor (?)</th>
              <th style={thStyle}>Commission</th>
              <th style={thStyle}>Finance</th>
              <th style={thStyle}>Mismeasure</th>
              <th style={thStyle}>Other</th>
              <th style={thStyle}>Total Cost</th>
              <th style={thStyle}>GP</th>
              <th style={thStyle}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.period} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={tdL}>{r.period}</td>
                <td style={tdStyle}>{r.job_count}</td>
                <td style={tdStyle}>{fmt(r.gross)}</td>
                <td style={tdStyle}>{fmt(r.materials)}</td>
                <td style={tdStyle}>{fmt(r.labor_inhouse)}</td>
                <td style={tdStyle}>{fmt(r.labor_sub)}</td>
                <td style={{ ...tdStyle, color: r.labor_ambiguous > 0 ? '#f0a500' : '#333' }}>{fmt(r.labor_ambiguous)}</td>
                <td style={tdStyle}>{fmt(r.commission)}</td>
                <td style={tdStyle}>{fmt(r.finance)}</td>
                <td style={{ ...tdStyle, color: r.mismeasure > 0 ? '#c0392b' : '#333' }}>{fmt(r.mismeasure)}</td>
                <td style={{ ...tdStyle, color: r.other > 0 ? '#888' : '#333' }}>{fmt(r.other)}</td>
                <td style={tdStyle}>{fmt(r.total_cost)}</td>
                <td style={{ ...tdStyle, color: r.gross_profit > 0 ? '#036A43' : '#c0392b', fontWeight: 600 }}>{fmt(r.gross_profit)}</td>
                <td style={{ ...tdStyle, color: r.margin_pct > 30 ? '#036A43' : r.margin_pct > 15 ? '#f0a500' : '#c0392b', fontWeight: 600 }}>{fmtP(r.margin_pct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8f8f8', fontWeight: 700 }}>
              <td style={{ ...tdL, fontWeight: 700 }}>Total</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{summary.job_count}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(summary.gross)}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(summary.materials)}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(summary.labor_inhouse)}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(summary.labor_sub)}</td>
              <td colSpan={5} />
              <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(summary.total_cost)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: summary.gross_profit > 0 ? '#036A43' : '#c0392b' }}>{fmt(summary.gross_profit)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: summary.margin_pct > 30 ? '#036A43' : '#f0a500' }}>{fmtP(summary.margin_pct)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function MismeasureReport({ data }: { data: any }) {
  const { rows, summary } = data

  const thStyle = { textAlign: 'left' as const, padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 600, borderBottom: '1px solid #eee' }
  const tdStyle = { padding: '8px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f5f5f5' }

  const errorColors: Record<string, string> = {
    sales: '#3b82f6', production: '#f0a500', installer: '#c0392b', other: '#888'
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Events', val: summary.total_events },
          { label: 'Jobs Affected', val: summary.total_jobs },
          { label: 'Units Affected', val: summary.total_units },
          { label: 'Total Cost', val: fmtD(summary.total_cost), color: '#c0392b' },
          { label: 'Pending Review', val: summary.pending, color: summary.pending > 0 ? '#f0a500' : '#036A43' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', border: '1px solid #eee' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: (c as any).color || '#1a1a1a' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* By error type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[['sales', 'Sales Error'], ['production', 'Production Error'], ['installer', 'Installer Error'], ['other', 'Other']].map(([key, label]) => (
          <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: `1px solid ${errorColors[key]}30` }}>
            <div style={{ fontSize: 11, color: errorColors[key], fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: errorColors[key] }}>{summary.by_error_type[key]}</div>
          </div>
        ))}
      </div>

      {!rows?.length ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>No mismeasures for selected filters</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Invoice Date</th>
                <th style={thStyle}>Cost</th>
                <th style={thStyle}>Units</th>
                <th style={thStyle}>Error Type</th>
                <th style={thStyle}>Comments</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.jobs?.customer_first} {r.jobs?.customer_last}</td>
                  <td style={tdStyle}>{r.jobs?.product}</td>
                  <td style={tdStyle}>{r.invoice_date}</td>
                  <td style={tdStyle}>{fmtD(r.cost)}</td>
                  <td style={tdStyle}>{r.unit_count || 1}</td>
                  <td style={tdStyle}>
                    {r.status === 'pending' ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fff8e6', color: '#f0a500', fontWeight: 600, border: '1px solid #f0a50030' }}>Pending</span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${errorColors[r.error_type]}15`, color: errorColors[r.error_type], fontWeight: 600 }}>
                        {r.error_type ? r.error_type.charAt(0).toUpperCase() + r.error_type.slice(1) : '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.lp_comments || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: r.status === 'pending' ? '#fff8e6' : '#e6f4ee', color: r.status === 'pending' ? '#f0a500' : '#036A43', fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
