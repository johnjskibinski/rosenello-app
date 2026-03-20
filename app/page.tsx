'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { STATUS_ORDER, STATUS_LABELS, TAB_LABELS, STATUS_BADGE_COLOR, STATUS_BADGE_TEXT } from '@/lib/statuses'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PRODUCT_COLORS: Record<string, { bg: string; text: string }> = {
  Win: { bg: '#E6F1FB', text: '#185FA5' },
  ED:  { bg: '#EAF3DE', text: '#3B6D11' },
  PD:  { bg: '#EEEDFE', text: '#534AB7' },
  SR:  { bg: '#FAEEDA', text: '#854F0B' },
  Sid: { bg: '#FAEEDA', text: '#854F0B' },
  FR:  { bg: '#E1F5EE', text: '#0F6E56' },
}

function getProductColor(product: string) {
  return PRODUCT_COLORS[product] || { bg: '#f0f0ee', text: '#555' }
}

export default function ProductionBoard() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs`)
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch(`${API_URL}/api/jobs/sync`, { method: 'POST' })
      await fetchJobs()
    } finally {
      setSyncing(false)
    }
  }

  const activeJobs = jobs.filter(j => STATUS_ORDER.includes(j.lp_status))

  const filtered = activeJobs.filter(j => {
    const matchesTab = activeTab === 'all' || j.lp_status === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      `${j.customer_first} ${j.customer_last}`.toLowerCase().includes(q) ||
      (j.address || '').toLowerCase().includes(q) ||
      (j.contract_id || '').toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const statusJobs = filtered.filter(j => j.lp_status === status)
    if (statusJobs.length > 0) acc[status] = statusJobs
    return acc
  }, {} as Record<string, any[]>)

  const tabCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = activeJobs.filter(j => j.lp_status === s).length
    return acc
  }, {} as Record<string, number>)

  const tabRow1 = ['SN', 'PU', 'SS', 'MR']
  const tabRow2 = ['D', '2', 'NS', '5', 'T']

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>
        Loading jobs...
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #e0e0de', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>Production Board</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#1a1a1a', width: 180, outline: 'none' }}
            />
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none', background: '#036A43', color: '#fff', cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: syncing ? 0.7 : 1 }}
            >
              {syncing ? 'Syncing...' : 'Sync LP'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e0e0de', flexShrink: 0 }}>
          {[
            { label: 'Active jobs', val: activeJobs.length },
            { label: 'Scope stage', val: ['SN','PU','SS','MR'].reduce((a,s) => a + (tabCounts[s]||0), 0) },
            { label: 'Need to schedule', val: tabCounts['NS'] || 0 },
            { label: 'Unpaid', val: tabCounts['T'] || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: '#f5f5f3', borderRadius: 6, padding: '6px 14px', minWidth: 90 }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#036A43' }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#025535', borderBottom: '1px solid #013d27', padding: '5px 20px 4px', flexShrink: 0 }}>
          {[tabRow1, tabRow2].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: ri === 0 ? 2 : 0 }}>
              {ri === 0 && (
                <button
                  onClick={() => setActiveTab('all')}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: '4px 11px', border: 'none',
                    background: 'transparent', color: activeTab === 'all' ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                    borderBottom: activeTab === 'all' ? '2px solid #F4C828' : '2px solid transparent',
                  }}
                >
                  All
                  <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: activeTab === 'all' ? 'rgba(244,200,40,0.25)' : 'rgba(255,255,255,0.1)', color: activeTab === 'all' ? '#F4C828' : 'rgba(255,255,255,0.5)' }}>
                    {activeJobs.length}
                  </span>
                </button>
              )}
              {row.map(status => (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: '4px 11px', border: 'none',
                    background: 'transparent', color: activeTab === status ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                    borderBottom: activeTab === status ? '2px solid #F4C828' : '2px solid transparent',
                  }}
                >
                  {TAB_LABELS[status]}
                  <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: activeTab === status ? 'rgba(244,200,40,0.25)' : 'rgba(255,255,255,0.1)', color: activeTab === status ? '#F4C828' : 'rgba(255,255,255,0.5)' }}>
                    {tabCounts[status] || 0}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, padding: '12px 20px', overflowY: 'auto' }}>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 40 }}>No jobs found</div>
          ) : (
            Object.entries(grouped).map(([status, statusJobs]) => (
              <div key={status} style={{ marginBottom: 5, borderRadius: 7, overflow: 'hidden', border: '1px solid #e0e0de', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid #eee', borderLeft: '3px solid #036A43' }}>
                  <span style={{ fontSize: 10, color: '#aaa' }}>▼</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, fontWeight: 500, background: STATUS_BADGE_COLOR[status] || '#f0f0ee', color: STATUS_BADGE_TEXT[status] || '#555' }}>
                    {statusJobs.length}
                  </span>
                  <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>
                    {statusJobs.length} job{statusJobs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {statusJobs.map(job => {
                      const pc = getProductColor(job.product || '')
                      return (
                        <tr
                          key={job.id}
                          style={{ borderBottom: '1px solid #f2f2f0', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f5fbf8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => window.location.href = `/jobs/${job.lp_job_id}`}
                        >
                          <td style={{ padding: '5px 12px', fontSize: 12, verticalAlign: 'middle', minWidth: 200 }}>
                            <div style={{ fontWeight: 500 }}>{job.customer_first} {job.customer_last}</div>
                            <div style={{ color: '#999', fontSize: 11 }}>{job.address}{job.city ? `, ${job.city}` : ''} {job.state || ''}</div>
                          </td>
                          <td style={{ padding: '5px 12px', fontSize: 11, color: '#036A43', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {job.raw_lp_data?.phone1 ? `(${job.raw_lp_data.phone1.toString().replace(/(\d{3})(\d{3})(\d{4})/, '$1) $2-$3')}` : '—'}
                          </td>
                          <td style={{ padding: '5px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {job.product && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: pc.bg, color: pc.text }}>
                                {job.product}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {job.gross_amount ? `$${Number(job.gross_amount).toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '5px 12px', fontSize: 11, color: '#aaa', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {[job.installer_1, job.installer_2].filter(Boolean).join(' · ') || 'Unassigned'}
                          </td>
                          <td style={{ padding: '5px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                            <button
                              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', color: '#444', cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); window.location.href = `/jobs/${job.lp_job_id}` }}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
