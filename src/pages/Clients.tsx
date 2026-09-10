import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Client } from '../lib/api'
import { useToast } from '../components/Toast'

export function Clients() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Search
  const [search, setSearch] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [defaultRate, setDefaultRate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    try {
      const data = await api.clients.list()
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setEmail('')
    setAddress('')
    setDefaultRate('')
    setNotes('')
    setEditingClient(null)
    setShowForm(false)
  }

  function startEdit(client: Client) {
    setEditingClient(client)
    setName(client.name)
    setEmail(client.email || '')
    setAddress(client.address || '')
    setDefaultRate(String(client.default_rate))
    setNotes(client.notes || '')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        default_rate: parseFloat(defaultRate) || 0,
        notes: notes.trim() || null,
      }

      if (editingClient) {
        await api.clients.update(editingClient.id, data)
        toast(`Updated ${data.name}`)
        await loadClients()
        resetForm()
      } else {
        const newClient = await api.clients.create(data)
        toast(`Created ${data.name} — now add a project`)
        navigate(`/clients/${newClient.id}`)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save client', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchive(client: Client) {
    if (!confirm(`Archive ${client.name}?`)) return

    try {
      await api.clients.delete(client.id)
      toast(`Archived ${client.name}`)
      await loadClients()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to archive client', 'error')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
    )
  }, [clients, search])

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <section id="clients">
      <div className="flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: 0 }}>Clients</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="client-form" style={{ marginBottom: '2rem' }}>
          <div className="form-grid">
            <div>
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor="rate">Default Rate ($/hr)</label>
              <input
                type="number"
                id="rate"
                step="0.01"
                min="0"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                className="mono"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingClient ? 'Update' : 'Create'}
            </button>
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {clients.length > 0 && (
        <div className="search-bar">
          <div className="search-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button className="clear-filters" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {filteredClients.length === 0 ? (
        <p className="fg-2">
          {search ? 'No clients match your search.' : 'No clients yet. Add your first client above!'}
        </p>
      ) : (
        filteredClients.map((client) => (
          <div
            key={client.id}
            className="client-row clickable-row"
            onClick={() => navigate(`/clients/${client.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/clients/${client.id}`)}
          >
            <div>
              <div className="client-name">{client.name}</div>
              {client.email && <div className="client-email">{client.email}</div>}
            </div>
            <div className="client-stat">
              <span>Rate</span>
              {formatCurrency(client.default_rate)}/hr
            </div>
            <div className="client-actions">
              <button
                className="edit-btn"
                onClick={(e) => { e.stopPropagation(); startEdit(client); }}
                aria-label="Edit client"
                title="Edit"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                className="edit-btn"
                onClick={(e) => { e.stopPropagation(); handleArchive(client); }}
                aria-label="Archive client"
                title="Archive"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}

      {filteredClients.length > 0 && filteredClients.length < clients.length && (
        <p className="fg-3" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
          Showing {filteredClients.length} of {clients.length} clients
        </p>
      )}
    </section>
  )
}
