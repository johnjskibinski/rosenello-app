const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
