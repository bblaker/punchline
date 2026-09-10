import { Hono } from 'hono'
import type { Env, Payment } from '../../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/invoices/:id/payments')

// GET /api/invoices/:id/payments
app.get('/', async (c) => {
  const invoiceId = c.req.param('id')

  const payments = await c.env.DB.prepare(
    `SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC`
  ).bind(invoiceId).all<Payment>()

  return c.json(payments.results)
})

// POST /api/invoices/:id/payments
app.post('/', async (c) => {
  const invoiceId = c.req.param('id')
  const body = await c.req.json<Partial<Payment>>()

  if (body.amount === undefined) {
    return c.json({ error: 'amount is required' }, 400)
  }

  // Verify invoice exists
  const invoice = await c.env.DB.prepare(
    'SELECT id, subtotal, status FROM invoices WHERE id = ?'
  ).bind(invoiceId).first<{ id: number; subtotal: number; status: string }>()

  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  const payment = await c.env.DB.prepare(
    `INSERT INTO payments (invoice_id, date, amount, method, reference, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(
    invoiceId,
    body.date ?? new Date().toISOString().split('T')[0],
    body.amount,
    body.method ?? null,
    body.reference ?? null,
    body.notes ?? null
  ).first<Payment>()

  // Check if invoice is fully paid
  const totalPaid = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?'
  ).bind(invoiceId).first<{ total: number }>()

  if (totalPaid && totalPaid.total >= invoice.subtotal) {
    await c.env.DB.prepare(
      `UPDATE invoices SET status = 'paid' WHERE id = ?`
    ).bind(invoiceId).run()
  }

  return c.json(payment, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
