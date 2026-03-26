# Invoice & Proposal Redesign — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** PDF template overhaul, multi-line invoice support, frontend per-field validation

---

## 1. Overview

This spec covers four areas of the ticket-system:

1. Replace the `invoice.html` Jinja2 template with a cleaner, more professional design
2. Update `proposal.html` to share the same header/footer style as the new invoice
3. Extend the invoice creation form to support multiple line items with live price calculation
4. Add per-field validation to the invoice form

---

## 2. PDF Templates

### 2.1 `invoice.html` — Full Replacement

Replace the current template with the user-supplied layout, converted from JavaScript template literals to Jinja2.

**Jinja2 variable mapping:**

| Template variable | Source |
|---|---|
| `{{ settings.company_name }}` | `settings.company_name` |
| `{{ settings.website_url }}` | `settings.website_url` *(must be added to `settings_data` in router — see 3.6)* |
| `{{ settings.email }}` | `settings.email` |
| `{{ settings.address }}` | `settings.address` |
| `{{ settings.phone }}` | `settings.phone` |
| `{{ settings.iban }}` | `settings.iban` |
| `{{ settings.kvk_number }}` | `settings.kvk_number` |
| `{{ settings.vat_number }}` | `settings.vat_number` |
| `{{ settings.account_holder_name or settings.company_name }}` | account holder |
| `{{ client.company_name }}` | recipient name |
| `{{ client.contact_name }}` | T.a.v. line |
| `{{ client.address }}` | recipient address |
| `{{ client.email }}` | recipient email |
| `{{ invoice.invoice_number }}` | factuurnummer |
| `{{ invoice.issue_date\|date_nl }}` | factuurdatum |
| `{{ invoice.due_date\|date_nl }}` | vervaldatum |
| `{{ invoice.vat_rate }}` | BTW percentage |
| `{{ invoice.subtotal\|currency }}` | grondslag |
| `{{ invoice.vat_amount\|currency }}` | BTW bedrag |
| `{{ invoice.total_amount\|currency }}` | totaal |
| `{{ invoice.notes }}` | notities |

**Key structural changes:**

**Header (top row, full width):**
- Left: company name (large, bold) + `{{ settings.website_url }}` · `{{ settings.email }}` as subline (only rendered when at least one is set)
- Right: address / phone / IBAN / KVK / BTW as a two-column label-value grid (each row only rendered when value is set)

**Recipient block:**
- Company name (bold)
- `T.a.v. <contact>` line (muted, smaller) — only if contact name present
- Address, email

**Document title & meta:**
- `FACTUUR` as large bold title
- Meta grid: Factuurnummer, Factuurdatum, Vervaldatum
- Thin horizontal divider below meta

**Line items table:**
- Columns: Omschrijving | Aantal (r) | Tarief (r) | Bedrag excl. BTW (r)
- Header row: thick top + bottom border, uppercase 9px labels
- Body rows: thin bottom border per row
- Fallback: if `invoice.line_items` is empty, render single row from `invoice.description` + `invoice.subtotal` (backward compatibility for existing invoices)

**Bottom section (flex row):**
- Left: BTW summary table (BTW-percentage, Grondslag, BTW-bedrag)
  - Shows "Vrijgesteld" when `invoice.vat_rate == 0`
- Right: Totals table (Subtotaal, BTW %, Totaal te voldoen in bold with thick top border)

**Payment block:**
- Only rendered if `settings.iban` is set
- "Betaal het bedrag voor de vervaldatum op **{IBAN}** t.n.v. **{account_holder}** o.v.v. factuurnummer **{nr}**."
- Optional notes block (only if `invoice.notes`)
- "Vragen? Neem contact op via **{email}**." (only if `settings.email` set)

**Footer:**
- Left: `{{ settings.company_name }}` · `{{ settings.address }}`
- Right: KVK: xxx · BTW: xxx

### 2.2 `proposal.html` — Style Alignment

