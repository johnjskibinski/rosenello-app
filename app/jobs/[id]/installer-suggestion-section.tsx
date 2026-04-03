'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

interface Installer {
  id: string
  name: string
  initials: string
  active: boolean
}

interface Suggestion {
  id: string
  lp_job_id: number
  first_choice: string | null
  second_choice: string | null
  notes: string | null
  updated_at: string
}

export default function InstallerSuggestionSection({ lpJobId }: { lpJobId: number }) {
  const [installers, setInstallers] = useState<Installer[]>([])
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [firstChoice, setFirstChoice] = useState('')
  const [secondChoice, setSecondChoice] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [instRes, sugRes] = await Promise.all([
        fetch(`${API}/api/calendar/installers`),
        fetch(`${API}/api/jobs/${lpJobId}/installer-suggestion`)
      ])
      const instData = await instRes.json()
      const sugData = await sugRes.json()
      if (Array.isArray(instData)) setInstallers(instData)
      if (sugData) {
        setSuggestion(sugData)
        setFirstChoice(sugData.first_choice || '')
        setSecondChoice(sugData.second_choice || '')
        setNotes(sugData.notes || '')
      }
    } catch {
      setError('Failed to load installer data')
    } finally {
      setLoading(false)
    }
  }, [lpJobId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/jobs/${lpJobId}/installer-suggestion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_choice: firstChoice || null,
          second_choice: secondChoice || null,
          notes: notes || null,
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setSuggestion(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isDirty = suggestion
    ? firstChoice !== (suggestion.first_choice || '') ||
      secondChoice !== (suggestion.second_choice || '') ||
      notes !== (suggestion.notes || '')
    : !!(firstChoice || secondChoice || notes)

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '2px solid #b6dfc9', padding: '14px 16px', gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>👷</span>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#036A43', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Crew Assignment Suggestion</div>
        </div>
        {suggestion?.updated_at && (
          <div style={{ fontSize: 10, color: '#aaa' }}>
            Last updated {new Date(suggestion.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 5 }}>
                <span style={{ color: '#F4C828', marginRight: 4 }}>★</span>
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>First Choice</span>
                <span style={{ color: '#036A43', marginLeft: 5, fontStyle: 'italic' }}>Recommended</span>
              </label>
              <select
                value={firstChoice}
                onChange={e => setFirstChoice(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '2px solid #b6dfc9', background: firstChoice ? '#f0faf5' : '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">— Select installer —</option>
                {installers.map(i => (
                  <option key={i.id} value={i.name}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 5 }}>
                <span style={{ color: '#aaa', marginRight: 4 }}>↺</span>
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Second Choice</span>
                <span style={{ color: '#888', marginLeft: 5, fontStyle: 'italic' }}>Backup</span>
              </label>
              <select
                value={secondChoice}
                onChange={e => setSecondChoice(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', background: secondChoice ? '#fafafa' : '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">— Select installer —</option>
                {installers.map(i => (
                  <option key={i.id} value={i.name}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Reason / Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Jay W preferred — complex bay window, needs experienced installer. Customer flexible on timing."
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#333' }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#A32D2D', background: '#fff5f5', border: '1px solid #f5c2c2', borderRadius: 5, padding: '6px 10px' }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            {saved && <span style={{ fontSize: 12, color: '#036A43' }}>✓ Saved to sheet</span>}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                fontSize: 12, padding: '7px 18px', borderRadius: 6, border: 'none', fontWeight: 600,
                background: saved ? '#6aa84f' : saving ? '#aaa' : isDirty ? '#036A43' : '#ccc',
                color: '#fff', cursor: saving || !isDirty ? 'not-allowed' : 'pointer',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
