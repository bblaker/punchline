const API_BASE = '/api'

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Clients
  clients: {
    list: (params?: { archived?: boolean }) =>
      request<Client[]>(`/clients${params?.archived ? '?archived=true' : ''}`),
    get: (id: number) => request<Client>(`/clients/${id}`),
    create: (data: Partial<Client>) =>
      request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Client>) =>
      request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number, hard = false) =>
      request(`/clients/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }),
  },

  // Projects
  projects: {
    list: (params?: { client_id?: number; active?: boolean }) => {
      const qs = new URLSearchParams()
      if (params?.client_id) qs.set('client_id', String(params.client_id))
      if (params?.active !== undefined) qs.set('active', String(params.active))
      return request<ProjectWithClient[]>(`/projects${qs.toString() ? `?${qs}` : ''}`)
    },
    get: (id: number) => request<ProjectWithClient>(`/projects/${id}`),
    create: (data: Partial<Project>) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Project>) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/projects/${id}`, { method: 'DELETE' }),
  },

  // Time entries
  timeEntries: {
    list: (params?: {
      project_id?: number
      client_id?: number
      start_date?: string
      end_date?: string
      unbilled?: boolean
      limit?: number
      offset?: number
    }) => {
      const qs = new URLSearchParams()
      if (params?.project_id) qs.set('project_id', String(params.project_id))
      if (params?.client_id) qs.set('client_id', String(params.client_id))
      if (params?.start_date) qs.set('start_date', params.start_date)
      if (params?.end_date) qs.set('end_date', params.end_date)
      if (params?.unbilled) qs.set('unbilled', 'true')
      if (params?.limit) qs.set('limit', String(params.limit))
      if (params?.offset) qs.set('offset', String(params.offset))
      return request<TimeEntryWithDetails[]>(`/time-entries${qs.toString() ? `?${qs}` : ''}`)
    },
    get: (id: number) => request<TimeEntryWithDetails>(`/time-entries/${id}`),
    create: (data: Partial<TimeEntry>) =>
      request<TimeEntry>('/time-entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TimeEntry>) =>
      request<TimeEntry>(`/time-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/time-entries/${id}`, { method: 'DELETE' }),
  },

  // Invoices
  invoices: {
    list: (params?: { client_id?: number; status?: string }) => {
      const qs = new URLSearchParams()
      if (params?.client_id) qs.set('client_id', String(params.client_id))
      if (params?.status) qs.set('status', params.status)
      return request<InvoiceWithClient[]>(`/invoices${qs.toString() ? `?${qs}` : ''}`)
    },
    get: (id: number) => request<InvoiceWithDetails>(`/invoices/${id}`),
    create: (data: Partial<Invoice> & { time_entry_ids?: number[] }) =>
      request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Invoice>) =>
      request<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/invoices/${id}`, { method: 'DELETE' }),
    send: (id: number) =>
      request<Invoice>(`/invoices/${id}/send`, { method: 'POST' }),
    void: (id: number) =>
      request<Invoice>(`/invoices/${id}/void`, { method: 'POST' }),
  },

  // Payments
  payments: {
    create: (invoiceId: number, data: Partial<Payment>) =>
      request<Payment>(`/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request(`/payments/${id}`, { method: 'DELETE' }),
  },

  // Dashboard
  dashboard: {
    get: () => request<DashboardData>('/dashboard'),
  },

  // Settings
  settings: {
    get: () => request<Settings>('/settings'),
    update: (data: Partial<Settings>) =>
      request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
}

// Types
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

export interface ProjectWithClient extends Project {
  client_name: string
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

export interface TimeEntryWithDetails extends TimeEntry {
  project_name: string
  client_name: string
  effective_rate: number
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

export interface InvoiceWithClient extends Invoice {
  client_name: string
  paid_amount: number
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
}

export interface InvoiceWithDetails extends Invoice {
  client_name: string
  client_email: string | null
  client_address: string | null
  line_items: InvoiceLineItem[]
  payments: Payment[]
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

export interface DashboardData {
  unbilled_hours: number
  outstanding: { count: number; total: number }
  overdue: { count: number; total: number }
  this_month: { billable_value: number; payments_received: number }
  recent_entries: TimeEntryWithDetails[]
  recent_invoices: InvoiceWithClient[]
}

export interface Settings {
  id: number
  business_name: string | null
  business_email: string | null
  business_address: string | null
  payment_instructions: string | null
  invoice_notes: string | null
  invoice_prefix: string | null
  updated_at: string
}
