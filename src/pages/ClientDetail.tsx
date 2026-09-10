import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type Client, type ProjectWithClient, type TimeEntryWithDetails } from '../lib/api'
import { useToast } from '../components/Toast'

export function ClientDetail() {
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New project form
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectRate, setProjectRate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [clientData, projectsData, entriesData] = await Promise.all([
        api.clients.get(parseInt(id!)),
        api.projects.list({ client_id: parseInt(id!) }),
        api.timeEntries.list({ client_id: parseInt(id!), limit: 50 }),
      ])
      setClient(clientData)
      setProjects(projectsData)
      setEntries(entriesData)
      // Auto-show project form if no projects exist yet
      if (projectsData.length === 0) {
        setShowProjectForm(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim() || !id) return

    setSubmitting(true)
    try {
      await api.projects.create({
        client_id: parseInt(id),
        name: projectName.trim(),
        rate: projectRate ? parseFloat(projectRate) : null,
      })
      toast(`Created project ${projectName.trim()}`)
      await loadData()
      setProjectName('')
      setProjectRate('')
      setShowProjectForm(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create project', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleProject(project: ProjectWithClient) {
    const isActive = project.active === 1
    try {
      if (isActive) {
        await api.projects.delete(project.id)
        toast(`Deactivated ${project.name}`)
      } else {
        await api.projects.update(project.id, { active: 1 })
        toast(`Activated ${project.name}`)
      }
      await loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update project', 'error')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!client) return <div className="error">Client not found</div>

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
  const unbilledHours = entries.filter((e) => e.billable && !e.invoice_id).reduce((sum, e) => sum + e.hours, 0)

  return (
    <section>
      <div className="flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <Link to="/clients" className="fg-3" style={{ fontSize: '0.75rem' }}>
            &larr; Clients
          </Link>
          <h1 style={{ marginBottom: 0, marginTop: '0.5rem', fontSize: '1.5rem', textTransform: 'none', letterSpacing: 'normal', color: 'var(--fg)' }}>
            {client.name}
          </h1>
          {client.email && <div className="fg-2">{client.email}</div>}
        </div>
        <div className="client-stat">
          <span>Rate</span>
          {formatCurrency(client.default_rate)}/hr
        </div>
      </div>

      <div className="stats" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="stat-value mono">{totalHours.toFixed(1)}<span className="fg-3" style={{ fontSize: '1rem' }}>h</span></div>
          <div className="stat-label">Total hours</div>
        </div>
        <div>
          <div className="stat-value mono warning">{unbilledHours.toFixed(1)}<span className="fg-3" style={{ fontSize: '1rem' }}>h</span></div>
          <div className="stat-label">Unbilled</div>
        </div>
      </div>

      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginBottom: 0 }}>Projects</h1>
        <button className="btn" onClick={() => setShowProjectForm(!showProjectForm)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add
        </button>
      </div>

      {showProjectForm && (
        <form onSubmit={handleAddProject} className="quick-entry" style={{ gridTemplateColumns: '1fr 8rem auto', marginBottom: '1rem' }}>
          <div>
            <label htmlFor="pname">Name</label>
            <input
              type="text"
              id="pname"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="prate">Rate ($/hr)</label>
            <input
              type="number"
              id="prate"
              step="0.01"
              min="0"
              value={projectRate}
              onChange={(e) => setProjectRate(e.target.value)}
              className="mono"
              placeholder={String(client.default_rate)}
            />
          </div>
          <div>
            <label>&nbsp;</label>
            <button type="submit" disabled={submitting}>
              {submitting ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="fg-2">No projects yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th className="row-hours">Rate</th>
              <th className="row-status">Status</th>
              <th className="row-actions"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} style={{ opacity: project.active ? 1 : 0.5 }}>
                <td>{project.name}</td>
                <td className="row-hours mono">
                  {formatCurrency(project.rate ?? client.default_rate)}
                </td>
                <td className="row-status">
                  <span className={`status ${project.active ? 'sent' : 'draft'}`}>
                    {project.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="row-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleToggleProject(project)}
                    aria-label={project.active ? 'Deactivate project' : 'Activate project'}
                    title={project.active ? 'Deactivate' : 'Activate'}
                  >
                    {project.active ? '−' : '+'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h1 style={{ marginTop: '2rem' }}>Recent Time</h1>
      {entries.length === 0 ? (
        <p className="fg-2">No time logged yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="row-date">Date</th>
              <th>Project / Description</th>
              <th className="row-hours">Hours</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 20).map((entry) => (
              <tr key={entry.id}>
                <td className="row-date fg-3 mono">{entry.date}</td>
                <td>
                  <div className="entry-project">
                    {entry.project_name}
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
