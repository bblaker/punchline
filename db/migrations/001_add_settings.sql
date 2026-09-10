-- Migration: Add settings table for business info
-- Run this on existing databases

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

INSERT OR IGNORE INTO settings (id) VALUES (1);