Keep existing proposal content (title, recipient, summary, scope, price box, notes, terms) but adopt the new invoice's visual style:

- Same header layout (brand left, info grid right), same Jinja2 variables as invoice header
- Same footer layout
- Same typography: Arial, 10.5px base, `#1a1a1a` body color
- Replace blue `#2563eb` accent with neutral `#111` (consistent with invoice)
- Keep `price-box` component but restyle to match (no blue background, use a clean bordered box)
- `@page` margin consistent with invoice

---

## 3. Backend — Schema & Router

### 3.1 `InvoiceCreate` schema changes

- `description` becomes `str | None = None`
- Remove the `desc_min` field validator (it applies to the `description` field and raises when empty — this conflicts with the new optional behaviour)
- Remove the `subtotal_positive` field validator (the frontend may send `0` as a placeholder when the backend will recalculate from line items; the cross-field validator below handles the real check)
- Add cross-field model validator (`@model_validator(mode='after')`): raise `ValueError("Geef een omschrijving of minimaal één regelitem op")` if both `description` is empty/None AND `line_items` is empty
- `subtotal` remains in the schema as `Decimal` with default `Decimal("0")` — the router ignores the frontend value and always recalculates when `line_items` is non-empty

### 3.2 `InvoiceUpdate` schema changes

- `description` stays `str | None = None` (no change needed — already optional)
- `subtotal` is removed from `InvoiceUpdate` — it must not be client-settable on update, for the same reason as on create: the backend is always the authority when `line_items` are present. Clients that need to change amounts must send updated `line_items`.

### 3.3 `InvoiceResponse` schema changes

- `description` changes from `str` to `str | None` to match the updated model nullability

### 3.4 Alembic migration

Add a new migration to make `description` nullable on the `invoices` table:

```sql
ALTER TABLE invoices ALTER COLUMN description DROP NOT NULL;
```

*(SQLite alternative: recreate table — Alembic handles this via `batch_alter_table`)*

### 3.5 `Invoice` model change

```python
description: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### 3.6 `create_invoice` router changes

When `line_items` is non-empty, the router must (in this order):

1. Recalculate each `item.total = item.quantity * item.unit_price` (overwrite the client-supplied value)
2. Compute `subtotal = sum(item.total for item in line_items)`
3. Assign the computed `subtotal` to a local variable — **this must happen before the `_calculate_vat` call**, which currently reads `body.subtotal` directly; the call must be updated to use the recalculated value instead
4. Call `_calculate_vat(subtotal, body.vat_rate)` to derive `vat_amount` and `total_amount`

Additionally: add `website_url` to `settings_data` dict: `"website_url": settings.website_url`

### 3.7 `update_invoice` router changes

When `line_items` is present and non-empty in the update payload, the router must:

1. Recalculate each `item.total = item.quantity * item.unit_price` (overwrite the client-supplied value)
2. Compute `new_subtotal = sum(item.total for item in line_items)`
3. Assign `invoice.subtotal = new_subtotal` explicitly — this must happen *before* calling `_calculate_vat`, which derives `vat_amount` and `total_amount` from `invoice.subtotal`
4. The existing `if "subtotal" in update_data` guard in the router does not apply here, since `subtotal` is removed from `InvoiceUpdate` (see 3.2) and will never appear in `update_data`

---

## 4. Frontend — Invoice Form with Line Items

### 4.1 Form structure (`InvoicesView.vue`)

**Remove:** `subtotal` InputNumber field

**Add:** Line items section within the create dialog:
- A table with one row per line item
- Each row: omschrijving (text input), aantal (number, min 1), tarief (number, min 0), totaal (readonly, computed), delete button
- "+ Regel toevoegen" button below the table
- Form initializes with 1 empty row
- Dialog width: increase from `560px` to `720px` to accommodate the 4-column table

**Live calculation (reactive):**
- Per row: `item.total = item.quantity × item.unit_price`
- Summary below table (readonly): Subtotaal, BTW (%), Totaal
- Recalculated on every input change via `computed`

**Payload on submit:**
- Send `line_items` array with description/quantity/unit_price/total per item
- Send `subtotal: 0` as placeholder (backend ignores and recalculates)
- Do not send `description` field (leave it out of the payload)

**Form reset:**
- When the dialog is closed (cancelled or successfully submitted), reset `lineItems` to `[{ description: '', quantity: 1, unit_price: 0, total: 0 }]` and clear all errors

### 4.2 State shape

```typescript
interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number  // computed: quantity × unit_price, recalculated client-side on input
}

