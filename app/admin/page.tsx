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
  const urlMatch = trimmed.match(/companycam\.com\/projects\/(\d+)/)
  if (urlMatch) return urlMatch[1]
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
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameInputs, setRenameInputs] = useState<Record<string, { name: string; initials: string }>>({})
  const [renameSaving, setRenameSaving] = useState<string | null>(null)
  const [deleteWarning, setDeleteWarning] = useState<any>(null)
  const [pushingSheet, setPushingSheet] = useState(false)
  const [sheetPushMsg, setSheetPushMsg] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<any>(null)

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

  const handleRemoveInstaller = async (id: string, name: string) => {
    setRemovingInstaller(id)
    setDeleteWarning(null)
    try {
      const res = await fetch(`${API}/api/calendar/installers/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        setDeleteWarning({ id, name, affectedJobs: data.affectedJobs })
      } else {
        await fetchInstallers()
      }
    } catch (err) { console.error(err) }
    finally { setRemovingInstaller(null) }
  }

  const handleForceRemove = async (id: string) => {
    setRemovingInstaller(id)
    try {
      await fetch(`${API}/api/calendar/installers/${id}?force=true`, { method: 'DELETE' })
      setDeleteWarning(null)
      await fetchInstallers()
    } catch (err) { console.error(err) }
    finally { setRemovingInstaller(null) }
  }

  const handleRenameInstaller = async (installer: Installer) => {
    const inputs = renameInputs[installer.id]
    if (!inputs?.name?.trim()) return
    setRenameSaving(installer.id)
    try {
      const res = await fetch(`${API}/api/calendar/installers/${installer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputs.name.trim(), initials: inputs.initials?.trim() }),
      })
      if (!res.ok) throw new Error('Rename failed')
      setRenaming(null)
      await fetchInstallers()
    } catch (err) { console.error(err) }
    finally { setRenameSaving(null) }
  }

  const handleCsvImport = async () => {
    if (!csvFile) return
    setCsvImporting(true)
    setCsvResult(null)
    try {
      const text = await csvFile.text()
      const res = await fetch(`${API}/api/costs/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setCsvResult(data)
      setCsvFile(null)
      // reset file input
      const input = document.getElementById('csv-file-input') as HTMLInputElement
      if (input) input.value = ''
    } catch (err: any) {
      setCsvResult({ error: err.message })
    } finally {
      setCsvImporting(false)
    }
  }

  useEffect(() => { fetchJobs(); fetchInstallers() }, [fetchJobs, fetchInstallers])

  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  const filteredJobs = allJobs.filter(job => {
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

  const handleImportBacklog = async () => {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch(`${API}/api/jobs/import-backlog-sheet`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportResult(data)
    } catch (err: any) {
      setImportResult({ error: err.message })
    } finally {
      setImporting(false)
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

        {/* LP Cost CSV Import */}
        <div style={{ background: '#fff', border: '1px solid #e0e0de', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0de' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>💰 LP Cost CSV Import</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
              Export the line-item cost report from LP with a wide date range (go back 18+ months) and upload it here.
              Each import fully replaces cost data for the jobs included in the file — safe to run as often as needed.
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={e => { setCsvFile(e.target.files?.[0] || null); setCsvResult(null) }}
              style={{ fontSize: 13, color: '#333', flex: 1, minWidth: 200 }}
            />
            <button
              onClick={handleCsvImport}
              disabled={!csvFile || csvImporting}
              style={{
                fontSize: 13, padding: '8px 20px', borderRadius: 6, border: 'none',
                background: !csvFile || csvImporting ? '#aaa' : '#036A43',
                color: '#fff', cursor: !csvFile || csvImporting ? 'not-allowed' : 'pointer',
                fontWeight: 600, whiteSpace: 'nowrap'
              }}
            >
              {csvImporting ? '⏳ Importing…' : '⬆ Import CSV'}
            </button>
          </div>
          {csvFile && !csvImporting && !csvResult && (
            <div style={{ padding: '0 20px 14px', fontSize: 12, color: '#888' }}>
              Ready to import: <strong style={{ color: '#333' }}>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
          {csvImporting && (
            <div style={{ padding: '0 20px 14px', fontSize: 12, color: '#888' }}>
              Importing — this may take 30–60 seconds for large files…
            </div>
          )}
          {csvResult && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e0e0de', fontSize: 13 }}>
              {csvResult.error ? (
                <div style={{ color: '#A32D2D', fontWeight: 500 }}>✗ {csvResult.error}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ color: '#036A43', fontWeight: 600 }}>
                    ✓ Import complete
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: '#555' }}>
                    <span>Jobs affected: <strong>{csvResult.jobsAffected}</strong></span>
                    <span>Rows imported: <strong>{csvResult.rowsImported}</strong></span>
                    {csvResult.mismeasuresCreated > 0 && (
                      <span>Mismeasures logged: <strong>{csvResult.mismeasuresCreated}</strong></span>
                    )}
                  </div>
                  {csvResult.unknownMatTypes?.length > 0 && (
                    <div style={{ fontSize: 12, color: '#854F0B', background: '#fff8f0', borderRadius: 6, padding: '8px 12px', marginTop: 4 }}>
                      ⚠ Unknown mat types (not classified): {csvResult.unknownMatTypes.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
              <button onClick={handleBackfill} disabled={backfilling}
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, address, city, or job ID…"
              style={{ flex: 1, minWidth: 240, fontSize: 13, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }} />
            {!search && (
              <button onClick={() => setShowAll(v => !v)}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1.6fr', gap: 12, padding: '10px 20px', background: '#f9f9f8', borderBottom: '1px solid #e0e0de', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <div>Customer</div><div>Address</div><div>CC Status</div><div>Set CompanyCam URL</div>
              </div>
              {filteredJobs.map(job => (
                <div key={job.lp_job_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1.6fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f0f0ee', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{job.customer_last}, {job.customer_first}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>#{job.lp_job_id}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div>{job.address || '—'}</div>
                    <div>{job.city}, {job.state}</div>
                  </div>
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
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={inputs[job.lp_job_id] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [job.lp_job_id]: e.target.value }))}
                      placeholder="Paste CompanyCam URL…"
                      style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6, border: `1px solid ${errors[job.lp_job_id] ? '#f5c2c2' : '#ccc'}`, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(job) }} />
                    <button onClick={() => handleSave(job)}
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
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e0e0de', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={newInstallerName} onChange={e => setNewInstallerName(e.target.value)}
              placeholder="Full name (e.g. Jay W)"
              style={{ flex: 2, minWidth: 160, fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddInstaller() }} />
            <input value={newInstallerInitials} onChange={e => setNewInstallerInitials(e.target.value)}
              placeholder="Initials (e.g. JW)"
              style={{ flex: 1, minWidth: 100, fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddInstaller() }} />
            <button onClick={handleAddInstaller} disabled={addingInstaller || !newInstallerName.trim()}
              style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: addingInstaller || !newInstallerName.trim() ? '#aaa' : '#036A43', color: '#fff', cursor: addingInstaller || !newInstallerName.trim() ? 'not-allowed' : 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {addingInstaller ? 'Adding…' : '+ Add Installer'}
            </button>
          </div>
          {installerLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading…</div>
          ) : installers.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No installers yet.</div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 200px', gap: 12, padding: '10px 20px', background: '#f9f9f8', borderBottom: '1px solid #e0e0de', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <div>Name</div><div>Initials</div><div>Actions</div>
              </div>
              {installers.map(installer => (
                <div key={installer.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 200px', gap: 12, padding: '11px 20px', borderBottom: deleteWarning?.id === installer.id ? 'none' : '1px solid #f0f0ee', alignItems: 'center', background: deleteWarning?.id === installer.id ? '#fff8f0' : renaming === installer.id ? '#f0faf5' : '#fff' }}>
                    {renaming === installer.id ? (
                      <>
                        <input
                          value={renameInputs[installer.id]?.name ?? installer.name}
                          onChange={e => setRenameInputs(p => ({ ...p, [installer.id]: { ...p[installer.id], name: e.target.value } }))}
                          style={{ fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid #b6dfc9', outline: 'none' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Escape') setRenaming(null) }}
                        />
                        <input
                          value={renameInputs[installer.id]?.initials ?? installer.initials}
                          onChange={e => setRenameInputs(p => ({ ...p, [installer.id]: { ...p[installer.id], initials: e.target.value } }))}
                          style={{ fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid #b6dfc9', outline: 'none', fontFamily: 'monospace' }}
                          onKeyDown={e => { if (e.key === 'Escape') setRenaming(null) }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleRenameInstaller(installer)} disabled={renameSaving === installer.id}
                            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: 'none', background: renameSaving === installer.id ? '#aaa' : '#036A43', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                            {renameSaving === installer.id ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setRenaming(null)}
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 5, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{installer.name}</div>
                        <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{installer.initials || '—'}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setRenaming(installer.id); setDeleteWarning(null); setRenameInputs(p => ({ ...p, [installer.id]: { name: installer.name, initials: installer.initials } })) }}
                            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #b6dfc9', background: '#f0faf5', color: '#036A43', cursor: 'pointer' }}>
                            ✏️ Rename
                          </button>
                          <button onClick={() => handleRemoveInstaller(installer.id, installer.name)} disabled={removingInstaller === installer.id}
                            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #f5c2c2', background: '#fff5f5', color: '#A32D2D', cursor: 'pointer' }}>
                            {removingInstaller === installer.id ? '…' : 'Remove'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {deleteWarning?.id === installer.id && (
                    <div style={{ padding: '12px 20px', background: '#fff8f0', borderBottom: '1px solid #f0f0ee', borderTop: '1px solid #fde8cc' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#854F0B', marginBottom: 8 }}>
                        ⚠ "{deleteWarning.name}" is assigned to {deleteWarning.affectedJobs.length} job{deleteWarning.affectedJobs.length !== 1 ? 's' : ''}:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {deleteWarning.affectedJobs.map((j: any) => (
                          <span key={j.lp_job_id} style={{ fontSize: 11, background: '#fde8cc', color: '#854F0B', borderRadius: 4, padding: '2px 8px' }}>{j.name}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
                        Removing will keep their suggestion text as-is. Update those jobs manually afterward.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleForceRemove(installer.id)} disabled={removingInstaller === installer.id}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: 'none', background: '#A32D2D', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                          {removingInstaller === installer.id ? '…' : 'Remove Anyway'}
                        </button>
                        <button onClick={() => setDeleteWarning(null)}
                          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 5, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
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
              <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Import from your backlog sheet or push all suggestions to Google Sheets</div>
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
              <button onClick={handleImportBacklog} disabled={importing}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: importing ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                {importing ? '⏳ Importing…' : '📥 Import from Backlog Sheet'}
              </button>
              <button onClick={handlePushSheet} disabled={pushingSheet}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: 'none', background: pushingSheet ? '#aaa' : '#036A43', color: '#fff', cursor: pushingSheet ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                {pushingSheet ? '⏳ Updating…' : '🔄 Update Sheet'}
              </button>
            </div>
          </div>
          <div style={{ padding: '14px 20px', fontSize: 12, color: '#888' }}>
            Columns: Last Name · First Name · City · State · Job Status · Unit Count · Gross Amount · Job Type · Installer 1 · Installer 2 · Notes
            <div style={{ marginTop: 6, fontSize: 11, color: '#bbb' }}>All columns sortable. Update Sheet refreshes all rows — no duplicates.</div>
          </div>
          {importResult && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e0e0de', fontSize: 12 }}>
              {importResult.error ? (
                <span style={{ color: '#A32D2D' }}>✗ {importResult.error}</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ color: '#036A43', fontWeight: 600 }}>
                    ✓ Import complete — {importResult.upserted} of {importResult.total} rows imported
                  </div>
                  {importResult.unmatched?.length > 0 && (
                    <div style={{ color: '#854F0B' }}>
                      ⚠ {importResult.unmatched.length} unmatched: {importResult.unmatched.join(', ')}
                    </div>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div style={{ color: '#A32D2D' }}>
                      ✗ Errors: {importResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
