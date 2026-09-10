import { Hono } from 'hono'
import type { Env, TimeEntry } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/time-entries/:id')

// GET /api/time-entries/:id
app.get('/', async (c) => {
  const id = c.req.param('id')
  const entry = await c.env.DB.prepare(
    `SELECT te.*, p.name as project_name, c.name as client_name
     FROM time_entries te
     JOIN projects p ON te.project_id = p.id
     JOIN clients c ON p.client_id = c.id
     WHERE te.id = ?`
  ).bind(id).first()

  if (!entry) {
    return c.json({ error: 'Time entry not found' }, 404)
  }

  return c.json(entry)
})

// PUT /api/time-entries/:id
app.put('/', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<TimeEntry>>()

  const result = await c.env.DB.prepare(
    `UPDATE time_entries SET
       project_id = COALESCE(?, project_id),
       date = COALESCE(?, date),
       hours = COALESCE(?, hours),
       description = COALESCE(?, description),
       billable = COALESCE(?, billable)
     WHERE id = ?
     RETURNING *`
  ).bind(
    body.project_id ?? null,
    body.date ?? null,
    body.hours ?? null,
    body.description ?? null,
    body.billable ?? null,
    id
  ).first<TimeEntry>()

  if (!result) {
    return c.json({ error: 'Time entry not found' }, 404)
  }

  return c.json(result)
})

// DELETE /api/time-entries/:id
app.delete('/', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    'DELETE FROM time_entries WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Time entry not found' }, 404)
  }

  return c.json({ success: true })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
