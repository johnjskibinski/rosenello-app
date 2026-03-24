'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/statuses'
import NotesSection from './notes-section'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const INSTALLERS = ['Jay W', 'Matt Burger', 'Mike', 'Joe', 'Scott', 'Ricardo', 'Mike K', 'Jeremiah Construction', 'Matus Construction', "Richy's Construction"]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 480, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{title}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  )
}

function ScheduleForm({ type, job, onClose }: { type: 'measure' | 'install'; job: any; onClose: () => void }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('08:00')
  const [duration, setDuration] = useState('2')
  const [installer, setInstaller] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    alert(`${type === 'measure' ? 'Measure' : 'Installation'} scheduled for ${date} at ${time} — Calendar integration coming next session`)
    onClose()
  }

  return (
    <Modal title={type === 'measure' ? 'Schedule Measure' : 'Schedule Installation'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: '#888', background: '#f5f5f3', borderRadius: 6, padding: '8px 12px' }}>
          {job.customer_first} {job.customer_last} — {job.address}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Duration (hours)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="0.5" step="0.5"
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Installer</label>
            <select value={installer} onChange={e => setInstaller(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none', background: '#fff' }}>
              <option value="">Select installer...</option>
              {INSTALLERS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!date || saving}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: date ? '#036A43' : '#ccc', color: '#fff', cursor: date ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
            {saving ? 'Saving...' : `Schedule ${type === 'measure' ? 'Measure' : 'Install'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function StatusConfirmModal({
  job,
  pendingStatus,
  onConfirm,
  onCancel,
  saving,
  error,
}: {
  job: any
  pendingStatus: string
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
  error: string
}) {
  return (
    <Modal title="Confirm Status Change" onClose={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: '#666', background: '#f5f5f3', borderRadius: 6, padding: '8px 12px' }}>
          <span style={{ fontWeight: 500 }}>Job #{job.lp_job_id}</span> — {job.customer_first} {job.customer_last}
        </div>
        <div style={{ fontSize: 13, color: '#333', background: '#fffbea', border: '1px solid #f4e087', borderRadius: 6, padding: '10px 14px' }}>
          <span style={{ fontWeight: 600, color: '#b45309' }}>{job.lp_status}</span>
          <span style={{ margin: '0 8px', color: '#aaa' }}>→</span>
          <span style={{ fontWeight: 600, color: '#036A43' }}>{pendingStatus}</span>
          <span style={{ color: '#888', marginLeft: 6 }}>({STATUS_LABELS[pendingStatus] || pendingStatus})</span>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            This will update the status in both Lead Perfection and the production board.
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#fff5f5', border: '1px solid #f5c2c2', borderRadius: 6, padding: '8px 12px' }}>
            ⚠ {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={saving}
            style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: saving ? '#aaa' : '#036A43', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
            {saving ? 'Updating…' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [statusError, setStatusError] = useState('')
  const [modal, setModal] = useState<'measure' | 'install' | null>(null)
  const [uploading, setUploading] = useState<string | false>(false)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/jobs`)
      .then(r => r.json())
      .then(jobs => {
        const found = jobs.find((j: any) => String(j.lp_job_id) === String(id))
        setJob(found || null)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Called when user picks a new status from the dropdown — opens confirm modal
  const handleStatusSelect = (newStatus: string) => {
    if (!job || newStatus === job.lp_status) return
    setStatusError('')
    setPendingStatus(newStatus)
  }

  // Called when user clicks Confirm inside the modal — fires LP + Supabase
  const handleStatusConfirm = async () => {
    if (!job || !pendingStatus) return
    setStatusUpdating(true)
    setStatusError('')
    try {
      const res = await fetch(`${API_URL}/api/jobs/${job.lp_job_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setJob((prev: any) => ({ ...prev, lp_status: json.lp_status }))
      setPendingStatus(null)
    } catch (err: any) {
      setStatusError(err.message)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleUploadDocs = async (tabName?: string) => {
    if (!job) return
    setUploading(tabName || 'all')
    setUploadError('')
    setUploadResult(null)
    try {
      const url = tabName ? `${API_URL}/api/jobs/${job.lp_job_id}/upload-docs/${encodeURIComponent(tabName)}` : `${API_URL}/api/jobs/${job.lp_job_id}/upload-docs`
      const res = await fetch(url, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Upload failed')
      setUploadResult(result)
      const jobs = await fetch(`${API_URL}/api/jobs`).then(r => r.json())
      const updated = jobs.find((j: any) => j.lp_job_id === job.lp_job_id)
      if (updated) setJob(updated)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!job) return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>Job not found</div>
    </div>
  )

  const d = job.raw_lp_data || {}
  const installers = [d.installer1, d.installer2, d.installer3, d.installer4].filter(Boolean)
  const payments = d.payments || []
  const milestones = d.milestones || []
  const notes = d.notes || []
  const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.pmtamount || 0), 0)
  const balanceDue = parseFloat(d.grossamount || 0) - totalPaid
  const lpUrl = `https://e5d8a.leadperfection.com/jobdetail.html?jobid=${job.lp_job_id}`
  const hasTotals = job.total_units > 0 || job.total_windows > 0 || job.total_doors > 0
  const hasWorkOrder = Array.isArray(job.work_order_rows) && job.work_order_rows.length > 0

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      {modal === 'measure' && <ScheduleForm type="measure" job={job} onClose={() => setModal(null)} />}
      {modal === 'install' && <ScheduleForm type="install" job={job} onClose={() => setModal(null)} />}

      {/* Status confirmation modal */}
      {pendingStatus && (
        <StatusConfirmModal
          job={job}
          pendingStatus={pendingStatus}
          onConfirm={handleStatusConfirm}
          onCancel={() => { setPendingStatus(null); setStatusError('') }}
          saving={statusUpdating}
          error={statusError}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e0e0de', padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => window.history.back()} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Back</button>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{job.customer_first} {job.customer_last}</div>
          <span style={{ fontSize: 11, color: '#aaa' }}>{d.contractid}</span>
          <select
            value={job.lp_status}
            onChange={e => handleStatusSelect(e.target.value)}
            disabled={statusUpdating}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #b6dfc9', background: '#f0faf5', color: '#036A43', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
          >
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
          </select>
          {statusUpdating && <span style={{ fontSize: 11, color: '#aaa' }}>Saving...</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {job.measure_sheet_url && (
              <a href={job.measure_sheet_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #b6dfc9', background: '#f0faf5', color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>
                📋 Measure Sheet
              </a>
            )}
            <button onClick={() => setModal('measure')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer', fontWeight: 500 }}>📐 Schedule Measure</button>
            <button onClick={() => setModal('install')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer', fontWeight: 500 }}>🔨 Schedule Install</button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUploadMenuOpen(o => !o)}
                disabled={!!uploading || !job.measure_sheet_url}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: uploading ? '#aaa' : '#036A43', color: '#fff', cursor: !!uploading || !job.measure_sheet_url ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: !job.measure_sheet_url ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? '⏳ Uploading...' : '⬆ Upload Docs'} <span style={{ fontSize: 10 }}>▼</span>
              </button>
              {uploadMenuOpen && !uploading && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid #e0e0de', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 180, overflow: 'hidden' }}>
                  {[
                    { label: '⬆ Upload All', tab: undefined },
                    { label: 'Costing', tab: 'Costing' },
                    { label: 'Window Measure', tab: 'Window Measure' },
                    { label: 'Work Order', tab: 'Work Order' },
                    { label: 'Checklist', tab: 'Checklist' },
                    { label: 'Labor Calc', tab: 'LaborCalc' },
                  ].map((item, i) => (
                    <button key={i}
                      onClick={() => { setUploadMenuOpen(false); handleUploadDocs(item.tab) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, border: 'none', borderBottom: i === 0 ? '1px solid #e0e0de' : 'none', background: i === 0 ? '#f5f5f3' : '#fff', color: '#1a1a1a', cursor: 'pointer', fontWeight: i === 0 ? 600 : 400 }}>
                      {i > 0 && <span style={{ color: '#036A43', marginRight: 6 }}>⬆</span>}{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href={lpUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #036A43', color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>Open in LP</a>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>

          {(uploadResult || uploadError) && (
            <div style={{ gridColumn: '1 / -1', borderRadius: 8, padding: '10px 14px', fontSize: 13, border: `1px solid ${uploadError ? '#f5c2c2' : '#b6dfc9'}`, background: uploadError ? '#fff5f5' : '#f0faf5', color: uploadError ? '#A32D2D' : '#036A43' }}>
              {uploadError ? `✗ ${uploadError}` : (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{uploadResult.ok ? '✓ All docs uploaded to LP' : '⚠ Some docs failed'}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {uploadResult.results?.map((r: any) => (
                      <span key={r.tabName} style={{ fontSize: 12, color: r.ok ? '#036A43' : '#A32D2D' }}>
                        {r.ok ? '✓' : '✗'} {r.tabName}
                      </span>
                    ))}
                  </div>
                  {job.docs_uploaded_at && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Uploaded: {new Date(job.docs_uploaded_at).toLocaleString()}</div>}
                </div>
              )}
            </div>
          )}

          {hasTotals && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, border: '1px solid #b6dfc9', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Totals</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {[
                  { label: 'Windows',       val: job.total_windows },
                  { label: 'Doors',         val: job.total_doors },
                  { label: 'Bay Windows',   val: job.bay_windows },
                  { label: 'Bow Windows',   val: job.bow_windows },
                  { label: 'Total Openings',val: job.total_openings },
                  { label: 'Total Units',   val: job.total_units, highlight: true },
                ].map(t => (
                  <div key={t.label} style={{ background: t.highlight ? '#036A43' : '#f5f5f3', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: t.highlight ? 'rgba(255,255,255,0.8)' : '#888', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.highlight ? '#fff' : '#1a1a1a' }}>{t.val ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{job.customer_first} {job.customer_last}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{d.address1}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{d.city}, {d.state} {d.zip}</div>
            {d.phone1 && <div style={{ fontSize: 12, color: '#036A43', marginBottom: 2 }}>Phone: {d.phone1}</div>}
            {d.email && <div style={{ fontSize: 12, color: '#036A43' }}>Email: {d.email}</div>}
          </div>

          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Details</div>
            {[
              { label: 'Contract #', val: d.contractid },
              { label: 'LP Job #', val: job.lp_job_id },
              { label: 'Product', val: [d.productid, d.productid2].filter(Boolean).join(', ') },
              { label: 'Salesperson', val: d.salesrepname },
              { label: 'Contract date', val: d.contractdate ? new Date(d.contractdate).toLocaleDateString() : '' },
              { label: 'Installers', val: installers.join(', ') || 'Unassigned' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f5f5f3' }}>
                <span style={{ color: '#888' }}>{row.label}</span>
                <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{row.val || '—'}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financials</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Contract amount', val: `$${Number(d.grossamount || 0).toLocaleString()}`, color: '#1a1a1a' },
                { label: 'Paid', val: `$${totalPaid.toLocaleString()}`, color: '#036A43' },
                { label: 'Balance due', val: `$${balanceDue.toLocaleString()}`, color: balanceDue > 0 ? '#A32D2D' : '#036A43' },
              ].map(f => (
                <div key={f.label} style={{ flex: 1, background: '#f5f5f3', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: f.color }}>{f.val}</div>
                </div>
              ))}
            </div>
            {payments.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f5f5f3' }}>
                <span style={{ color: '#666' }}>{new Date(p.pmtdate).toLocaleDateString()} · {p.pmttype}</span>
                <span style={{ fontWeight: 500, color: '#036A43' }}>${Number(p.pmtamount).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</div>
            {notes.length === 0 ? (
              <div style={{ fontSize: 12, color: '#bbb' }}>No notes</div>
            ) : notes.map((n: any, i: number) => (
              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f5f5f3' }}>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>{new Date(n.enteredon).toLocaleDateString()} · {n.enteredby}</div>
                <div style={{ fontSize: 12, color: '#333' }}>{n.note}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milestones</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {milestones.map((m: any, i: number) => (
                <div key={i} style={{ background: m.actdate ? '#e6f4ee' : '#f5f5f3', borderRadius: 6, padding: '6px 10px', minWidth: 120 }}>
                  <div style={{ fontSize: 10, color: m.actdate ? '#036A43' : '#aaa', fontWeight: 500 }}>{m.datetype}</div>
                  <div style={{ fontSize: 11, color: m.actdate ? '#036A43' : '#bbb' }}>
                    {m.actdate ? new Date(m.actdate).toLocaleDateString() : m.estdate ? `Est: ${new Date(m.estdate).toLocaleDateString()}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasWorkOrder && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, border: '1px solid #e0e0de', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Order (Rows 16–25)</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {job.work_order_rows.map((row: any[], i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f3' }}>
                        {row.map((cell: any, j: number) => (
                          <td key={j} style={{ padding: '5px 8px', color: '#333', whiteSpace: 'nowrap' }}>
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

          <NotesSection lpJobId={job.lp_job_id} />

        </div>
      </div>
    </div>
  )
}
