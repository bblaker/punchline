import { Hono } from 'hono'
import type { Env, Payment } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/payments/:id')

// GET /api/payments/:id
app.get('/', async (c) => {
  const id = c.req.param('id')
  const payment = await c.env.DB.prepare(
    `SELECT p.*, i.invoice_number
     FROM payments p
     JOIN invoices i ON p.invoice_id = i.id
     WHERE p.id = ?`
  ).bind(id).first()

  if (!payment) {
    return c.json({ error: 'Payment not found' }, 404)
  }

  return c.json(payment)
})

// DELETE /api/payments/:id
app.delete('/', async (c) => {
  const id = c.req.param('id')

  // Get payment to find invoice
  const payment = await c.env.DB.prepare(
    'SELECT invoice_id FROM payments WHERE id = ?'
  ).bind(id).first<{ invoice_id: number }>()

  if (!payment) {
    return c.json({ error: 'Payment not found' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(id).run()

  // Recalculate invoice status
  const invoice = await c.env.DB.prepare(
    'SELECT subtotal FROM invoices WHERE id = ?'
  ).bind(payment.invoice_id).first<{ subtotal: number }>()

  const totalPaid = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?'
  ).bind(payment.invoice_id).first<{ total: number }>()

  if (invoice && totalPaid && totalPaid.total < invoice.subtotal) {
    await c.env.DB.prepare(
      `UPDATE invoices SET status = 'sent' WHERE id = ? AND status = 'paid'`
    ).bind(payment.invoice_id).run()
  }

  return c.json({ success: true })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
