import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { api, type InvoiceWithDetails, type Settings } from '../lib/api'
import { InvoicePDF } from '../components/InvoicePDF'
import { useToast } from '../components/Toast'

export function InvoiceDetail() {
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    loadInvoice()
  }, [id])

  async function loadInvoice() {
    try {
      const [invoiceData, settingsData] = await Promise.all([
        api.invoices.get(parseInt(id!)),
        api.settings.get(),
      ])
      setInvoice(invoiceData)
      setSettings(settingsData)
      // Pre-fill remaining balance
      const paid = invoiceData.payments.reduce((sum, p) => sum + p.amount, 0)
      setPaymentAmount(String(Math.max(0, invoiceData.subtotal - paid)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!invoice || invoice.status !== 'draft') return
    try {
      await api.invoices.send(invoice.id)
      toast('Invoice marked as sent')
      await loadInvoice()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send invoice', 'error')
    }
  }

  async function handleVoid() {
    if (!invoice || !confirm('Void this invoice? Time entries will be unlinked.')) return
    try {
      await api.invoices.void(invoice.id)
      toast('Invoice voided')
      await loadInvoice()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to void invoice', 'error')
    }
  }

  async function handleDelete() {
    if (!invoice || !confirm('Delete this invoice?')) return
    try {
      await api.invoices.delete(invoice.id)
      toast('Invoice deleted')
      navigate('/invoices')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete invoice', 'error')
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice || !paymentAmount) return

    setSubmitting(true)
    try {
      const amount = parseFloat(paymentAmount)
      await api.payments.create(invoice.id, {
        amount,
        date: paymentDate,
        method: paymentMethod || null,
        reference: paymentReference || null,
      })
      toast(`Recorded ${formatCurrency(amount)} payment`)
      await loadInvoice()
      setShowPaymentForm(false)
      setPaymentMethod('')
      setPaymentReference('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record payment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeletePayment(paymentId: number) {
    if (!confirm('Delete this payment?')) return
    try {
      await api.payments.delete(paymentId)
      toast('Payment deleted')
      await loadInvoice()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete payment', 'error')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  async function handleDownloadPDF() {
    if (!invoice) return
    const blob = await pdf(<InvoicePDF invoice={invoice} settings={settings} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!invoice) return <div className="error">Invoice not found</div>

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = invoice.subtotal - totalPaid
  const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date()

  return (
    <section>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/invoices" className="fg-3" style={{ fontSize: '0.75rem' }}>
          &larr; Invoices
        </Link>
      </div>

      <div className="flex flex-between" style={{ marginBottom: '2rem', alignItems: 'flex-start' }}>
        <div>
          <div className="invoice-number" style={{ fontSize: '1.5rem' }}>
            {invoice.invoice_number}
          </div>
          <div className="flex" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className={`status ${isOverdue ? 'overdue' : invoice.status}`}>
              {isOverdue ? 'Overdue' : invoice.status}
            </span>
            <button className="btn" onClick={handleDownloadPDF} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
              PDF
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-value mono">{formatCurrency(invoice.subtotal)}</div>
        </div>
      </div>

      <div className="invoice-parties" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="fg-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 500 }}>From</div>
          {settings?.business_name ? (
            <>
              <div style={{ fontWeight: 600 }}>{settings.business_name}</div>
              {settings.business_email && <div className="fg-2">{settings.business_email}</div>}
              {settings.business_address && (
                <div className="fg-2" style={{ whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                  {settings.business_address}
                </div>
              )}
            </>
          ) : (
            <div className="fg-3">
              <Link to="/settings">Add your business info →</Link>
            </div>
          )}
        </div>
        <div>
          <div className="fg-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 500 }}>Bill To</div>
          <div style={{ fontWeight: 600 }}>{invoice.client_name}</div>
          {invoice.client_email && <div className="fg-2">{invoice.client_email}</div>}
          {invoice.client_address && (
            <div className="fg-2" style={{ whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
              {invoice.client_address}
            </div>
          )}
        </div>
      </div>

      <div className="stats" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="stat-value mono fg-3">{invoice.issue_date}</div>
          <div className="stat-label">Issued</div>
        </div>
        <div>
          <div className={`stat-value mono ${isOverdue ? 'warning' : ''}`}>{invoice.due_date}</div>
          <div className="stat-label">Due</div>
        </div>
        <div>
          <div className="stat-value mono positive">{formatCurrency(totalPaid)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div>
          <div className={`stat-value mono ${balance > 0 ? 'warning' : 'positive'}`}>
            {formatCurrency(balance)}
          </div>
          <div className="stat-label">Balance</div>
        </div>
      </div>

      <h1>Line Items</h1>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th className="row-hours">Qty</th>
            <th className="row-amount">Rate</th>
            <th className="row-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td className="row-hours mono">{item.quantity}</td>
              <td className="row-amount mono">{formatCurrency(item.rate)}</td>
              <td className="row-amount mono">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 500 }}>Total</td>
            <td className="row-amount mono" style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal)}</td>
          </tr>
        </tfoot>
      </table>

      {settings?.payment_instructions && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '0.25rem' }}>
          <div className="fg-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Instructions</div>
          <div style={{ whiteSpace: 'pre-line' }}>{settings.payment_instructions}</div>
        </div>
      )}

      {invoice.payments.length > 0 && (
        <>
          <h1 style={{ marginTop: '2rem' }}>Payments</h1>
          <table>
            <thead>
              <tr>
                <th className="row-date">Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th className="row-amount">Amount</th>
                <th className="row-actions"></th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="row-date mono">{payment.date}</td>
                  <td>{payment.method || '—'}</td>
                  <td className="fg-2">{payment.reference || '—'}</td>
                  <td className="row-amount mono positive">{formatCurrency(payment.amount)}</td>
                  <td className="row-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleDeletePayment(payment.id)}
                      aria-label="Delete payment"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {invoice.status !== 'void' && invoice.status !== 'paid' && (
        <>
          <div className="flex" style={{ marginTop: '2rem', gap: '0.5rem' }}>
            {invoice.status === 'draft' && (
              <button className="btn btn-primary" onClick={handleSend}>
                Mark as Sent
              </button>
            )}
            {balance > 0 && (
              <button className="btn" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                Record Payment
              </button>
            )}
            <button className="btn" onClick={handleVoid}>
              Void
            </button>
            {invoice.status === 'draft' && (
              <button className="btn" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>

          {showPaymentForm && (
            <form onSubmit={handleRecordPayment} style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)' }}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div>
                  <label htmlFor="pdate">Date</label>
                  <input
                    type="date"
                    id="pdate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="pamount">Amount</label>
                  <input
                    type="number"
                    id="pamount"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mono"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pmethod">Method</label>
                  <input
                    type="text"
                    id="pmethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Check, ACH, etc."
                    maxLength={50}
                  />
                </div>
                <div>
                  <label htmlFor="pref">Reference</label>
                  <input
                    type="text"
                    id="pref"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Check #, etc."
                    maxLength={100}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
                <button type="button" className="btn" onClick={() => setShowPaymentForm(false)} style={{ marginLeft: '0.5rem' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}
