'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/statuses'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const INSTALLERS = ['Jay W', 'Matt Burger', 'Mike', 'Joe', 'Scott', 'Ricardo', 'Mike K', 'Jeremiah Construction', 'Matus Construction', "Richy's Construction"]

const DOC_TYPES = [
  { label: 'Window Measure', id: 'ID16' },
  { label: 'Work Order',     id: 'ID26' },
  { label: 'Checklist',      id: 'ID37' },
  { label: 'Costing',        id: 'ID36' },
  { label: 'Labor Calc',     id: 'ID35' },
]

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

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [modal, setModal] = useState<'measure' | 'install' | 'docs' | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/jobs`)
      .then(r => r.json())
      .then(jobs => {
        const found = jobs.find((j: any) => String(j.lp_job_id) === String(id))
        setJob(found || null)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!job || newStatus === job.lp_status) return
    setStatusUpdating(true)
    try {
      const res = await fetch(`${API_URL}/api/jobs/${job.lp_job_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setJob((prev: any) => ({ ...prev, lp_status: updated.lp_status }))
      }
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDocUpload = async (docType: typeof DOC_TYPES[0], file: File) => {
    setUploadingDoc(docType.id)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docTypeId', docType.id)
      formData.append('lp_job_id', job.lp_job_id)
      const res = await fetch(`${API_URL}/api/jobs/${job.lp_job_id}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        alert(`${docType.label} uploaded successfully`)
      } else {
        alert('Upload failed')
      }
    } finally {
      setUploadingDoc(null)
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
  const existingDocs: string[] = (d.documents || []).map((doc: any) => doc.doctype || doc.documenttype || '')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      {modal === 'measure' && <ScheduleForm type="measure" job={job} onClose={() => setModal(null)} />}
      {modal === 'install' && <ScheduleForm type="install" job={job} onClose={() => setModal(null)} />}

      {modal === 'docs' && (
        <Modal title="Upload Documents" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Select a document type to upload a PDF</div>
            {DOC_TYPES.map(doc => {
              const uploaded = existingDocs.some(d => d.includes(doc.id) || d.toLowerCase().includes(doc.label.toLowerCase()))
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 7, border: `1px solid ${uploaded ? '#b6dfc9' : '#e5e5e3'}`, background: uploaded ? '#f0faf5' : '#fafaf8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{uploaded ? '✅' : '📄'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{doc.label}</div>
                      <div style={{ fontSize: 11, color: uploaded ? '#036A43' : '#aaa' }}>{uploaded ? 'Uploaded' : 'Not uploaded'}</div>
                    </div>
                  </div>
                  <label style={{ fontSize: 11, padding: '5px 12px', borderRadius: 5, border: '1px solid #ccc', background: '#fff', color: '#444', cursor: 'pointer', fontWeight: 500 }}>
                    {uploadingDoc === doc.id ? 'Uploading...' : 'Upload PDF'}
                    <input type="file" accept=".pdf" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(doc, f) }} />
                  </label>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #e0e0de', padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => window.history.back()} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Back</button>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{job.customer_first} {job.customer_last}</div>
          <span style={{ fontSize: 11, color: '#aaa' }}>{d.contractid}</span>
          <select
            value={job.lp_status}
            onChange={e => handleStatusChange(e.target.value)}
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
            <button onClick={() => setModal('docs')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer', fontWeight: 500 }}>📎 Documents</button>
            <a href={lpUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #036A43', color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>Open in LP</a>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>

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

        </div>
      </div>
    </div>
  )
}
