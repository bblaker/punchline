import { Hono } from 'hono'
import type { Env, BillingPeriod } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/billing-periods')

// GET /api/billing-periods
app.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM billing_periods ORDER BY start_date DESC'
  ).all<BillingPeriod>()

  return c.json(result.results)
})

// POST /api/billing-periods
app.post('/', async (c) => {
  const body = await c.req.json<Partial<BillingPeriod>>()

  if (!body.name || !body.start_date || !body.end_date) {
    return c.json({ error: 'name, start_date, and end_date are required' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO billing_periods (name, start_date, end_date)
     VALUES (?, ?, ?)
     RETURNING *`
  ).bind(body.name, body.start_date, body.end_date).first<BillingPeriod>()

  return c.json(result, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
