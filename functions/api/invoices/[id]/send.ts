import { Hono } from 'hono'
import type { Env } from '../../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/invoices/:id/send')

// POST /api/invoices/:id/send - Mark invoice as sent
app.post('/', async (c) => {
  const invoiceId = c.req.param('id')

  // Verify invoice exists and is in draft status
  const invoice = await c.env.DB.prepare(
    'SELECT id, status FROM invoices WHERE id = ?'
  ).bind(invoiceId).first<{ id: number; status: string }>()

  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404)
  }

  if (invoice.status !== 'draft') {
    return c.json({ error: 'Only draft invoices can be sent' }, 400)
  }

  await c.env.DB.prepare(
    `UPDATE invoices SET status = 'sent' WHERE id = ?`
  ).bind(invoiceId).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM invoices WHERE id = ?'
  ).bind(invoiceId).first()

  return c.json(updated)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
