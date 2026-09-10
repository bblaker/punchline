-- Punchline Database Schema
-- Cloudflare D1 (SQLite)

-- Settings (single row for business info)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT,
  business_email TEXT,
  business_address TEXT,
  payment_instructions TEXT,
  invoice_notes TEXT,
  invoice_prefix TEXT DEFAULT 'INV-',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default settings row
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  default_rate REAL NOT NULL DEFAULT 0,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_clients_archived ON clients(archived);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate REAL, -- NULL = use client default_rate
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_active ON projects(active);

-- Billing Periods
CREATE TABLE IF NOT EXISTS billing_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_billing_periods_dates ON billing_periods(start_date, end_date);

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  description TEXT,
  billable INTEGER NOT NULL DEFAULT 1,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_invoice ON time_entries(invoice_id);
CREATE INDEX idx_time_entries_unbilled ON time_entries(billable, invoice_id) WHERE billable = 1 AND invoice_id IS NULL;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  subtotal REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  time_entry_id INTEGER REFERENCES time_entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(date);

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_clients_timestamp AFTER UPDATE ON clients
BEGIN
  UPDATE clients SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_projects_timestamp AFTER UPDATE ON projects
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_time_entries_timestamp AFTER UPDATE ON time_entries
BEGIN
  UPDATE time_entries SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_invoices_timestamp AFTER UPDATE ON invoices
BEGIN
  UPDATE invoices SET updated_at = datetime('now') WHERE id = NEW.id;
END;
