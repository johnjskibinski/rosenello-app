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

const DEFAULT_CREWS = ['Jay W', 'Matt Burger', 'Mike', 'Joe', 'Scott', 'Ricardo', 'Mike K', 'Manuel', 'STK', 'Antoine', 'Jeremiah Construction', 'Matus Construction', "Richy's Construction"]

interface CalEvent {
  id: string
  gcal_event_id: string | null
  lp_job_id: number | null
  event_type: string
  installer: string | null
  title: string
  notes: string | null
  location: string
  start_time: string
  end_time: string
  color_id: string | null
  linked: boolean
  all_day: boolean
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
  lp_status_label: string | null
  product: string
  gross_amount: number
  balance_due: number | null
  installer_1: string | null
  installer_2: string | null
  contract_date: string | null
  total_windows: number | null
  total_doors: number | null
  total_units: number | null
  measure_sheet_url: string | null
  companycam_url: string | null
  work_order_rows: any[] | null
  raw_lp_data: any
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

interface TooltipState {
  job: Job | null
  x: number
  y: number
}

export default function CalendarPage() {
  const calendarRef = useRef<any>(null)
  const draggableRef = useRef<any>(null)
  const sidebarListRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const pendingDrop = useRef<any>(null)
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, popupX: 0, popupY: 0 })
  const searchTimer = useRef<any>(null)

  const [events, setEvents] = useState<CalEvent[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [availability, setAvailability] = useState<Record<string, string>>({})
  const [availEdit, setAvailEdit] = useState<{ date: string; value: string } | null>(null)
  const [availSaving, setAvailSaving] = useState(false)
  const [visibleDates, setVisibleDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [searching, setSearching] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({ job: null, x: 0, y: 0 })
  const [modal, setModal] = useState<ModalState>({ open: false, startTime: '', endTime: '', job: null })
  const [popup, setPopup] = useState<PopupState>({ open: false, event: null, x: 0, y: 0 })
  const [dupModal, setDupModal] = useState<DupModalState>({ open: false, event: null, date: '', startTime: '', endTime: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [installers, setInstallers] = useState<string[]>(DEFAULT_CREWS)
  const [syncing, setSyncing] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('measure')
  const [formInstaller, setFormInstaller] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  const fetchAvailability = useCallback(async (start: string, end: string) => {
    try {
      const res = await fetch(`${API}/api/calendar/availability?start=${start}&end=${end}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const map: Record<string, string> = {}
        data.forEach((a: any) => { map[a.date] = a.notes })
        setAvailability(map)
      }
    } catch (err) {
      console.error('Failed to fetch availability', err)
    }
  }, [])

  const saveAvailability = async (date: string, notes: string) => {
    setAvailSaving(true)
    try {
      await fetch(`${API}/api/calendar/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, notes }),
      })
      setAvailability(prev => {
        const next = { ...prev }
        if (!notes.trim()) { delete next[date] } else { next[date] = notes.trim() }
        return next
      })
      setAvailEdit(null)
    } catch (err) {
      console.error('Failed to save availability', err)
    } finally {
      setAvailSaving(false)
    }
  }

  const fetchEvents = useCallback(async (start: string, end: string) => {
    try {
      const res = await fetch(`${API}/api/calendar?start=${start}&end=${end}`)
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

  const fetchInstallers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/calendar/installers`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) setInstallers(data.map((i: any) => i.name))
    } catch {}
  }, [])

  const handleGCalSync = async () => {
    setSyncing(true)
    try {
      await fetch(`${API}/api/calendar/sync`, { method: 'POST' })
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
      await fetchEvents(start, end)
    } catch (err) { console.error(err) }
    finally { setSyncing(false) }
  }

  useEffect(() => {
    fetchJobs()
    fetchInstallers()
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
    fetchEvents(start, end)
    fetchAvailability(start, end)
  }, [fetchEvents, fetchJobs, fetchAvailability, fetchInstallers])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchTimer.current)
    if (!q.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/jobs/search?q=${encodeURIComponent(q.trim())}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  useEffect(() => {
    if (!sidebarListRef.current) return
    const draggable = new Draggable(sidebarListRef.current, {
      itemSelector: '.job-card',
      eventData: (el) => {
        const jobId = el.getAttribute('data-job-id')
        const job = [...jobs, ...searchResults].find(j => String(j.lp_job_id) === jobId)
        return {
          title: job ? `${job.customer_last}, ${job.customer_first}` : 'New Event',
          duration: '01:00',
          extendedProps: { jobId },
        }
      },
    })
    draggableRef.current = draggable
    return () => draggable.destroy()
  }, [jobs, searchResults])

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
    setFormInstaller('')
    setFormNotes('')
    setFormStart(startTime)
    setFormEnd(endTime)
    setModal({ open: true, startTime, endTime, job })
  }

  const handleDateSelect = (info: any) => {
    if (info.allDay) {
      // Clicking the all-day row opens availability editor for that date
      const date = info.startStr.slice(0, 10)
      setAvailEdit({ date, value: availability[date] || '' })
      return
    }
    openModal(info.startStr, info.endStr)
  }

  const handleExternalDrop = (info: any) => {
    const jobId = info.draggedEl.getAttribute('data-job-id')
    const job = [...jobs, ...searchResults].find(j => String(j.lp_job_id) === jobId) || null
    const start = info.date.toISOString()
    const end = new Date(info.date.getTime() + 1 * 60 * 60 * 1000).toISOString()
    pendingDrop.current = info
    openModal(start, end, job)
  }

  const handleEventClick = (info: any) => {
    const ev = events.find(e => e.id === info.event.id)
    if (!ev) return
    const rect = info.el.getBoundingClientRect()
    setFormTitle(ev.title || '')
    setFormType(ev.event_type)
    setFormInstaller(ev.installer || '')
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
          installer: formInstaller || null,
          title: formTitle || null,
          start_time: formStart,
          end_time: formEnd,
          notes: formNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const newEvent = await res.json()
      setEvents(prev => [...prev, newEvent])
      pendingDrop.current = null
      setModal({ open: false, startTime: '', endTime: '', job: null })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = () => {
    if (!popup.event) return
    setDeleteConfirm(true)
  }

  const confirmDelete = async (includeGCal: boolean) => {
    if (!popup.event) return
    setDeleting(true)
    try {
      await fetch(`${API}/api/calendar/events/${popup.event.id}?gcal=${includeGCal}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== popup.event!.id))
      setPopup({ open: false, event: null, x: 0, y: 0 })
      setDeleteConfirm(false)
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
          installer: ev.installer,
          title: ev.title,
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
          installer: formInstaller || null,
          start_time: formStart,
          end_time: formEnd,
          notes: formNotes || null,
          color_id: formType === 'measure' ? '5' : '6',
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

  const cleanDescription = (desc: string | null) => {
    if (!desc) return ''
    return desc
      .split('\n')
      .filter(line => !line.includes('http') && !line.includes('Measure Packet') && !line.includes('CompanyCam') && !line.includes('Phone:'))
      .join('\n')
      .trim()
  }

  const unwrapGoogleUrl = (url: string): string => {
    try {
      if (url.includes('google.com/url')) {
        const u = new URL(url)
        return u.searchParams.get('q') || url
      }
    } catch {}
    return url
  }

  const extractLinks = (desc: string | null): { measureUrl: string | null; companycamUrl: string | null; phone: string | null } => {
    if (!desc) return { measureUrl: null, companycamUrl: null, phone: null }
    const lines = desc.split('\n')
    let measureUrl: string | null = null
    let companycamUrl: string | null = null
    let phone: string | null = null
    for (const line of lines) {
      const urlMatch = line.match(/<(https?:\/\/[^>]+)>/)
      const rawUrl = urlMatch ? urlMatch[1] : (line.match(/https?:\/\/\S+/) || [])[0] || null
      const url = rawUrl ? unwrapGoogleUrl(rawUrl) : null
      if (url && (line.includes('Measure Packet') || url.includes('docs.google.com') || url.includes('drive.google.com'))) measureUrl = url
      else if (url && (line.includes('CompanyCam') || url.includes('companycam.com'))) companycamUrl = url
      const phoneMatch = line.match(/Phone:s*(.+)/)
      if (phoneMatch) phone = phoneMatch[1].trim()
    }
    return { measureUrl, companycamUrl, phone }
  }

  const formatPhone = (raw: any): string => {
    const p = raw?.phone1 || raw?.phone || ''
    if (!p) return ''
    const digits = String(p).replace(/\D/g, '')
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
    return String(p)
  }

  // Jobs that already have a scheduled event — used to filter sidebar
  const scheduledJobIds = new Set(events.filter(e => e.lp_job_id && e.event_type !== 'availability').map(e => e.lp_job_id))
  const measureScheduledIds = new Set(events.filter(e => e.lp_job_id && e.event_type === 'measure').map(e => e.lp_job_id))
  const installScheduledIds = new Set(events.filter(e => e.lp_job_id && e.event_type === 'install').map(e => e.lp_job_id))

  const fcEvents = events
    .filter(e => e.event_type !== 'availability')
    .map(e => ({
      id: e.id,
      title: e.installer ? `(${e.installer}) ${e.title}` : e.title,
      start: e.start_time,
      end: e.end_time,
      allDay: e.all_day,
      backgroundColor: COLOR_MAP[e.event_type] || '#616161',
      borderColor: COLOR_MAP[e.event_type] || '#616161',
      textColor: e.event_type === 'measure' ? '#1a1a1a' : '#ffffff',
    }))

  const MEASURE_STATUSES = ['N', 'SN', 'PU', 'SS']
  const INSTALL_STATUSES = ['2', 'NS']
  const groupedJobs = SIDEBAR_STATUSES.reduce((acc, status) => {
    acc[status] = jobs.filter(j => {
      if (j.lp_status === status) {
        if (MEASURE_STATUSES.includes(j.lp_status) && measureScheduledIds.has(j.lp_job_id)) return false
        if (INSTALL_STATUSES.includes(j.lp_status) && installScheduledIds.has(j.lp_job_id)) return false
        return true
      }
      return false
    })
    return acc
  }, {} as Record<string, Job[]>)

  const inputStyle = (fontSize = 13): React.CSSProperties => ({
    width: '100%', fontSize, padding: '7px 10px', borderRadius: 6,
    border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box',
  })
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }

  const isSearchActive = searchQuery.trim().length > 0
  const displayList = isSearchActive ? searchResults : null

  // Job card component (compact single-line)
  const JobCard = ({ job }: { job: Job }) => {
    const phone = formatPhone(job.raw_lp_data)
    return (
      <div
        key={job.lp_job_id}
        className="job-card"
        data-job-id={String(job.lp_job_id)}
        onMouseEnter={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setTooltip({ job, x: rect.left - 8, y: rect.top })
        }}
        onMouseLeave={() => setTooltip({ job: null, x: 0, y: 0 })}
        style={{
          background: '#fff',
          border: '1px solid #e0e0de',
          borderRadius: 6,
          padding: '5px 8px',
          cursor: 'grab',
          marginBottom: 3,
          fontSize: 12,
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
          {job.customer_last}, {job.customer_first}
        </span>
        <span style={{ color: '#888', fontSize: 11, flexShrink: 0 }}>
          {job.city}, {job.state}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Calendar — availability notes render as all-day events in the all-day row */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            height="100%"
            expandRows={false}
            slotLaneDidMount={(arg) => {
              arg.el.style.display = 'block'
              arg.el.style.height = '17px'
              arg.el.style.overflow = 'hidden'
              const tr = arg.el.closest('tr') as HTMLElement | null
              if (tr) { tr.style.display = 'block'; tr.style.height = '17px'; tr.style.position = 'relative' }
            }}
            slotLabelDidMount={(arg) => {
              // Label spans 2 slots (1 hour) — position it to float left of the grid
              arg.el.style.position = 'absolute'
              arg.el.style.left = '0'
              arg.el.style.top = '0'
              arg.el.style.fontSize = '10px'
              arg.el.style.lineHeight = '17px'
              arg.el.style.color = '#555'
              arg.el.style.padding = '0 4px'
              arg.el.style.whiteSpace = 'nowrap'
              arg.el.style.zIndex = '1'
            }}
            editable={true}
            selectable={true}
            selectMirror={true}
            droppable={true}
            events={[
              ...fcEvents,
              // Each line of availability notes becomes its own all-day event block
              ...Object.entries(availability).flatMap(([date, notes]) =>
                notes.split('\n')
                  .map(line => line.trim())
                  .filter(Boolean)
                  .map((line, i) => ({
                    id: `avail-${date}-${i}`,
                    title: line,
                    start: date,
                    allDay: true,
                    backgroundColor: '#8B0000',
                    borderColor: '#6B0000',
                    textColor: '#fff',
                    editable: false,
                    classNames: ['fc-avail-event'],
                    extendedProps: { isAvailability: true, availDate: date, availNotes: notes },
                  }))
              )
            ]}
            select={handleDateSelect}
            eventClick={(info) => {
              if (info.event.extendedProps?.isAvailability) {
                const date = info.event.extendedProps.availDate
                const notes = info.event.extendedProps.availNotes
                setAvailEdit({ date, value: notes })
                info.jsEvent.stopPropagation()
                return
              }
              handleEventClick(info)
            }}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            drop={handleExternalDrop}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            scrollTime="07:00:00"
            allDaySlot={true}
            nowIndicator={true}
            datesSet={(info) => {
              fetchEvents(info.startStr, info.endStr)
              fetchAvailability(info.startStr, info.endStr)
              const dates: string[] = []
              const cur = new Date(info.start)
              while (cur < info.end) {
                dates.push(cur.toISOString().slice(0, 10))
                cur.setDate(cur.getDate() + 1)
              }
              setVisibleDates(dates)
            }}
          />
          </div>
        </div>

        {/* Unscheduled Jobs Sidebar */}
        <div style={{ width: 260, borderLeft: '1px solid #e0e0de', overflowY: 'auto', background: '#f9f9f8', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #e0e0de', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>Jobs</div>
            <button onClick={handleGCalSync} disabled={syncing} title="Sync from Google Calendar"
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #ccc', background: syncing ? '#f0f0ee' : '#fff', color: syncing ? '#aaa' : '#036A43', cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
              {syncing ? '↻ Syncing…' : '↻ Sync GCal'}
            </button>
          </div>
            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search all jobs…"
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '100%', fontSize: 12, padding: '6px 28px 6px 8px',
                  borderRadius: 6, border: '1px solid #ccc', outline: 'none',
                  boxSizing: 'border-box', background: '#fff',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                >×</button>
              )}
            </div>
          </div>

          {/* List */}
          <div ref={sidebarListRef} style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {isSearchActive ? (
              searching ? (
                <div style={{ fontSize: 11, color: '#aaa', padding: '12px 4px' }}>Searching…</div>
              ) : searchResults.length === 0 ? (
                <div style={{ fontSize: 11, color: '#aaa', padding: '12px 4px' }}>No results found</div>
              ) : (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 2px 6px' }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map(job => <JobCard key={job.lp_job_id} job={job} />)}
                </>
              )
            ) : (
              SIDEBAR_STATUSES.map(status => {
                const group = groupedJobs[status] || []
                if (!group.length) return null
                return (
                  <div key={status}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 2px 4px' }}>
                      {SIDEBAR_STATUS_LABELS[status]} ({group.length})
                    </div>
                    {group.map(job => <JobCard key={job.lp_job_id} job={job} />)}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Hover Tooltip ─── */}
      {tooltip.job && (
        <div style={{
          position: 'fixed',
          left: Math.max(8, tooltip.x - 220),
          top: Math.min(tooltip.y, window.innerHeight - 260),
          width: 220,
          background: '#fff',
          border: '1px solid #e0e0de',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          padding: '10px 12px',
          zIndex: 500,
          fontSize: 12,
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: 6, fontSize: 13 }}>
            {tooltip.job.customer_last}, {tooltip.job.customer_first}
          </div>
          <div style={{ color: '#444', marginBottom: 2 }}>{tooltip.job.address}</div>
          <div style={{ color: '#666', marginBottom: 6 }}>{tooltip.job.city}, {tooltip.job.state} {tooltip.job.zip}</div>
          {formatPhone(tooltip.job.raw_lp_data) && (
            <div style={{ color: '#036A43', marginBottom: 6, fontWeight: 500 }}>
              📞 {formatPhone(tooltip.job.raw_lp_data)}
            </div>
          )}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(tooltip.job.total_windows || tooltip.job.total_doors || tooltip.job.total_units) && (
              <div style={{ color: '#555' }}>
                {[
                  tooltip.job.total_windows ? `${tooltip.job.total_windows} win` : null,
                  tooltip.job.total_doors ? `${tooltip.job.total_doors} door${tooltip.job.total_doors !== 1 ? 's' : ''}` : null,
                  tooltip.job.total_units ? `${tooltip.job.total_units} units total` : null,
                ].filter(Boolean).join(' · ')}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Gross</span>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>${Number(tooltip.job.gross_amount || 0).toLocaleString()}</span>
            </div>
            {tooltip.job.balance_due != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Balance</span>
                <span style={{ fontWeight: 600, color: tooltip.job.balance_due > 0 ? '#A32D2D' : '#036A43' }}>
                  ${Number(tooltip.job.balance_due).toLocaleString()}
                </span>
              </div>
            )}
            {(tooltip.job.installer_1 || tooltip.job.installer_2) && (
              <div style={{ color: '#555' }}>
                👷 {[tooltip.job.installer_1, tooltip.job.installer_2].filter(Boolean).join(', ')}
              </div>
            )}
            {tooltip.job.contract_date && (
              <div style={{ color: '#888', fontSize: 11 }}>
                Signed {new Date(tooltip.job.contract_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            {tooltip.job.work_order_rows && tooltip.job.work_order_rows.length > 0 && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Work Order</div>
                {tooltip.job.work_order_rows.map((row: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: '#444', display: 'flex', justifyContent: 'space-between', gap: 6, lineHeight: 1.6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description || row.item || row[0] || JSON.stringify(row)}</span>
                    {(row.qty || row.quantity || row[1]) && <span style={{ color: '#888', flexShrink: 0 }}>×{row.qty || row.quantity || row[1]}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4, display: 'flex', gap: 8 }}>
            {tooltip.job.measure_sheet_url && <span style={{ color: '#036A43', fontSize: 11 }}>📋 Packet</span>}
            {tooltip.job.companycam_url && <span style={{ color: '#036A43', fontSize: 11 }}>📸 CCam</span>}
            <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>{tooltip.job.lp_status_label || tooltip.job.lp_status}</span>
          </div>
        </div>
      )}

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
                  <select value={formInstaller} onChange={e => setFormInstaller(e.target.value)} style={{ ...inputStyle(), background: '#fff' }}>
                    <option value="">Select crew...</option>
                    {installers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                  style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => { pendingDrop.current = null; setModal({ open: false, startTime: '', endTime: '', job: null }) }}
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

      {/* ─── Availability Edit Modal ─── */}
      {availEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 400, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            <div style={{ background: '#8B0000', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                Availability Note — {new Date(availEdit.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <button onClick={() => setAvailEdit(null)} style={{ border: 'none', background: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                autoFocus
                value={availEdit.value}
                onChange={e => setAvailEdit({ ...availEdit, value: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Escape') setAvailEdit(null)
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveAvailability(availEdit.date, availEdit.value)
                }}
                placeholder={`e.g.\nRicardo off all day\nJay W available AM only\nMatt Burger out`}
                rows={4}
                style={{ width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <div style={{ fontSize: 11, color: '#aaa' }}>Tip: Press Cmd+Enter to save, Escape to cancel</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                {availability[availEdit.date] && (
                  <button
                    onClick={() => saveAvailability(availEdit.date, '')}
                    disabled={availSaving}
                    style={{ fontSize: 12, padding: '7px 12px', borderRadius: 6, border: '1px solid #f5c2c2', background: '#fff5f5', color: '#A32D2D', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button onClick={() => setAvailEdit(null)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={() => saveAvailability(availEdit.date, availEdit.value)}
                    disabled={availSaving}
                    style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: availSaving ? '#aaa' : '#8B0000', color: '#fff', cursor: availSaving ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                  >
                    {availSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
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
          <div onMouseDown={handlePopupMouseDown}
            style={{ padding: '12px 14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, cursor: 'grab', flexShrink: 0, userSelect: 'none' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR_MAP[popup.event.event_type], flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{popup.event.title}</div>
            <button onClick={() => { setPopup({ open: false, event: null, x: 0, y: 0 }); setEditMode(false) }}
              style={{ border: 'none', background: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>

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
              const cleaned = cleanDescription(popup.event.notes)
              const { measureUrl, companycamUrl, phone } = extractLinks(popup.event.notes)
              return <>
                {phone && <div style={{ color: '#036A43', fontWeight: 500 }}>📞 {phone}</div>}
                {cleaned ? <div style={{ whiteSpace: 'pre-wrap', color: '#444', fontSize: 12, lineHeight: 1.5 }}>{cleaned}</div> : null}
                {measureUrl && <a href={measureUrl} target="_blank" rel="noreferrer" style={{ color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>📋 Measure Packet</a>}
                {companycamUrl && <a href={companycamUrl} target="_blank" rel="noreferrer" style={{ color: '#036A43', textDecoration: 'none', fontWeight: 500 }}>📸 CompanyCam</a>}
              </>
            })()}
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
                    <select value={formInstaller} onChange={e => setFormInstaller(e.target.value)} style={{ ...inputStyle(12), background: '#fff' }}>
                      <option value="">Select crew...</option>
                      {installers.map(c => <option key={c} value={c}>{c}</option>)}
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
      {/* ─── Delete Confirmation ─── */}
      {deleteConfirm && popup.event && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 360, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Delete Event</div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#444' }}>
                Delete <strong>{popup.event.title}</strong>?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <button onClick={() => confirmDelete(false)} disabled={deleting}
                  style={{ fontSize: 12, padding: '9px 14px', borderRadius: 6, border: '1px solid #f5c2c2', background: '#fff5f5', color: '#A32D2D', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
                  🗑 Delete from app only
                </button>
                <button onClick={() => confirmDelete(true)} disabled={deleting}
                  style={{ fontSize: 12, padding: '9px 14px', borderRadius: 6, border: '1px solid #f5c2c2', background: '#A32D2D', color: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
                  🗑 Delete from app + Google Calendar
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  style={{ fontSize: 12, padding: '9px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
