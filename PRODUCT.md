# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo freelancers and independent contractors tracking billable hours for a handful of clients. Primary use is at a desktop workstation during focused work sessions, with keyboard-heavy interaction.

## Product Purpose

Punchline lets freelancers track time, manage clients and projects, generate invoices, and record payments—all in one place. Success means getting paid accurately and on time with minimal administrative friction.

## Positioning

A self-hosted, single-user billable hours system that keeps your business data under your control on Cloudflare's edge infrastructure. No SaaS subscription, no data leaving your stack.

## Operating Context

- Quick time logging during or after work sessions
- Periodic invoice generation (weekly/monthly billing cycles)
- Client and project setup when onboarding new work
- Settings configuration for business info and payment details
- Payment recording when invoices are settled

## Capabilities and Constraints

**Capabilities:**
- Client management with contact info and default rates
- Project management with per-project rate overrides
- Time entry with date, hours, description, billable flag
- Invoice generation from unbilled time entries
- PDF invoice export with business info and payment instructions
- Payment recording with partial payment support
- Dashboard with unbilled hours, outstanding invoices, recent activity

**Constraints:**
- Single-user only (no auth/multi-tenancy)
- Cloudflare Pages + D1 deployment target
- Client-side PDF generation

## Evidence on Hand

- Functional codebase with complete CRUD for all entities
- Working invoice PDF generation
- Settings system for business info
- No real client data, testimonials, or case studies

## Product Principles

1. **Speed over ceremony** — Logging time should take seconds, not clicks through wizards.
2. **Clarity over cleverness** — Show the numbers that matter; hide the complexity of billing.
3. **Control over convenience** — Your data lives on your infrastructure.
4. **Professional output** — Invoices should look like they came from a real business.
5. **Get paid** — Everything serves the goal of accurate, timely invoicing.
