import { Hono } from 'hono'
import type { Env, Project } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/projects')

// GET /api/projects - List projects
app.get('/', async (c) => {
  const clientId = c.req.query('client_id')
  const activeOnly = c.req.query('active') !== 'false'

  let query = `
    SELECT p.*, c.name as client_name
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (clientId) {
    query += ' AND p.client_id = ?'
    params.push(clientId)
  }

  if (activeOnly) {
    query += ' AND p.active = 1'
  }

  query += ' ORDER BY c.name, p.name'

  const stmt = c.env.DB.prepare(query)
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all()

  return c.json(result.results)
})

// POST /api/projects - Create a project
app.post('/', async (c) => {
  const body = await c.req.json<Partial<Project>>()

  if (!body.name || !body.client_id) {
    return c.json({ error: 'Name and client_id are required' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO projects (client_id, name, rate)
     VALUES (?, ?, ?)
     RETURNING *`
  ).bind(body.client_id, body.name, body.rate ?? null).first<Project>()

  return c.json(result, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
