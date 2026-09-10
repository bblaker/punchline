import { Hono } from 'hono'
import type { Env, Client } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/clients/:id')

// GET /api/clients/:id - Get a single client
app.get('/', async (c) => {
  const id = c.req.param('id')
  const client = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first<Client>()

  if (!client) {
    return c.json({ error: 'Client not found' }, 404)
  }

  return c.json(client)
})

// PUT /api/clients/:id - Update a client
app.put('/', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<Client>>()

  const existing = await c.env.DB.prepare(
    'SELECT id FROM clients WHERE id = ?'
  ).bind(id).first()

  if (!existing) {
    return c.json({ error: 'Client not found' }, 404)
  }

  const result = await c.env.DB.prepare(
    `UPDATE clients SET
       name = COALESCE(?, name),
       email = COALESCE(?, email),
       address = COALESCE(?, address),
       default_rate = COALESCE(?, default_rate),
       notes = COALESCE(?, notes),
       archived = COALESCE(?, archived)
     WHERE id = ?
     RETURNING *`
  ).bind(
    body.name ?? null,
    body.email ?? null,
    body.address ?? null,
    body.default_rate ?? null,
    body.notes ?? null,
    body.archived ?? null,
    id
  ).first<Client>()

  return c.json(result)
})

// DELETE /api/clients/:id - Delete a client (soft delete via archive)
app.delete('/', async (c) => {
  const id = c.req.param('id')
  const hardDelete = c.req.query('hard') === 'true'

  if (hardDelete) {
    const result = await c.env.DB.prepare(
      'DELETE FROM clients WHERE id = ?'
    ).bind(id).run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Client not found' }, 404)
    }
  } else {
    const result = await c.env.DB.prepare(
      'UPDATE clients SET archived = 1 WHERE id = ?'
    ).bind(id).run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Client not found' }, 404)
    }
  }

  return c.json({ success: true })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
