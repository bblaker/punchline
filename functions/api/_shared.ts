import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
}

export interface Client {
  id: number
  name: string
  email: string | null
  address: string | null
  default_rate: number
  notes: string | null
  archived: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  client_id: number
  name: string
  rate: number | null
  active: number
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: number
  project_id: number
  date: string
  hours: number
  description: string | null
  billable: number
  invoice_id: number | null
  created_at: string
  updated_at: string
}

export interface BillingPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  closed_at: string | null
  created_at: string
}

export interface Invoice {
  id: number
  client_id: number
  invoice_number: string
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'void'
  subtotal: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  id: number
  invoice_id: number
  time_entry_id: number | null
  description: string
  quantity: number
  rate: number
  amount: number
  sort_order: number
  created_at: string
}

export interface Payment {
  id: number
  invoice_id: number
  date: string
  amount: number
  method: string | null
  reference: string | null
  notes: string | null
  created_at: string
}