const lineItems = ref<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
```

---

## 5. Frontend — Per-Field Validation

### 5.1 Approach

No external validation library. A `validate()` function populates an `errors` reactive object before the API call. Invalid fields display an error message below the input using a small red `<p class="text-xs text-red-500 mt-1">` element.

```typescript
const errors = ref<Record<string, string>>({})
```

### 5.2 Validated fields

| Field | Rule | Message |
|---|---|---|
| `client_id` | Required | "Selecteer een klant" |
| `issue_date` | Required | "Factuurdatum is verplicht" |
| `due_date` | Required; must be ≥ `issue_date` | "Vervaldatum moet na factuurdatum liggen" |
| `vat_rate` | 0–100 | "BTW-tarief moet tussen 0 en 100 liggen" |
| `lineItems` | At least 1 row | "Voeg minimaal één regel toe" |
| `lineItems[i].description` | Not empty | "Omschrijving is verplicht" |
| `lineItems[i].quantity` | > 0 | "Aantal moet groter dan 0 zijn" |
| `lineItems[i].unit_price` | ≥ 0 | "Tarief mag niet negatief zijn" |

### 5.3 API error mapping

On a 422 response from FastAPI, map `detail[].loc` paths to field keys in `errors`. Show unmapped errors via the existing `showError` toast.

### 5.4 UX

- Errors appear only after first submit attempt (not on initial render); tracked via `submitted = ref(false)` flag
- Errors clear per-field as the user corrects them (via inline `@input`/`@change` handler that deletes the key from `errors`)
- Submit button is not disabled — errors show on click

---

## 6. Testing

The app runs in Docker. Start with `docker compose up` before running tests.

**Backend — new tests to add in `backend/tests/`:**

| Test | Description |
|---|---|
| `test_create_invoice_with_line_items` | POST with line_items present → subtotal recalculated server-side, 201 |
| `test_create_invoice_line_items_recalculates_item_total` | Stored `item.total` must equal `quantity × unit_price`, not the client-supplied value |
| `test_create_invoice_no_description_no_items` | POST with no description and no line_items → 422 |
| `test_create_invoice_line_items_no_description` | POST with line_items present and no description → 201 (happy path) |
| `test_update_invoice_with_line_items` | PATCH with line_items → subtotal recalculated |
| `test_invoice_pdf_with_line_items` | GET `/invoices/{id}/pdf` → response is `application/pdf` (smoke test) |
| `test_invoice_pdf_without_line_items` | Existing invoice with only description → PDF renders fallback row |

**Frontend:** manual smoke test via browser — create a new invoice with 2+ line items, verify totals update live, verify PDF download shows new layout.

---

## 7. Implementation Order (Option B)

1. Alembic migration: make `description` nullable
2. Update `Invoice` model + `InvoiceResponse` schema
3. Replace `invoice.html` with new Jinja2 template; add `website_url` to `settings_data` in router
4. Update `proposal.html` to match new style
5. Update `InvoiceCreate` schema (optional description, remove validators, add model validator, default subtotal)
6. Update `create_invoice` and `update_invoice` routers (server-side recalculation)
7. Update `InvoicesView.vue` — new line items form with live calculation + form reset
8. Add per-field validation to the form
9. Write backend tests
10. `docker compose up` + manual browser test
