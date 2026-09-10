import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Client, type DashboardData, type ProjectWithClient, type TimeEntryWithDetails } from '../lib/api'
import { useToast } from '../components/Toast'

export function Dashboard() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick entry form
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryProject, setEntryProject] = useState('')
  const [entryHours, setEntryHours] = useState('1.0')
  const [entryDesc, setEntryDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [dashboardData, clientsList, projectsList] = await Promise.all([
        api.dashboard.get(),
        api.clients.list(),
        api.projects.list({ active: true }),
      ])
      setData(dashboardData)
      setClients(clientsList)
      setProjects(projectsList)
      if (projectsList.length > 0) {
        setEntryProject((current) => current || String(projectsList[0].id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+N to focus quick entry
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        descRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleQuickEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!entryProject || !entryHours) return

    setSubmitting(true)
    try {
      const hours = parseFloat(entryHours)
      if (hours <= 0) {
        toast('Hours must be greater than 0', 'error')
        setSubmitting(false)
        return
      }

      await api.timeEntries.create({
        project_id: parseInt(entryProject),
        date: entryDate,
        hours,
        description: entryDesc || null,
        billable: 1,
      })

      const project = projects.find(p => p.id === parseInt(entryProject))
      toast(`Logged ${hours}h on ${project?.client_name} / ${project?.name}`)

      await loadData()
      setEntryDesc('')
      setEntryHours('1.0')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to log time', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
      form?.requestSubmit()
    }
    // Escape to clear
    if (e.key === 'Escape') {
      setEntryDesc('')
      setEntryHours('1.0')
    }
  }

  function startEdit(entry: TimeEntryWithDetails) {
    setEditingId(entry.id)
    setEditDate(entry.date)
    setEditHours(String(entry.hours))
    setEditDesc(entry.description || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDate('')
    setEditHours('')
    setEditDesc('')
  }

  async function saveEdit(entryId: number) {
    const hours = parseFloat(editHours)
    if (hours <= 0) {
      toast('Hours must be greater than 0', 'error')
      return
    }

    try {
      await api.timeEntries.update(entryId, {
        date: editDate,
        hours,
        description: editDesc || null,
      })
      toast('Entry updated')
      cancelEdit()
      await loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error')
    }
  }

  async function deleteEntry(entryId: number) {
    if (!confirm('Delete this time entry?')) return

    try {
      await api.timeEntries.delete(entryId)
      toast('Entry deleted')
      await loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent, entryId: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(entryId)
    }
    if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!data) return null

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <section id="time">
      <div className="stats">
        <div>
          <div className="stat-value">
            {data.unbilled_hours.toFixed(1)}<span className="fg-3" style={{ fontSize: '1rem' }}>h</span>
          </div>
          <div className="stat-label">Unbilled</div>
        </div>
        <div>
          <div className={`stat-value ${data.overdue.total > 0 ? 'warning' : ''}`}>
            {formatCurrency(data.outstanding.total)}
          </div>
          <div className="stat-label">Outstanding</div>
        </div>
        <div>
          <div className="stat-value positive">
            {formatCurrency(data.this_month.payments_received)}
          </div>
          <div className="stat-label">This month</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          {clients.length === 0 ? (
            <>
              <div className="empty-state-title">No Departures Scheduled</div>
              <p className="empty-state-text">Create a client to start logging time.</p>
              <Link to="/clients" className="btn btn-primary">
                Add Your First Client
              </Link>
            </>
          ) : (
            <>
              <div className="empty-state-title">No Departures Scheduled</div>
              <p className="empty-state-text">Add a project to your client to start logging time.</p>
              <Link to={`/clients/${clients[0].id}`} className="btn btn-primary">
                Add Your First Project
              </Link>
            </>
          )}
        </div>
      ) : (
        <form className="quick-entry" onSubmit={handleQuickEntry} aria-label="Log time entry">
          <div>
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              onKeyDown={handleFormKeyDown}
            />
          </div>
          <div>
            <label htmlFor="project">Project</label>
            <select
              id="project"
              value={entryProject}
              onChange={(e) => setEntryProject(e.target.value)}
              onKeyDown={handleFormKeyDown}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name} / {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hours">Hours</label>
            <input
              type="number"
              id="hours"
              step="0.25"
              min="0.25"
              value={entryHours}
              onChange={(e) => setEntryHours(e.target.value)}
              onKeyDown={handleFormKeyDown}
              className="mono"
            />
          </div>
          <div>
            <label htmlFor="desc">Description</label>
            <input
              ref={descRef}
              type="text"
              id="desc"
              placeholder="What did you work on?"
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              onKeyDown={handleFormKeyDown}
              maxLength={200}
            />
          </div>
          <div>
            <label>
              <span className="kbd">{isMac ? '⌘' : 'Ctrl'}+↵</span>
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? '...' : 'Log'}
            </button>
          </div>
        </form>
      )}

      <h1>Recent Entries</h1>
      {data.recent_entries.length === 0 ? (
        <p className="fg-2">No time entries yet. Log some time above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="row-date">Date</th>
              <th>Project / Description</th>
              <th className="row-hours">Hours</th>
              <th className="row-actions"></th>
            </tr>
          </thead>
          <tbody>
            {data.recent_entries.map((entry) =>
              editingId === entry.id ? (
                <tr key={entry.id}>
                  <td colSpan={4}>
                    <div className="inline-edit">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, entry.id)}
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, entry.id)}
                        placeholder="Description"
                      />
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, entry.id)}
                        className="mono"
                      />
                      <button className="btn btn-primary" onClick={() => saveEdit(entry.id)}>
                        Save
                      </button>
                      <button className="btn" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={entry.id}>
                  <td className="row-date fg-3 mono">{entry.date}</td>
                  <td>
                    <div className="entry-project">
                      {entry.client_name} / {entry.project_name}
                      {entry.billable ? (
                        <span className="entry-tag billable">billable</span>
                      ) : (
                        <span className="entry-tag">non-billable</span>
                      )}
                      {entry.invoice_id && <span className="entry-tag">invoiced</span>}
                    </div>
                    {entry.description && (
                      <div className="entry-desc">{entry.description}</div>
                    )}
                  </td>
                  <td className="row-hours mono">{entry.hours.toFixed(1)}</td>
                  <td className="row-actions">
                    {!entry.invoice_id && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="edit-btn"
                          onClick={() => startEdit(entry)}
                          aria-label="Edit entry"
                          title="Edit"
                                                  >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => deleteEntry(entry.id)}
                          aria-label="Delete entry"
                          title="Delete"
                                                  >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {data.recent_invoices.length > 0 && (
        <>
          <h1 style={{ marginTop: '2rem' }}>Recent Invoices</h1>
          <table>
            <thead>
              <tr>
                <th style={{ width: '8rem' }}>Invoice</th>
                <th>Client</th>
                <th className="row-amount">Amount</th>
                <th className="row-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="clickable-row"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.id}`)}
                >
                  <td className="invoice-number">{inv.invoice_number}</td>
                  <td>{inv.client_name}</td>
                  <td className="row-amount mono">{formatCurrency(inv.subtotal)}</td>
                  <td>
                    <span className={`status ${inv.status}`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="fg-3" style={{ fontSize: '0.75rem', marginTop: '2rem' }}>
        <span className="kbd">{isMac ? '⌘' : 'Ctrl'}+N</span> Focus quick entry
      </p>
    </section>
  )
}
