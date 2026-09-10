import { Hono } from 'hono'
import type { Env, TimeEntry } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/time-entries')

// GET /api/time-entries - List time entries with filters
app.get('/', async (c) => {
  const projectId = c.req.query('project_id')
  const clientId = c.req.query('client_id')
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')
  const unbilledOnly = c.req.query('unbilled') === 'true'
  const limit = parseInt(c.req.query('limit') ?? '100', 10)
  const offset = parseInt(c.req.query('offset') ?? '0', 10)

  let query = `
    SELECT te.*, p.name as project_name, c.name as client_name,
           COALESCE(p.rate, c.default_rate) as effective_rate
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (projectId) {
    query += ' AND te.project_id = ?'
    params.push(projectId)
  }

  if (clientId) {
    query += ' AND p.client_id = ?'
    params.push(clientId)
  }

  if (startDate) {
    query += ' AND te.date >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND te.date <= ?'
    params.push(endDate)
  }

  if (unbilledOnly) {
    query += ' AND te.billable = 1 AND te.invoice_id IS NULL'
  }

  query += ' ORDER BY te.date DESC, te.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const stmt = c.env.DB.prepare(query)
  const result = await stmt.bind(...params).all()

  return c.json(result.results)
})

// POST /api/time-entries - Create a time entry
app.post('/', async (c) => {
  const body = await c.req.json<Partial<TimeEntry>>()

  if (!body.project_id || !body.date || body.hours === undefined) {
    return c.json({ error: 'project_id, date, and hours are required' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO time_entries (project_id, date, hours, description, billable)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(
    body.project_id,
    body.date,
    body.hours,
    body.description ?? null,
    body.billable ?? 1
  ).first<TimeEntry>()

  return c.json(result, 201)
})

// POST /api/time-entries/bulk - Create multiple time entries
app.post('/bulk', async (c) => {
  const entries = await c.req.json<Partial<TimeEntry>[]>()

  if (!Array.isArray(entries) || entries.length === 0) {
    return c.json({ error: 'Array of entries is required' }, 400)
  }

  const results: TimeEntry[] = []
  for (const entry of entries) {
    if (!entry.project_id || !entry.date || entry.hours === undefined) {
      continue
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO time_entries (project_id, date, hours, description, billable)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      entry.project_id,
      entry.date,
      entry.hours,
      entry.description ?? null,
      entry.billable ?? 1
    ).first<TimeEntry>()

    if (result) results.push(result)
  }

  return c.json(results, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
