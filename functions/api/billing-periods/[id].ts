import { Hono } from 'hono'
import type { Env, BillingPeriod } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/billing-periods/:id')

// GET /api/billing-periods/:id
app.get('/', async (c) => {
  const id = c.req.param('id')
  const period = await c.env.DB.prepare(
    'SELECT * FROM billing_periods WHERE id = ?'
  ).bind(id).first<BillingPeriod>()

  if (!period) {
    return c.json({ error: 'Billing period not found' }, 404)
  }

  return c.json(period)
})

// PUT /api/billing-periods/:id
app.put('/', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<BillingPeriod>>()

  const result = await c.env.DB.prepare(
    `UPDATE billing_periods SET
       name = COALESCE(?, name),
       start_date = COALESCE(?, start_date),
       end_date = COALESCE(?, end_date)
     WHERE id = ?
     RETURNING *`
  ).bind(
    body.name ?? null,
    body.start_date ?? null,
    body.end_date ?? null,
    id
  ).first<BillingPeriod>()

  if (!result) {
    return c.json({ error: 'Billing period not found' }, 404)
  }

  return c.json(result)
})

// PUT /api/billing-periods/:id/close
app.put('/close', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    `UPDATE billing_periods SET closed_at = datetime('now') WHERE id = ? AND closed_at IS NULL RETURNING *`
  ).bind(id).first<BillingPeriod>()

  if (!result) {
    return c.json({ error: 'Billing period not found or already closed' }, 400)
  }

  return c.json(result)
})

// PUT /api/billing-periods/:id/reopen
app.put('/reopen', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    `UPDATE billing_periods SET closed_at = NULL WHERE id = ? RETURNING *`
  ).bind(id).first<BillingPeriod>()

  if (!result) {
    return c.json({ error: 'Billing period not found' }, 404)
  }

  return c.json(result)
})

// DELETE /api/billing-periods/:id
app.delete('/', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    'DELETE FROM billing_periods WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Billing period not found' }, 404)
  }

  return c.json({ success: true })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
