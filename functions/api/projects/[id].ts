import { Hono } from 'hono'
import type { Env, Project } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/projects/:id')

// GET /api/projects/:id
app.get('/', async (c) => {
  const id = c.req.param('id')
  const project = await c.env.DB.prepare(
    `SELECT p.*, c.name as client_name
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     WHERE p.id = ?`
  ).bind(id).first()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  return c.json(project)
})

// PUT /api/projects/:id
app.put('/', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<Project>>()

  const result = await c.env.DB.prepare(
    `UPDATE projects SET
       name = COALESCE(?, name),
       rate = COALESCE(?, rate),
       active = COALESCE(?, active)
     WHERE id = ?
     RETURNING *`
  ).bind(
    body.name ?? null,
    body.rate ?? null,
    body.active ?? null,
    id
  ).first<Project>()

  if (!result) {
    return c.json({ error: 'Project not found' }, 404)
  }

  return c.json(result)
})

// DELETE /api/projects/:id
app.delete('/', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    'UPDATE projects SET active = 0 WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Project not found' }, 404)
  }

  return c.json({ success: true })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
