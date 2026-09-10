import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type InvoiceWithClient, type Client, type TimeEntryWithDetails } from '../lib/api'
import { useToast } from '../components/Toast'

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

export function Invoices() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [unbilledEntries, setUnbilledEntries] = useState<TimeEntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  // New invoice wizard
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(0) // 0=closed, 1=select client, 2=select entries
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedEntries, setSelectedEntries] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [invoicesData, clientsData, entriesData] = await Promise.all([
        api.invoices.list(),
        api.clients.list(),
        api.timeEntries.list({ unbilled: true }),
      ])
      setInvoices(invoicesData)
      setClients(clientsData)
      setUnbilledEntries(entriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvoice() {
    if (!selectedClient || selectedEntries.length === 0) return

    setSubmitting(true)
    try {
      const invoice = await api.invoices.create({
        client_id: parseInt(selectedClient),
        time_entry_ids: selectedEntries,
      })
      toast(`Created invoice ${invoice.invoice_number}`)
      await loadData()
      resetWizard()
      navigate(`/invoices/${invoice.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create invoice', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setWizardStep(0)
    setSelectedClient('')
    setSelectedEntries([])
  }

  function toggleEntry(id: number) {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  function selectAllForClient() {
    if (!selectedClient) return
    const clientEntries = filteredEntriesForClient.map((e) => e.id)
    setSelectedEntries(clientEntries)
  }

  function clearSelection() {
    setSelectedEntries([])
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const isOverdue = (invoice: InvoiceWithClient) =>
    invoice.status === 'sent' && new Date(invoice.due_date) < new Date()

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter(isOverdue)
      } else {
        result = result.filter((inv) => inv.status === statusFilter)
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.client_name.toLowerCase().includes(q)
      )
    }

    return result
  }, [invoices, statusFilter, search])

  // Get unbilled entries for selected client
  const filteredEntriesForClient = useMemo(() => {
    if (!selectedClient) return []
    return unbilledEntries.filter((e) => {
      const client = clients.find((c) => c.name === e.client_name)
      return client?.id === parseInt(selectedClient)
    })
  }, [unbilledEntries, clients, selectedClient])

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return filteredEntriesForClient
      .filter((e) => selectedEntries.includes(e.id))
      .reduce((sum, e) => sum + e.hours * e.effective_rate, 0)
  }, [filteredEntriesForClient, selectedEntries])

  const selectedHours = useMemo(() => {
    return filteredEntriesForClient
      .filter((e) => selectedEntries.includes(e.id))
      .reduce((sum, e) => sum + e.hours, 0)
  }, [filteredEntriesForClient, selectedEntries])

  // Clients with unbilled time
  const clientsWithUnbilled = useMemo(() => {
    const clientIds = new Set(
      unbilledEntries.map((e) => {
        const client = clients.find((c) => c.name === e.client_name)
        return client?.id
      })
    )
    return clients.filter((c) => clientIds.has(c.id))
  }, [clients, unbilledEntries])

  const hasActiveFilters = statusFilter !== 'all' || search.trim()

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <section id="invoices">
      <div className="flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: 0 }}>Invoices</h1>
        <button
          className="btn btn-primary"
          onClick={() => setWizardStep(1)}
          disabled={clientsWithUnbilled.length === 0}
          title={clientsWithUnbilled.length === 0 ? 'No unbilled time to invoice' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Invoice Creation Wizard */}
      {wizardStep > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ color: wizardStep >= 1 ? 'var(--accent)' : 'var(--fg-3)' }}>
              1. Select Client
            </span>
            <span className="fg-3">→</span>
            <span style={{ color: wizardStep >= 2 ? 'var(--accent)' : 'var(--fg-3)' }}>
              2. Select Time
            </span>
            <span className="fg-3">→</span>
            <span className="fg-3">3. Create</span>
          </div>

          {/* Step 1: Select Client */}
          {wizardStep === 1 && (
            <>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Which client are you billing?
              </label>
              <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '24rem' }}>
                {clientsWithUnbilled.map((client) => {
                  const clientEntries = unbilledEntries.filter((e) => {
                    const c = clients.find((c) => c.name === e.client_name)
                    return c?.id === client.id
                  })
                  const totalHours = clientEntries.reduce((s, e) => s + e.hours, 0)
                  const totalValue = clientEntries.reduce((s, e) => s + e.hours * e.effective_rate, 0)

                  return (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(String(client.id))
                        setWizardStep(2)
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{client.name}</span>
                      <span className="mono fg-2" style={{ fontSize: '0.875rem' }}>
                        {totalHours.toFixed(1)}h · {formatCurrency(totalValue)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button className="btn" onClick={resetWizard} style={{ marginTop: '1rem' }}>
                Cancel
              </button>
            </>
          )}

          {/* Step 2: Select Entries */}
          {wizardStep === 2 && (
            <>
              <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
                <div>
                  <button className="fg-3" onClick={() => setWizardStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                    ← Back
                  </button>
                  <span style={{ fontWeight: 500, marginLeft: '0.5rem' }}>
                    {clients.find((c) => c.id === parseInt(selectedClient))?.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" onClick={selectAllForClient} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Select All
                  </button>
                  {selectedEntries.length > 0 && (
                    <button className="btn" onClick={clearSelection} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {filteredEntriesForClient.length === 0 ? (
                <p className="fg-2">No unbilled time for this client.</p>
              ) : (
                <table style={{ marginBottom: '1rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '2rem' }}></th>
                      <th className="row-date">Date</th>
                      <th>Project / Description</th>
                      <th className="row-hours">Hours</th>
                      <th className="row-amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntriesForClient.map((entry) => (
                      <tr
                        key={entry.id}
                        onClick={() => toggleEntry(entry.id)}
                        style={{ cursor: 'pointer', background: selectedEntries.includes(entry.id) ? 'var(--bg)' : undefined }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="row-date fg-3 mono">{entry.date}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{entry.project_name}</div>
                          {entry.description && (
                            <div className="fg-2" style={{ fontSize: '0.875rem' }}>{entry.description}</div>
                          )}
                        </td>
                        <td className="row-hours mono">{entry.hours.toFixed(1)}</td>
                        <td className="row-amount mono">{formatCurrency(entry.hours * entry.effective_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Preview and Create */}
              <div style={{ padding: '1rem', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div className="flex flex-between" style={{ marginBottom: selectedEntries.length > 0 ? '1rem' : 0 }}>
                  <div>
                    <span className="fg-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Invoice Preview</span>
                    {selectedEntries.length > 0 && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="mono">{selectedEntries.length}</span> entries ·{' '}
                        <span className="mono">{selectedHours.toFixed(1)}</span>h
                      </div>
                    )}
                  </div>
                  {selectedEntries.length > 0 && (
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
                      {formatCurrency(selectedTotal)}
                    </div>
                  )}
                </div>

                {selectedEntries.length > 0 ? (
                  <div className="flex" style={{ gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleCreateInvoice}
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Invoice'}
                    </button>
                    <button className="btn" onClick={resetWizard}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="fg-3" style={{ fontSize: '0.875rem', margin: 0 }}>
                    Select time entries above to create an invoice
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      {invoices.length > 0 && (
        <div className="search-bar">
          <div className="search-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {(['all', 'draft', 'sent', 'paid', 'overdue'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button
              className="clear-filters"
              onClick={() => {
                setStatusFilter('all')
                setSearch('')
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <p className="fg-2">
          {hasActiveFilters
            ? 'No invoices match your filters.'
            : 'No invoices yet. Create one above!'}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: '8rem' }}>Invoice</th>
              <th>Client</th>
              <th className="row-date">Issued</th>
              <th className="row-amount">Amount</th>
              <th className="row-status">Status</th>
              <th className="row-date">Due</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
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
                <td className="mono fg-3">{inv.issue_date}</td>
                <td className="row-amount mono">{formatCurrency(inv.subtotal)}</td>
                <td>
                  <span className={`status ${isOverdue(inv) ? 'overdue' : inv.status}`}>
                    {isOverdue(inv) ? 'Overdue' : inv.status}
                  </span>
                </td>
                <td className={`mono ${isOverdue(inv) ? 'warning' : 'fg-3'}`}>
                  {inv.status === 'paid' ? '—' : inv.due_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="summary">
        <span className="warning mono">
          {formatCurrency(invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.subtotal, 0))}
        </span>{' '}
        outstanding ·{' '}
        <span className="positive mono">
          {formatCurrency(invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.subtotal, 0))}
        </span>{' '}
        collected
      </div>

      {filteredInvoices.length > 0 && filteredInvoices.length < invoices.length && (
        <p className="fg-3" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
      )}
    </section>
  )
}
