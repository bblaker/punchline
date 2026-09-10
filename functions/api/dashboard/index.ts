import { Hono } from 'hono'
import type { Env } from '../_shared'

const app = new Hono<{ Bindings: Env }>().basePath('/api/dashboard')

// GET /api/dashboard - Summary stats
app.get('/', async (c) => {
  // Unbilled hours
  const unbilledHours = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(hours), 0) as total
    FROM time_entries
    WHERE billable = 1 AND invoice_id IS NULL
  `).first<{ total: number }>()

  // Outstanding invoices (sent but not paid)
  const outstanding = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(subtotal), 0) as total
    FROM invoices
    WHERE status IN ('sent', 'draft')
  `).first<{ count: number; total: number }>()

  // Overdue invoices
  const overdue = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(subtotal), 0) as total
    FROM invoices
    WHERE status = 'sent' AND due_date < date('now')
  `).first<{ count: number; total: number }>()

  // This month's billable value
  const thisMonth = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(te.hours * COALESCE(p.rate, c.default_rate)), 0) as total
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE te.billable = 1
      AND te.date >= date('now', 'start of month')
  `).first<{ total: number }>()

  // Payments this month
  const paymentsThisMonth = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE date >= date('now', 'start of month')
  `).first<{ total: number }>()

  // Recent time entries
  const recentEntries = await c.env.DB.prepare(`
    SELECT te.*, p.name as project_name, c.name as client_name
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    ORDER BY te.date DESC, te.created_at DESC
    LIMIT 10
  `).all()

  // Recent invoices
  const recentInvoices = await c.env.DB.prepare(`
    SELECT i.*, c.name as client_name
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    ORDER BY i.created_at DESC
    LIMIT 5
  `).all()

  return c.json({
    unbilled_hours: unbilledHours?.total ?? 0,
    outstanding: {
      count: outstanding?.count ?? 0,
      total: outstanding?.total ?? 0,
    },
    overdue: {
      count: overdue?.count ?? 0,
      total: overdue?.total ?? 0,
    },
    this_month: {
      billable_value: thisMonth?.total ?? 0,
      payments_received: paymentsThisMonth?.total ?? 0,
    },
    recent_entries: recentEntries.results,
    recent_invoices: recentInvoices.results,
  })
})

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, { DB: context.env.DB })
