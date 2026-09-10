import { Hono } from 'hono'
import type { Env, Invoice, InvoiceLineItem, Payment } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/invoices/:id')

// GET /api/invoices/:id
app.get('/', async (c) => {
  const id = c.req.param('id')

  const invoice = await c.env.DB.prepare(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.id = ?`
  ).bind(id).first()

  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  const lineItems = await c.env.DB.prepare(
    `SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order`
  ).bind(id).all<InvoiceLineItem>()

  const payments = await c.env.DB.prepare(
    `SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC`
  ).bind(id).all<Payment>()

  return c.json({
    ...invoice,
    line_items: lineItems.results,
    payments: payments.results,
  })
})

// PUT /api/invoices/:id
app.put('/', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<Invoice>>()

  const result = await c.env.DB.prepare(
    `UPDATE invoices SET
       issue_date = COALESCE(?, issue_date),
       due_date = COALESCE(?, due_date),
       status = COALESCE(?, status),
       subtotal = COALESCE(?, subtotal),
       notes = COALESCE(?, notes)
     WHERE id = ?
     RETURNING *`
  ).bind(
    body.issue_date ?? null,
    body.due_date ?? null,
    body.status ?? null,
    body.subtotal ?? null,
    body.notes ?? null,
    id
  ).first<Invoice>()

  if (!result) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  return c.json(result)
})

// DELETE /api/invoices/:id
app.delete('/', async (c) => {
  const id = c.req.param('id')

  // Unlink time entries first
  await c.env.DB.prepare(
    'UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = ?'
  ).bind(id).run()

  const result = await c.env.DB.prepare(
    'DELETE FROM invoices WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  return c.json({ success: true })
})

// POST /api/invoices/:id/send
app.post('/send', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    `UPDATE invoices SET status = 'sent' WHERE id = ? AND status = 'draft' RETURNING *`
  ).bind(id).first<Invoice>()

  if (!result) {
    return c.json({ error: 'Invoice not found or not in draft status' }, 400)
  }

  return c.json(result)
})

// POST /api/invoices/:id/void
app.post('/void', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    `UPDATE invoices SET status = 'void' WHERE id = ? RETURNING *`
  ).bind(id).first<Invoice>()

  if (!result) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  // Unlink time entries so they can be rebilled
  await c.env.DB.prepare(
    'UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = ?'
  ).bind(id).run()

  return c.json(result)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
