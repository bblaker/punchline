import { Hono } from 'hono'
import type { Env } from '../../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/invoices/:id/void')

// POST /api/invoices/:id/void - Void an invoice
app.post('/', async (c) => {
  const invoiceId = c.req.param('id')

  // Verify invoice exists and is not already void
  const invoice = await c.env.DB.prepare(
    'SELECT id, status FROM invoices WHERE id = ?'
  ).bind(invoiceId).first<{ id: number; status: string }>()

  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  if (invoice.status === 'void') {
    return c.json({ error: 'Invoice is already void' }, 400)
  }

  // Unlink time entries from this invoice
  await c.env.DB.prepare(
    `UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = ?`
  ).bind(invoiceId).run()

  // Mark invoice as void
  await c.env.DB.prepare(
    `UPDATE invoices SET status = 'void' WHERE id = ?`
  ).bind(invoiceId).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM invoices WHERE id = ?'
  ).bind(invoiceId).first()

  return c.json(updated)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
