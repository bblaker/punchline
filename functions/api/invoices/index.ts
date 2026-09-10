import { Hono } from 'hono'
import type { Env, Invoice } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/invoices')

// GET /api/invoices
app.get('/', async (c) => {
  const clientId = c.req.query('client_id')
  const status = c.req.query('status')

  let query = `
    SELECT i.*, c.name as client_name,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as paid_amount
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (clientId) {
    query += ' AND i.client_id = ?'
    params.push(clientId)
  }

  if (status) {
    query += ' AND i.status = ?'
    params.push(status)
  }

  query += ' ORDER BY i.issue_date DESC'

  const stmt = c.env.DB.prepare(query)
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all()

  return c.json(result.results)
})

// POST /api/invoices - Create invoice
app.post('/', async (c) => {
  const body = await c.req.json<Partial<Invoice> & { time_entry_ids?: number[] }>()

  if (!body.client_id) {
    return c.json({ error: 'client_id is required' }, 400)
  }

  // Generate invoice number
  const year = new Date().getFullYear()
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?`
  ).bind(`INV-${year}-%`).first<{ count: number }>()
  const nextNum = (countResult?.count ?? 0) + 1
  const invoiceNumber = `INV-${year}-${String(nextNum).padStart(3, '0')}`

  // Calculate subtotal from time entries if provided
  let subtotal = body.subtotal ?? 0
  if (body.time_entry_ids?.length) {
    const placeholders = body.time_entry_ids.map(() => '?').join(',')
    const entriesResult = await c.env.DB.prepare(
      `SELECT SUM(te.hours * COALESCE(p.rate, c.default_rate)) as total
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE te.id IN (${placeholders})`
    ).bind(...body.time_entry_ids).first<{ total: number }>()
    subtotal = entriesResult?.total ?? 0
  }

  const issueDate = body.issue_date ?? new Date().toISOString().split('T')[0]
  const dueDate = body.due_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const invoice = await c.env.DB.prepare(
    `INSERT INTO invoices (client_id, invoice_number, issue_date, due_date, subtotal, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(
    body.client_id,
    invoiceNumber,
    issueDate,
    dueDate,
    subtotal,
    body.notes ?? null
  ).first<Invoice>()

  // Link time entries to invoice and create line items
  if (body.time_entry_ids?.length && invoice) {
    const placeholders = body.time_entry_ids.map(() => '?').join(',')
    await c.env.DB.prepare(
      `UPDATE time_entries SET invoice_id = ? WHERE id IN (${placeholders})`
    ).bind(invoice.id, ...body.time_entry_ids).run()

    // Create line items from time entries
    const entries = await c.env.DB.prepare(
      `SELECT te.*, p.name as project_name, COALESCE(p.rate, c.default_rate) as rate
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE te.id IN (${placeholders})`
    ).bind(...body.time_entry_ids).all()

    let sortOrder = 0
    for (const entry of entries.results as Array<{ id: number; hours: number; description: string | null; project_name: string; rate: number }>) {
      await c.env.DB.prepare(
        `INSERT INTO invoice_line_items (invoice_id, time_entry_id, description, quantity, rate, amount, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        invoice.id,
        entry.id,
        entry.description ?? entry.project_name,
        entry.hours,
        entry.rate,
        entry.hours * entry.rate,
        sortOrder++
      ).run()
    }
  }

  return c.json(invoice, 201)
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
