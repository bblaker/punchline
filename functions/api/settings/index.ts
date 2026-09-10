import { Hono } from 'hono'
import type { Env } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/settings')

interface Settings {
  id: number
  business_name: string | null
  business_email: string | null
  business_address: string | null
  payment_instructions: string | null
  invoice_notes: string | null
  invoice_prefix: string | null
  updated_at: string
}

// GET /api/settings - Get settings
app.get('/', async (c) => {
  // Ensure settings row exists
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO settings (id) VALUES (1)
  `).run()

  const settings = await c.env.DB.prepare(`
    SELECT * FROM settings WHERE id = 1
  `).first<Settings>()

  return c.json(settings)
})

// PUT /api/settings - Update settings
app.put('/', async (c) => {
  const body = await c.req.json<Partial<Settings>>()

  // Ensure settings row exists
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO settings (id) VALUES (1)
  `).run()

  await c.env.DB.prepare(`
    UPDATE settings SET
      business_name = COALESCE(?, business_name),
      business_email = COALESCE(?, business_email),
      business_address = COALESCE(?, business_address),
      payment_instructions = COALESCE(?, payment_instructions),
      invoice_notes = COALESCE(?, invoice_notes),
      invoice_prefix = COALESCE(?, invoice_prefix),
      updated_at = datetime('now')
    WHERE id = 1
  `).bind(
    body.business_name ?? null,
    body.business_email ?? null,
    body.business_address ?? null,
    body.payment_instructions ?? null,
    body.invoice_notes ?? null,
    body.invoice_prefix ?? null
  ).run()

  const settings = await c.env.DB.prepare(`
    SELECT * FROM settings WHERE id = 1
  `).first<Settings>()

  return c.json(settings)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
