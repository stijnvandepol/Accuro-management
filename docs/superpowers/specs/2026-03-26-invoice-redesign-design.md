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

Replace the current template with the user-supplied layout, converted from JavaScript template literals to Jinja2. Key structural changes:

**Header (top row, full width):**
- Left: company name (large, bold) + website · email as subline
- Right: address / phone / IBAN / KVK / BTW as a two-column label-value grid

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
- Fallback: if no `line_items`, render single row from `invoice.description` + `invoice.subtotal`

**Bottom section (flex row):**
- Left: BTW summary table (BTW-percentage, Grondslag, BTW-bedrag)
  - Shows "Vrijgesteld" when vat_rate = 0
- Right: Totals table (Subtotaal, BTW %, Totaal te voldoen in bold with thick top border)

**Payment block:**
- Only rendered if IBAN is set
- "Betaal het bedrag voor de vervaldatum op **{IBAN}** t.n.v. **{account_holder}** o.v.v. factuurnummer **{nr}**."
- Optional notes block
- "Vragen? Neem contact op via **{email}**." (only if email set)

**Footer:**
- Left: company name · address
- Right: KVK: xxx · BTW: xxx

**Router change:** add `website_url` to `settings_data` dict in `download_invoice_pdf` endpoint.

### 2.2 `proposal.html` — Style Alignment

Keep existing proposal content (title, recipient, summary, scope, price box, notes, terms) but adopt the new invoice's visual style:

- Same header layout (brand left, info grid right)
- Same footer layout
- Same typography: Arial, 10.5px base, `#1a1a1a` body color
- Replace blue `#2563eb` accent with neutral `#111` (consistent with invoice)
- Keep `price-box` component but restyle to match (no blue background, use a clean bordered box)
- `@page` margin consistent with invoice

---

## 3. Backend — Schema & Router

### 3.1 `InvoiceCreate` schema changes

- `description` becomes optional (`str | None = None`)
- Add cross-field validator: raise `ValueError` if both `description` is empty/None AND `line_items` is empty
- `subtotal` remains in the schema (frontend sends calculated value) but the router **always recalculates** from line items when `line_items` is non-empty — frontend value is ignored

### 3.2 `create_invoice` router changes

- When `line_items` is non-empty: recalculate `subtotal = sum(item.quantity * item.unit_price)` server-side
- Existing `_calculate_vat` function handles vat_amount and total_amount from subtotal
- No database migration needed — `line_items` is already a JSON column; `description` column already allows Text

### 3.3 `update_invoice` router

- Apply same server-side subtotal recalculation when `line_items` is present in the update payload

---

## 4. Frontend — Invoice Form with Line Items

### 4.1 Form structure (`InvoicesView.vue`)

**Remove:** `subtotal` InputNumber field

**Add:** Line items section within the create dialog:
- A table with one row per line item
- Each row: omschrijving (text input), aantal (number, min 1), tarief (number, min 0), totaal (readonly, computed), delete button
- "+ Regel toevoegen" button below the table
- Form initializes with 1 empty row

**Live calculation (reactive):**
- Per row: `item.total = item.quantity × item.unit_price`
- Summary below table (readonly): Subtotaal, BTW (%), Totaal
- Recalculated on every input change via `computed`

**Payload on submit:**
- Send `line_items` array with description/quantity/unit_price/total per item
- Send calculated `subtotal` (backend ignores it but schema requires it; backend recalculates)
- Omit `description` field (or send empty string — backend validator accepts if line_items present)

### 4.2 State shape

```typescript
interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number  // computed: quantity × unit_price
}

const lineItems = ref<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
```

---

## 5. Frontend — Per-Field Validation

### 5.1 Approach

No external validation library. A `validate()` function populates an `errors` reactive object before the API call. Invalid fields display an error message below the input using a small red `<p>` element.

```typescript
const errors = ref<Record<string, string>>({})
```

### 5.2 Validated fields

| Field | Rule |
|---|---|
| `client_id` | Required — "Selecteer een klant" |
| `issue_date` | Required |
| `due_date` | Required; must be ≥ `issue_date` — "Vervaldatum moet na factuurdatum liggen" |
| `vat_rate` | 0–100 |
| `lineItems` | At least 1 row |
| `lineItems[i].description` | Not empty — "Omschrijving is verplicht" |
| `lineItems[i].quantity` | > 0 — "Aantal moet groter dan 0 zijn" |
| `lineItems[i].unit_price` | ≥ 0 — "Tarief mag niet negatief zijn" |

### 5.3 API error mapping

On a 422 response from FastAPI, map `detail[].loc` paths to field keys in `errors`. Show unmapped errors via the existing `showError` toast.

### 5.4 UX

- Errors appear only after first submit attempt (not on initial render)
- Errors clear per-field as the user corrects them (via `watch` or inline `@input` handler)
- Submit button is not disabled — errors show on click

---

## 6. Testing

The app runs in Docker. Testing approach:

- Start via `docker compose up` before running tests
- Backend: existing pytest setup in `backend/tests/` — add tests for:
  - Subtotal recalculation from line items
  - Validation: no description and no line items → 422
  - PDF generation with and without line items
- Frontend: manual smoke test via browser (no automated frontend tests currently in the project)

---

## 7. Implementation Order (Option B)

1. Replace `invoice.html` with new Jinja2 template + add `website_url` to router
2. Update `proposal.html` to match new style
3. Update backend schema + router (line items recalculation, optional description)
4. Update `InvoicesView.vue` — new line items form with live calculation
5. Add per-field validation to the form
6. Run docker compose + manual + automated tests
