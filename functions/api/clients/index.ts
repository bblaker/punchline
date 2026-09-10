import { Hono } from 'hono'
import type { Env, Client } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/clients')

// GET /api/clients - List all clients
app.get('/', async (c) => {
  const includeArchived = c.req.query('archived') === 'true'
  const query = includeArchived
    ? 'SELECT * FROM clients ORDER BY name'
    : 'SELECT * FROM clients WHERE archived = 0 ORDER BY name'

  const result = await c.env.DB.prepare(query).all<Client>()
  return c.json(result.results)
})

// POST /api/clients - Create a client
app.post('/', async (c) => {
  const body = await c.req.json<Partial<Client>>()

  if (!body.name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO clients (name, email, address, default_rate, notes)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(
    body.name,
    body.email ?? null,
    body.address ?? null,
    body.default_rate ?? 0,
    body.notes ?? null
  ).first<Client>()

  return c.json(result, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
