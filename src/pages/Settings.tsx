import { useEffect, useState, useCallback } from 'react'
import { api, type Settings } from '../lib/api'
import { useToast } from '../components/Toast'

export function Settings() {
  const { toast } = useToast()
  const [, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('INV-')

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.settings.get()
      setSettings(data)
      setBusinessName(data.business_name || '')
      setBusinessEmail(data.business_email || '')
      setBusinessAddress(data.business_address || '')
      setPaymentInstructions(data.payment_instructions || '')
      setInvoiceNotes(data.invoice_notes || '')
      setInvoicePrefix(data.invoice_prefix || 'INV-')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updated = await api.settings.update({
        business_name: businessName.trim() || null,
        business_email: businessEmail.trim() || null,
        business_address: businessAddress.trim() || null,
        payment_instructions: paymentInstructions.trim() || null,
        invoice_notes: invoiceNotes.trim() || null,
        invoice_prefix: invoicePrefix.trim() || 'INV-',
      })
      setSettings(updated)
      toast('Settings saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <section id="settings">
      <h1>Business Settings</h1>
      <p className="fg-2" style={{ marginBottom: '2rem', marginTop: '-1rem' }}>
        This information appears on your invoices.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="settings-grid">
          <div className="settings-section">
            <h2 className="settings-section-title">Your Business</h2>

            <div className="form-field">
              <label htmlFor="businessName">Business Name</label>
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Company Name"
                maxLength={200}
              />
            </div>

            <div className="form-field">
              <label htmlFor="businessEmail">Email</label>
              <input
                type="email"
                id="businessEmail"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="billing@yourcompany.com"
                maxLength={200}
              />
            </div>

            <div className="form-field">
              <label htmlFor="businessAddress">Address</label>
              <textarea
                id="businessAddress"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="123 Main St&#10;City, State 12345"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Invoice Defaults</h2>

            <div className="form-field">
              <label htmlFor="invoicePrefix">Invoice Number Prefix</label>
              <input
                type="text"
                id="invoicePrefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                maxLength={20}
                className="mono"
                style={{ maxWidth: '8rem' }}
              />
              <span className="field-hint">e.g., INV-001, INV-002</span>
            </div>

            <div className="form-field">
              <label htmlFor="paymentInstructions">Payment Instructions</label>
              <textarea
                id="paymentInstructions"
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Bank: Your Bank Name&#10;Account: 1234567890&#10;Routing: 123456789&#10;&#10;Or pay via PayPal: you@email.com"
                rows={5}
                maxLength={1000}
              />
              <span className="field-hint">How clients should pay you</span>
            </div>

            <div className="form-field">
              <label htmlFor="invoiceNotes">Default Invoice Notes</label>
              <textarea
                id="invoiceNotes"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Thank you for your business!"
                rows={2}
                maxLength={500}
              />
              <span className="field-hint">Appears at the bottom of every invoice</span>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </section>
  )
}
