'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

interface Note {
  id: string
  lp_job_id: number
  note: string
  author: string
  lp_synced: boolean
  created_at: string
}

export default function NotesSection({ lpJobId }: { lpJobId: number }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/jobs/${lpJobId}/notes`)
      const data = await res.json()
      setNotes(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [lpJobId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/jobs/${lpJobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: text.trim(), author: 'John' }),
      })
      if (!res.ok) throw new Error('Save failed')
      const newNote = await res.json()
      setNotes(prev => [newNote, ...prev])
      setText('')
    } catch {
      setError('Failed to save note. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Notes</h2>

      <div className="flex flex-col gap-2 mb-5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder="Add a note… (Cmd+Enter to save)"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#036A43]"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={saving || !text.trim()}
          className="self-end px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#036A43] hover:bg-[#025535] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map(n => (
            <li key={n.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span>{n.author}</span>
                <span>·</span>
                <span>{fmt(n.created_at)}</span>
                <span>·</span>
                <span className={n.lp_synced ? 'text-green-600' : 'text-amber-500'}>
                  {n.lp_synced ? '✓ Saved to LP' : '⚠ Local only'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
