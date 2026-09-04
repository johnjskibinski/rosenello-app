// All backend calls go through the authenticated Next.js proxy (app/api/proxy)
const API_URL = '/api/proxy'

export async function getJobs() {
  const res = await fetch(`${API_URL}/api/jobs`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function syncJobs() {
  const res = await fetch(`${API_URL}/api/jobs/sync`, {
    method: 'POST',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Sync failed')
  return res.json()
}

// All backend calls go through the authenticated Next.js proxy (app/api/proxy)
const BASE = '/api/proxy'

export async function uploadJobDocs(lpJobId: number) {
  const res = await fetch(`${BASE}/api/jobs/${lpJobId}/upload-docs`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getKpiUnitTotals() {
  const res = await fetch(`${BASE}/api/kpi/unit-totals`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
