'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

const COLOR_MAP: Record<string, string> = {
  measure: '#F6BF26',
  install: '#F4511E',
  service: '#039BE5',
  reminder: '#616161',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  measure: 'Measure',
  install: 'Install',
  service: 'Service',
  reminder: 'Reminder',
}

const SIDEBAR_STATUSES = ['SN', 'PU', 'SS', 'NS']
const SIDEBAR_STATUS_LABELS: Record<string, string> = {
  SN: 'New',
  PU: 'Pickup Check',
  SS: 'Scope Scheduled',
  NS: 'Need to Schedule',
}

const CREWS = ['Jay W', 'Matt Burger', 'Mike', 'Joe', 'Scott', 'Ricardo', 'Mike K', 'Jeremiah Construction', 'Matus Construction', "Richy's Construction"]

interface CalEvent {
  id: string
  lp_job_id: number | null
  event_type: string
  crew: string | null
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  color_id: string
  companycam_url: string | null
  measure_sheet_url: string | null
  notes: string | null
}

interface Job {
  id: string
  lp_job_id: number
  customer_first: string
  customer_last: string
  address: string
  city: string
  state: string
  zip: string
  lp_status: string
  product: string
  gross_amount: number
  measure_sheet_url: string | null
  companycam_url: string | null
}

interface ModalState {
  open: boolean
  startTime: string
  endTime: string
  job: Job | null
}

interface PopupState {
  open: boolean
  event: CalEvent | null
  x: number
  y: number
}

interface DupModalState {
  open: boolean
  event: CalEvent | null
  date: string
  startTime: string
  endTime: string
}

