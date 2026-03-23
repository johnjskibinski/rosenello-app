'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { uploadJobDocs } from '@/lib/api'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

const STATUS_LABELS: Record<string, string> = {
  SN: 'Scope Needed', PU: 'Pickup Check', SS: 'Scope Scheduled',
  MR: 'In Review', D: 'Materials Ordered', B: 'In Progress',
  '1': 'In Progress', '2': 'In Progress', '3': 'In Progress',
  NS: 'Need to Schedule', SV: 'Site Visit', S: 'Scheduled',
  '5': 'In Progress', T: 'In Progress', SI: 'Scheduled Install',
  CM: 'Completed', U: 'Unpaid',
}

export default function JobDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`${BASE}/api/jobs`)
      .then(r => r.json())
      .then((jobs: any[]) => {
        const found = jobs.find(j => String(j.id) === String(id) || String(j.lp_job_id) === String(id))
        setJob(found || null)
        setLoading(false)
      })
  }, [id])

  async function handleUpload() {
    if (!job) return
    setUploading(true)
    setUploadError('')
    setUploadResult(null)
    try {
      const result = await uploadJobDocs(job.lp_job_id)
      setUploadResult(result)
      // Refresh job data to show new totals
      const jobs = await fetch(`${BASE}/api/jobs`).then(r => r.json())
      const updated = jobs.find((j: any) => j.lp_job_id === job.lp_job_id)
      if (updated) setJob(updated)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div style={{ padding: 32, color: '#fff' }}>Loading...</div>
  if (!job) return <div style={{ padding: 32, color: '#fff' }}>Job not found.</div>

  const hasTotals = job.total_units > 0 || job.total_windows > 0 || job.total_doors > 0
  const hasWorkOrder = Array.isArray(job.work_order_rows) && job.work_order_rows.length > 0

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => router.push('/')}
        style={{ background: 'none', border: 'none', color: '#F4C828', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 }}>
        ← Back to Board
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff' }}>
            {job.customer_first} {job.customer_last}
          </h1>
          <div style={{ color: '#aaa', marginTop: 4, fontSize: 14 }}>
            {job.address}, {job.city}, {job.state} {job.zip}
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: '#F4C828', color: '#036A43', fontWeight: 700, fontSize: 12, borderRadius: 999, padding: '3px 10px' }}>
              {STATUS_LABELS[job.lp_status] || job.lp_status}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#aaa', fontSize: 12 }}>LP Job #</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{job.lp_job_id}</div>
          {job.contract_id && <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>Contract: {job.contract_id}</div>}
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <InfoCard label="Gross Amount" value={`$${Number(job.gross_amount || 0).toLocaleString()}`} />
        <InfoCard label="Balance Due" value={`$${Number(job.balance_due || 0).toLocaleString()}`} />
        <InfoCard label="Salesperson" value={job.salesperson || '—'} />
        <InfoCard label="Installer 1" value={job.installer_1 || 'Unassigned'} />
        <InfoCard label="Installer 2" value={job.installer_2 || '—'} />
        <InfoCard label="Product" value={job.product || '—'} />
      </div>

      {/* Measure Sheet Link */}
      {job.measure_sheet_url && (
        <div style={{ marginBottom: 20 }}>
          <a href={job.measure_sheet_url} target="_blank" rel="noopener noreferrer"
            style={{ color: '#F4C828', fontWeight: 600, fontSize: 14 }}>
            📊 Open Measure Sheet →
          </a>
        </div>
      )}

      {/* Upload Docs Button */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={handleUpload}
          disabled={uploading || !job.measure_sheet_url}
          style={{
            background: uploading ? '#555' : '#036A43', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 15,
            cursor: uploading || !job.measure_sheet_url ? 'not-allowed' : 'pointer',
            opacity: !job.measure_sheet_url ? 0.5 : 1,
          }}>
          {uploading ? '⏳ Uploading to LP...' : '⬆ Upload Docs to LP'}
        </button>
        {job.docs_uploaded_at && (
          <span style={{ marginLeft: 14, color: '#aaa', fontSize: 13 }}>
            Last uploaded: {new Date(job.docs_uploaded_at).toLocaleString()}
          </span>
        )}
        {!job.measure_sheet_url && (
          <span style={{ marginLeft: 14, color: '#f87', fontSize: 13 }}>No measure sheet linked</span>
        )}
      </div>

      {/* Upload Result */}
      {uploadError && (
        <div style={{ background: '#3a1010', border: '1px solid #f87', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f87', fontSize: 14 }}>
          ✗ {uploadError}
        </div>
      )}
      {uploadResult && (
        <div style={{ background: '#0e2a1e', border: '1px solid #036A43', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
            {uploadResult.ok ? '✓ All docs uploaded successfully' : '⚠ Some docs failed'}
          </div>
          {uploadResult.results?.map((r: any) => (
            <div key={r.tabName} style={{ fontSize: 13, color: r.ok ? '#4ade80' : '#f87', marginBottom: 2 }}>
              {r.ok ? '✓' : '✗'} {r.tabName} {r.message ? `— ${r.message}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Project Totals */}
      {hasTotals && (
        <div style={{ background: '#1a2a1e', border: '1px solid #036A43', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#F4C828', marginBottom: 12, fontSize: 16 }}>
            📐 Project Totals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <TotalTile label="Total Windows" value={job.total_windows} />
            <TotalTile label="Total Doors"   value={job.total_doors} />
            <TotalTile label="Bay Windows"   value={job.bay_windows} />
            <TotalTile label="Bow Windows"   value={job.bow_windows} />
            <TotalTile label="Total Openings" value={job.total_openings} />
            <TotalTile label="Total Units"   value={job.total_units} highlight />
          </div>
        </div>
      )}

      {/* Work Order Rows 16–25 */}
      {hasWorkOrder && (
        <div style={{ background: '#111', border: '1px solid #333', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#F4C828', marginBottom: 12, fontSize: 16 }}>
            📋 Work Order (Rows 16–25)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {job.work_order_rows.map((row: any[], i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    {row.map((cell: any, j: number) => (
                      <td key={j} style={{ padding: '6px 10px', color: '#ddd', whiteSpace: 'nowrap' }}>
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function TotalTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#036A43' : '#0e1e14',
      border: `1px solid ${highlight ? '#4ade80' : '#2a3a2e'}`,
      borderRadius: 8, padding: '10px 14px', textAlign: 'center'
    }}>
      <div style={{ color: highlight ? '#fff' : '#aaa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 24, marginTop: 4 }}>{value ?? 0}</div>
    </div>
  )
}
