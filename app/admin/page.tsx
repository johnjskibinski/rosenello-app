'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

interface Job {
  lp_job_id: number
  customer_first: string
  customer_last: string
  address: string
  city: string
  state: string
  contract_date: string | null
  companycam_project_id: string | null
  companycam_url: string | null
  companycam_checked_at: string | null
  lp_status: string
}

interface Installer {
  id: string
  name: string
  initials: string
  active: boolean
  sort_order: number
}

function parseProjectId(input: string): string | null {
  const trimmed = input.trim()
  // Full URL: https://app.companycam.com/projects/12345678
  const urlMatch = trimmed.match(/companycam\.com\/projects\/(\d+)/)
  if (urlMatch) return urlMatch[1]
  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed
  return null
}

export default function AdminPage() {
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')
  const [installers, setInstallers] = useState<Installer[]>([])
  const [installerLoading, setInstallerLoading] = useState(true)
  const [newInstallerName, setNewInstallerName] = useState('')
  const [newInstallerInitials, setNewInstallerInitials] = useState('')
  const [addingInstaller, setAddingInstaller] = useState(false)
  const [removingInstaller, setRemovingInstaller] = useState<string | null>(null)
  const [pushingSheet, setPushingSheet] = useState(false)
  const [sheetPushMsg, setSheetPushMsg] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/jobs`)
      const data = await res.json()
      if (Array.isArray(data)) setAllJobs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInstallers = useCallback(async () => {
    setInstallerLoading(true)
    try {
      const res = await fetch(`${API}/api/calendar/installers`)
      const data = await res.json()
      if (Array.isArray(data)) setInstallers(data)
    } catch (err) { console.error(err) }
    finally { setInstallerLoading(false) }
  }, [])

  const handleAddInstaller = async () => {
    if (!newInstallerName.trim()) return
    setAddingInstaller(true)
    try {
      const res = await fetch(`${API}/api/calendar/installers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInstallerName.trim(), initials: newInstallerInitials.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setNewInstallerName('')
      setNewInstallerInitials('')
      await fetchInstallers()
    } catch (err) { console.error(err) }
    finally { setAddingInstaller(false) }
  }

  const handleRemoveInstaller = async (id: string) => {
    setRemovingInstaller(id)
    try {
      await fetch(`${API}/api/calendar/installers/${id}`, { method: 'DELETE' })
      await fetchInstallers()
    } catch (err) { console.error(err) }
    finally { setRemovingInstaller(null) }
  }

  useEffect(() => { fetchJobs(); fetchInstallers() }, [fetchJobs, fetchInstallers])

  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  const filteredJobs = allJobs.filter(job => {
    // Search mode — show any job matching search regardless of CC status or date
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        String(job.lp_job_id).includes(q) ||
        (job.customer_last || '').toLowerCase().includes(q) ||
        (job.customer_first || '').toLowerCase().includes(q) ||
        (job.address || '').toLowerCase().includes(q) ||
        (job.city || '').toLowerCase().includes(q)
      )
    }

    // Default: unlinked jobs with contract date within past 2 months
    if (showAll) {
      const hasDate = job.contract_date && new Date(job.contract_date) >= twoMonthsAgo
      return hasDate
    }

    const unlinked = !job.companycam_project_id
    const hasRecentDate = job.contract_date && new Date(job.contract_date) >= twoMonthsAgo
    return unlinked && hasRecentDate
  })

  const handleSave = async (job: Job) => {
    const input = (inputs[job.lp_job_id] || '').trim()
    if (!input) return

    const projectId = parseProjectId(input)
    if (!projectId) {
      setErrors(prev => ({ ...prev, [job.lp_job_id]: 'Invalid URL or ID' }))
      return
    }

    setSaving(job.lp_job_id)
    setErrors(prev => ({ ...prev, [job.lp_job_id]: '' }))

    try {
      const res = await fetch(`${API}/api/jobs/${job.lp_job_id}/companycam-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companycam_project_id: projectId }),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setAllJobs(prev => prev.map(j => j.lp_job_id === job.lp_job_id ? { ...j, ...updated } : j))
      setInputs(prev => ({ ...prev, [job.lp_job_id]: '' }))
      setSaved(prev => ({ ...prev, [job.lp_job_id]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [job.lp_job_id]: false })), 3000)
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [job.lp_job_id]: err.message }))
    } finally {
      setSaving(null)
    }
  }

  const handleBackfill = async () => {
    setBackfilling(true)
    setBackfillMsg('')
    try {
      const res = await fetch(`${API}/api/jobs/backfill-companycam`, { method: 'POST' })
      const data = await res.json()
      setBackfillMsg(data.message || 'Backfill started')
      setTimeout(() => fetchJobs(), 5000)
    } catch (err) {
      setBackfillMsg('Backfill request failed')
    } finally {
      setBackfilling(false)
    }
  }

  const handlePushSheet = async () => {
    setPushingSheet(true)
    setSheetPushMsg('')
    try {
      const res = await fetch(`${API}/api/jobs/push-suggestions-sheet`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Push failed')
      setSheetUrl(data.url || '')
      setSheetPushMsg(`✓ Sheet updated — ${data.rows} row${data.rows !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setSheetPushMsg(`✗ ${err.message}`)
    } finally {
      setPushingSheet(false)
    }
  }

  const unlinkedCount = allJobs.filter(j => !j.companycam_project_id && j.contract_date && new Date(j.contract_date) >= twoMonthsAgo).length

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Admin</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Settings & Tools</h1>
        </div>

        {/* CompanyCam Link Manager */}
        <div style={{ background: '#fff', border: '1px solid #e0e0de', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0de', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>📸 CompanyCam Link Manager</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                {unlinkedCount} unlinked job{unlinkedCount !== 1 ? 's' : ''} in the past 2 months
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: backfilling ? 'not-allowed' : 'pointer', opacity: backfilling ? 0.6 : 1 }}>
                {backfilling ? 'Running…' : '🔄 Re-run Auto-match'}
              </button>
            </div>
          </div>

          {backfillMsg && (
            <div style={{ padding: '10px 20px', background: '#f0faf5', borderBottom: '1px solid #e0e0de', fontSize: 12, color: '#036A43' }}>
              {backfillMsg}
            </div>
          )}

          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e0e0de', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, address, city, or job ID…"
              style={{ flex: 1, minWidth: 240, fontSize: 13, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
            />
            {!search && (
              <button
                onClick={() => setShowAll(v => !v)}
                style={{ fontSize: 12, padding: '8px 14px', borderRadius: 6, border: '1px solid #ddd', background: showAll ? '#036A43' : '#fff', color: showAll ? '#fff' : '#333', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {showAll ? '✓ Showing All' : 'Show All (2 mo)'}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading jobs…</div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>
              {search ? 'No jobs match your search.' : 'All recent jobs are linked to CompanyCam. 🎉'}
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1.6fr', gap: 12, padding: '10px 20px', background: '#f9f9f8', borderBottom: '1px solid #e0e0de', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <div>Customer</div>
                <div>Address</div>
                <div>CC Status</div>
                <div>Set CompanyCam URL</div>
              </div>

              {filteredJobs.map(job => (
                <div key={job.lp_job_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1.6fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f0f0ee', alignItems: 'center' }}>
                  {/* Customer */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{job.customer_last}, {job.customer_first}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>#{job.lp_job_id}</div>
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div>{job.address || '—'}</div>
                    <div>{job.city}, {job.state}</div>
                  </div>

                  {/* CC Status */}
                  <div>
                    {job.companycam_project_id ? (
                      <div>
                        <a href={job.companycam_url || `https://app.companycam.com/projects/${job.companycam_project_id}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>
                          ✓ Linked #{job.companycam_project_id}
                        </a>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Click to verify →</div>
                      </div>
                    ) : job.companycam_checked_at ? (
                      <span style={{ fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>⚠ No match found</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#aaa' }}>Not checked</span>
                    )}
                  </div>

                  {/* Manual link input */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={inputs[job.lp_job_id] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [job.lp_job_id]: e.target.value }))}
                      placeholder="Paste CompanyCam URL…"
                      style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6, border: `1px solid ${errors[job.lp_job_id] ? '#f5c2c2' : '#ccc'}`, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(job) }}
                    />
                    <button
                      onClick={() => handleSave(job)}
                      disabled={saving === job.lp_job_id || !inputs[job.lp_job_id]?.trim()}
                      style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: 'none', background: saved[job.lp_job_id] ? '#6aa84f' : saving === job.lp_job_id ? '#aaa' : '#036A43', color: '#fff', cursor: saving === job.lp_job_id || !inputs[job.lp_job_id]?.trim() ? 'not-allowed' : 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {saved[job.lp_job_id] ? '✓ Saved' : saving === job.lp_job_id ? '…' : 'Save'}
                    </button>
                  </div>
                  {errors[job.lp_job_id] && (
                    <div style={{ gridColumn: '4', fontSize: 11, color: '#A32D2D', marginTop: -8 }}>{errors[job.lp_job_id]}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Installer Manager */}
        <div style={{ background: '#fff', border: '1px solid #e0e0de', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0de' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>👷 Installer Manager</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Manage crew names and initials used in calendar scheduling</div>
          </div>

          {/* Add installer */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e0e0de', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={newInstallerName}
              onChange={e => setNewInstallerName(e.target.value)}
              placeholder="Full name (e.g. Jay W)"
              style={{ flex: 2, minWidth: 160, fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddInstaller() }}
            />
            <input
              value={newInstallerInitials}
              onChange={e => setNewInstallerInitials(e.target.value)}
              placeholder="Initials (e.g. JW)"
              style={{ flex: 1, minWidth: 100, fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddInstaller() }}
            />
            <button
              onClick={handleAddInstaller}
              disabled={addingInstaller || !newInstallerName.trim()}
              style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: addingInstaller || !newInstallerName.trim() ? '#aaa' : '#036A43', color: '#fff', cursor: addingInstaller || !newInstallerName.trim() ? 'not-allowed' : 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {addingInstaller ? 'Adding…' : '+ Add Installer'}
            </button>
          </div>

          {/* Installer list */}
          {installerLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading…</div>
          ) : installers.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No installers yet.</div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: 12, padding: '10px 20px', background: '#f9f9f8', borderBottom: '1px solid #e0e0de', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <div>Name</div>
                <div>Initials</div>
                <div></div>
              </div>
              {installers.map(installer => (
                <div key={installer.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: 12, padding: '11px 20px', borderBottom: '1px solid #f0f0ee', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{installer.name}</div>
                  <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{installer.initials || '—'}</div>
                  <div>
                    <button
                      onClick={() => handleRemoveInstaller(installer.id)}
                      disabled={removingInstaller === installer.id}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #f5c2c2', background: '#fff5f5', color: '#A32D2D', cursor: 'pointer' }}>
                      {removingInstaller === installer.id ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Installer Suggestions Sheet */}
        <div style={{ background: '#fff', border: '1px solid #e0e0de', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0de', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>📊 Installer Suggestions Sheet</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Push all crew assignment suggestions to a sortable Google Sheet</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {sheetPushMsg && (
                <span style={{ fontSize: 12, color: sheetPushMsg.startsWith('✓') ? '#036A43' : '#A32D2D' }}>{sheetPushMsg}</span>
              )}
              {sheetUrl && (
                <a href={sheetUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #b6dfc9', background: '#f0faf5', color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>
                  📋 Open Sheet
                </a>
              )}
              <button
                onClick={handlePushSheet}
                disabled={pushingSheet}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: 'none', background: pushingSheet ? '#aaa' : '#036A43', color: '#fff', cursor: pushingSheet ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                {pushingSheet ? '⏳ Updating…' : '🔄 Update Sheet'}
              </button>
            </div>
          </div>
          <div style={{ padding: '14px 20px', fontSize: 12, color: '#888' }}>
            Columns: Last Name · First Name · City · State · Job Status · Unit Count · Gross Amount · Job Type · Installer 1 · Installer 2 · Notes
            <div style={{ marginTop: 6, fontSize: 11, color: '#bbb' }}>All columns sortable. Update Sheet refreshes all rows — no duplicates.</div>
          </div>
        </div>

      </div>
    </div>
  )
}