export default function CalendarPage() {
  const calendarRef = useRef<any>(null)
  const draggableRef = useRef<any>(null)
  const sidebarListRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, popupX: 0, popupY: 0 })

  const [events, setEvents] = useState<CalEvent[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [modal, setModal] = useState<ModalState>({ open: false, startTime: '', endTime: '', job: null })
  const [popup, setPopup] = useState<PopupState>({ open: false, event: null, x: 0, y: 0 })
  const [dupModal, setDupModal] = useState<DupModalState>({ open: false, event: null, date: '', startTime: '', endTime: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('measure')
  const [formCrew, setFormCrew] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  const fetchEvents = useCallback(async (start: string, end: string) => {
    try {
      const res = await fetch(`${API}/api/calendar/events?start=${start}&end=${end}`)
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch events', err)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/jobs`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setJobs(data.filter((j: Job) => SIDEBAR_STATUSES.includes(j.lp_status)))
      }
    } catch (err) {
      console.error('Failed to fetch jobs', err)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
    fetchEvents(start, end)
  }, [fetchEvents, fetchJobs])

  useEffect(() => {
    if (!sidebarListRef.current) return
    const draggable = new Draggable(sidebarListRef.current, {
      itemSelector: '.job-card',
      eventData: (el) => {
        const jobId = el.getAttribute('data-job-id')
        const job = jobs.find(j => String(j.lp_job_id) === jobId)
        return {
          title: job ? `${job.customer_last}, ${job.customer_first}` : 'New Event',
          duration: '02:00',
          extendedProps: { jobId },
        }
      },
    })
    draggableRef.current = draggable
    return () => draggable.destroy()
  }, [jobs])

  // Popup drag support
  const handlePopupMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStartPos.current = { mouseX: e.clientX, mouseY: e.clientY, popupX: popup.x, popupY: popup.y }
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStartPos.current.mouseX
      const dy = e.clientY - dragStartPos.current.mouseY
      setPopup(prev => ({
        ...prev,
        x: Math.max(0, Math.min(window.innerWidth - 340, dragStartPos.current.popupX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragStartPos.current.popupY + dy)),
      }))
    }
    const handleMouseUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const openModal = (startTime: string, endTime: string, job: Job | null = null) => {
    setFormTitle(job ? `${job.customer_last}, ${job.customer_first}` : '')
    setFormType('measure')
    setFormCrew('')
    setFormNotes('')
    setFormStart(startTime)
    setFormEnd(endTime)
    setModal({ open: true, startTime, endTime, job })
  }

  const handleDateSelect = (info: any) => { openModal(info.startStr, info.endStr) }

  const handleExternalDrop = (info: any) => {
    const jobId = info.draggedEl.getAttribute('data-job-id')
    const job = jobs.find(j => String(j.lp_job_id) === jobId) || null
    const start = info.date.toISOString()
    const end = new Date(info.date.getTime() + 2 * 60 * 60 * 1000).toISOString()
    openModal(start, end, job)
  }

  const handleEventClick = (info: any) => {
    const ev = events.find(e => e.id === info.event.id)
    if (!ev) return
    const rect = info.el.getBoundingClientRect()
    setFormTitle(ev.title || '')
    setFormType(ev.event_type)
    setFormCrew(ev.crew || '')
    setFormNotes(ev.notes || '')
    setFormStart(ev.start_time)
    setFormEnd(ev.end_time)
    setEditMode(false)
    setPopup({
      open: true,
      event: ev,
      x: Math.min(rect.right + 8, window.innerWidth - 340),
      y: Math.min(rect.top, window.innerHeight - 100),
    })
  }

  const handleEventDrop = async (info: any) => {
    const ev = events.find(e => e.id === info.event.id)
    if (!ev) return
    try {
      await fetch(`${API}/api/calendar/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: info.event.start?.toISOString(),
          end_time: info.event.end?.toISOString(),
        }),
      })
      setEvents(prev => prev.map(e => e.id === ev.id ? {
        ...e,
        start_time: info.event.start?.toISOString() || e.start_time,
        end_time: info.event.end?.toISOString() || e.end_time,
      } : e))
    } catch { info.revert() }
  }

  const handleEventResize = async (info: any) => {
    const ev = events.find(e => e.id === info.event.id)
    if (!ev) return
    try {
      await fetch(`${API}/api/calendar/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: info.event.start?.toISOString(),
          end_time: info.event.end?.toISOString(),
        }),
      })
    } catch { info.revert() }
  }

  const handleSaveEvent = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lp_job_id: modal.job?.lp_job_id || null,
          event_type: formType,
          crew: formCrew || null,
          title: formTitle || null,
          start_time: formStart,
          end_time: formEnd,
          notes: formNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const newEvent = await res.json()
      setEvents(prev => [...prev, newEvent])
      setModal({ open: false, startTime: '', endTime: '', job: null })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!popup.event) return
    setDeleting(true)
    try {
      await fetch(`${API}/api/calendar/events/${popup.event.id}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== popup.event!.id))
      setPopup({ open: false, event: null, x: 0, y: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const openDuplicateModal = () => {
    if (!popup.event) return
    const ev = popup.event
    const origStart = new Date(ev.start_time)
    const origEnd = new Date(ev.end_time)
    const newStart = new Date(origStart.getTime() + 24 * 60 * 60 * 1000)
    const newEnd = new Date(origEnd.getTime() + 24 * 60 * 60 * 1000)
    setDupModal({
      open: true,
      event: ev,
      date: newStart.toISOString().slice(0, 10),
      startTime: newStart.toTimeString().slice(0, 5),
      endTime: newEnd.toTimeString().slice(0, 5),
    })
  }

  const handleDuplicateConfirm = async () => {
    if (!dupModal.event) return
    setDuplicating(true)
    try {
      const ev = dupModal.event
      const newStart = new Date(`${dupModal.date}T${dupModal.startTime}`).toISOString()
      const newEnd = new Date(`${dupModal.date}T${dupModal.endTime}`).toISOString()
      const res = await fetch(`${API}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lp_job_id: ev.lp_job_id,
          event_type: ev.event_type,
          crew: ev.crew,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          start_time: newStart,
          end_time: newEnd,
          color_id: ev.color_id,
          notes: ev.notes,
        }),
      })
      if (!res.ok) throw new Error('Duplicate failed')
      const newEvent = await res.json()
      setEvents(prev => [...prev, newEvent])
      setDupModal({ open: false, event: null, date: '', startTime: '', endTime: '' })
      setPopup({ open: false, event: null, x: 0, y: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setDuplicating(false)
    }
  }

  const handleEditSave = async () => {
    if (!popup.event) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/calendar/events/${popup.event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle || null,
          event_type: formType,
          crew: formCrew || null,
          start_time: formStart,
          end_time: formEnd,
          notes: formNotes || null,
          color_id: formType === 'measure' ? '5' : formType === 'install' ? '6' : formType === 'service' ? '7' : '8',
        }),
      })
      if (!res.ok) throw new Error('Edit failed')
      const updated = await res.json()
      setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
      setPopup({ open: false, event: null, x: 0, y: 0 })
      setEditMode(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Strip URL/link lines from description — shown as dedicated links below
  const cleanDescription = (desc: string | null) => {
    if (!desc) return ''
    return desc
      .split('\n')
      .filter(line => !line.includes('http') && !line.includes('Measure Packet') && !line.includes('CompanyCam'))
      .join('\n')
      .trim()
  }

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start_time,
    end: e.end_time,
    backgroundColor: COLOR_MAP[e.event_type] || '#616161',
    borderColor: COLOR_MAP[e.event_type] || '#616161',
    textColor: e.event_type === 'measure' ? '#1a1a1a' : '#ffffff',
  }))

  const groupedJobs = SIDEBAR_STATUSES.reduce((acc, status) => {
    acc[status] = jobs.filter(j => j.lp_status === status)
    return acc
  }, {} as Record<string, Job[]>)

  const inputStyle = (fontSize = 13): React.CSSProperties => ({
    width: '100%', fontSize, padding: '7px 10px', borderRadius: 6,
    border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box',
  })
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            height="100%"
            editable={true}
            selectable={true}
            selectMirror={true}
            droppable={true}
            events={fcEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            drop={handleExternalDrop}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            nowIndicator={true}
            datesSet={(info) => fetchEvents(info.startStr, info.endStr)}
          />
        </div>

        {/* Unscheduled Jobs Sidebar */}
        <div style={{ width: 280, borderLeft: '1px solid #e0e0de', overflowY: 'auto', background: '#f9f9f8', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e0e0de', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
            Unscheduled Jobs
          </div>
          <div ref={sidebarListRef} style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SIDEBAR_STATUSES.map(status => {
              const group = groupedJobs[status] || []
              if (!group.length) return null
              return (
                <div key={status}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 2px 4px' }}>
                    {SIDEBAR_STATUS_LABELS[status]} ({group.length})
                  </div>
                  {group.map(job => (
                    <div key={job.lp_job_id} className="job-card" data-job-id={String(job.lp_job_id)}
                      style={{ background: '#fff', border: '1px solid #e0e0de', borderRadius: 8, padding: '8px 10px', cursor: 'grab', marginBottom: 4, fontSize: 12, userSelect: 'none' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{job.customer_last}, {job.customer_first}</div>
                      <div style={{ color: '#666', marginTop: 2 }}>{job.address}</div>
                      <div style={{ color: '#888', marginTop: 2 }}>{job.city}, {job.state}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 11, background: '#f0faf5', color: '#036A43', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>{job.product || 'Win'}</span>
                        <span style={{ fontSize: 11, color: '#036A43', fontWeight: 600 }}>${Number(job.gross_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── Create Event Modal ─── */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 480, maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>New Event{modal.job ? ` — ${modal.job.customer_last}, ${modal.job.customer_first}` : ''}</div>
              <button onClick={() => setModal({ open: false, startTime: '', endTime: '', job: null })} style={{ border: 'none', background: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {modal.job && (
                <div style={{ fontSize: 12, color: '#666', background: '#f5f5f3', borderRadius: 6, padding: '8px 12px' }}>
                  {modal.job.address}, {modal.job.city} · ${Number(modal.job.gross_amount || 0).toLocaleString()}
                </div>
              )}
              <div>
                <label style={labelStyle}>Title</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder={modal.job ? `${modal.job.customer_last}, ${modal.job.customer_first}` : 'Event title…'}
                  style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle}>Event Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                    <button key={val} onClick={() => setFormType(val)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: '2px solid', borderColor: formType === val ? COLOR_MAP[val] : '#ddd', background: formType === val ? COLOR_MAP[val] : '#fff', color: formType === val ? (val === 'measure' ? '#1a1a1a' : '#fff') : '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start</label>
                  <input type="datetime-local" value={formStart.slice(0, 16)} onChange={e => setFormStart(e.target.value)} style={inputStyle()} />
                </div>
                <div>
                  <label style={labelStyle}>End</label>
                  <input type="datetime-local" value={formEnd.slice(0, 16)} onChange={e => setFormEnd(e.target.value)} style={inputStyle()} />
                </div>
              </div>
              {(formType === 'install' || formType === 'service') && (
                <div>
                  <label style={labelStyle}>Crew</label>
                  <select value={formCrew} onChange={e => setFormCrew(e.target.value)} style={{ ...inputStyle(), background: '#fff' }}>
                    <option value="">Select crew...</option>
                    {CREWS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                  style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setModal({ open: false, startTime: '', endTime: '', job: null })}
                  style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveEvent} disabled={saving || !formStart || !formEnd}
                  style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: saving ? '#aaa' : '#036A43', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  {saving ? 'Saving…' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Duplicate Modal ─── */}
      {dupModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 360, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Duplicate Event</div>
              <button onClick={() => setDupModal({ open: false, event: null, date: '', startTime: '', endTime: '' })}
                style={{ border: 'none', background: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#666', background: '#f5f5f3', borderRadius: 6, padding: '8px 12px' }}>
                {dupModal.event?.title}
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={dupModal.date} onChange={e => setDupModal(prev => ({ ...prev, date: e.target.value }))} style={inputStyle()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" value={dupModal.startTime} onChange={e => setDupModal(prev => ({ ...prev, startTime: e.target.value }))} style={inputStyle()} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" value={dupModal.endTime} onChange={e => setDupModal(prev => ({ ...prev, endTime: e.target.value }))} style={inputStyle()} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button onClick={() => setDupModal({ open: false, event: null, date: '', startTime: '', endTime: '' })}
                  style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDuplicateConfirm} disabled={duplicating || !dupModal.date}
                  style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: duplicating ? '#aaa' : '#036A43', color: '#fff', cursor: duplicating ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  {duplicating ? 'Copying…' : 'Duplicate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Event Popup (draggable) ─── */}
      {popup.open && popup.event && (
        <div style={{
          position: 'fixed', zIndex: 200,
          left: popup.x, top: popup.y,
          width: 320, background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e0e0de',
          maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column',
        }}>
          {/* Drag handle header */}
          <div onMouseDown={handlePopupMouseDown}
            style={{ padding: '12px 14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, cursor: 'grab', flexShrink: 0, userSelect: 'none' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR_MAP[popup.event.event_type], flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{popup.event.title}</div>
            <button onClick={() => { setPopup({ open: false, event: null, x: 0, y: 0 }); setEditMode(false) }}
              style={{ border: 'none', background: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>

          {/* Scrollable body */}
          <div style={{ padding: '12px 14px', fontSize: 12, color: '#444', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            <div style={{ color: '#666' }}>
              {new Date(popup.event.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {new Date(popup.event.end_time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
            {popup.event.location && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(popup.event.location)}`} target="_blank" rel="noreferrer"
                style={{ color: '#036A43', textDecoration: 'none' }}>📍 {popup.event.location}</a>
            )}
            {(() => {
              const cleaned = cleanDescription(popup.event.description)
              return cleaned ? <div style={{ whiteSpace: 'pre-wrap', color: '#444', fontSize: 12, lineHeight: 1.5 }}>{cleaned}</div> : null
            })()}
            {popup.event.measure_sheet_url && (
              <a href={popup.event.measure_sheet_url} target="_blank" rel="noreferrer"
                style={{ color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>📋 Measure Packet</a>
            )}
            {popup.event.companycam_url && (
              <a href={popup.event.companycam_url} target="_blank" rel="noreferrer"
                style={{ color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>📸 CompanyCam</a>
            )}
            {popup.event.lp_job_id && (
              <a href={`https://e5d8a.leadperfection.com/jobdetail.html?jobid=${popup.event.lp_job_id}`} target="_blank" rel="noreferrer"
                style={{ color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>🔗 Open in LP</a>
            )}

            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px solid #eee' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} style={inputStyle(12)} />
                </div>
                <div>
                  <label style={labelStyle}>Event Type</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                      <button key={val} onClick={() => setFormType(val)}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '2px solid', borderColor: formType === val ? COLOR_MAP[val] : '#ddd', background: formType === val ? COLOR_MAP[val] : '#fff', color: formType === val ? (val === 'measure' ? '#1a1a1a' : '#fff') : '#555', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Start</label>
                    <input type="datetime-local" value={formStart.slice(0, 16)} onChange={e => setFormStart(e.target.value)} style={inputStyle(12)} />
                  </div>
                  <div>
                    <label style={labelStyle}>End</label>
                    <input type="datetime-local" value={formEnd.slice(0, 16)} onChange={e => setFormEnd(e.target.value)} style={inputStyle(12)} />
                  </div>
                </div>
                {(formType === 'install' || formType === 'service') && (
                  <div>
                    <label style={labelStyle}>Crew</label>
                    <select value={formCrew} onChange={e => setFormCrew(e.target.value)} style={{ ...inputStyle(12), background: '#fff' }}>
                      <option value="">Select crew...</option>
                      {CREWS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                    style={{ ...inputStyle(12), resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => setEditMode(false)}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleEditSave} disabled={saving}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: 'none', background: saving ? '#aaa' : '#036A43', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid #eee' }}>
                <button onClick={handleDeleteEvent} disabled={deleting}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #f5c2c2', background: '#fff5f5', color: '#A32D2D', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={openDuplicateModal}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer' }}>
                    Duplicate
                  </button>
                  <button onClick={() => setEditMode(true)}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#036A43', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
