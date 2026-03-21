import { InvoiceStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const MONTH_LABELS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

const MIN_REPORT_YEAR = 2000;

const REPORT_INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  serviceDate: true,
  paidAt: true,
  subtotal: true,
  vatRate: true,
  vatAmount: true,
  totalAmount: true,
  description: true,
  client: {
    select: {
      id: true,
      companyName: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.InvoiceSelect;

type ReportInvoiceRow = Prisma.InvoiceGetPayload<{
  select: typeof REPORT_INVOICE_SELECT;
}>;

export interface ReportInvoiceItem {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  issue_date: string;
  due_date: string;
  service_date: string | null;
  paid_at: string | null;
  report_date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  description: string;
}

export interface MonthlyBreakdownItem {
  month: number;
  label: string;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
}

export interface VatBreakdownItem {
  vat_rate: number;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
}

export interface FinancialReportData {
  paid_only: boolean;
  date_basis: "paidAt" | "issueDate";
  invoice_count: number;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  monthly_breakdown: MonthlyBreakdownItem[];
  vat_breakdown: VatBreakdownItem[];
  invoices: ReportInvoiceItem[];
}

interface FinancialReportDataOptions {
  startDate: Date;
  endDate: Date;
  includeUnpaid?: boolean;
}

export class FinancialReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialReportError";
  }
}

export function getCurrentReportYear() {
  return new Date().getFullYear();
}

export function getCurrentReportMonth() {
  return new Date().getMonth() + 1;
}

export function isValidReportYear(year: number) {
  return Number.isInteger(year) && year >= MIN_REPORT_YEAR && year <= getCurrentReportYear() + 1;
}

export function isValidReportMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

export function normalizeReportYear(input?: string | number | null) {
  const parsed =
    typeof input === "number"
      ? input
      : typeof input === "string"
        ? Number.parseInt(input, 10)
        : Number.NaN;

  return isValidReportYear(parsed) ? parsed : getCurrentReportYear();
}

export function normalizeReportMonth(input?: string | number | null) {
  const parsed =
    typeof input === "number"
      ? input
      : typeof input === "string"
        ? Number.parseInt(input, 10)
        : Number.NaN;

  return isValidReportMonth(parsed) ? parsed : getCurrentReportMonth();
}

export function getMonthLabel(month: number) {
  return MONTH_LABELS[month - 1] ?? String(month);
}

export function getMonthLongLabel(month: number) {
  return new Intl.DateTimeFormat("nl-NL", { month: "long" }).format(
    new Date(Date.UTC(2024, month - 1, 1)),
  );
}

export async function getAvailablePaidInvoiceYears() {
  const range = await prisma.invoice.aggregate({
    where: {
      status: InvoiceStatus.PAID,
      paidAt: { not: null },
    },
    _min: { paidAt: true },
    _max: { paidAt: true },
  });

  const currentYear = getCurrentReportYear();
  const minYear = range._min.paidAt?.getUTCFullYear() ?? currentYear;
  const maxYear = Math.max(range._max.paidAt?.getUTCFullYear() ?? currentYear, currentYear);
  const years: number[] = [];

  for (let year = maxYear; year >= minYear; year -= 1) {
    years.push(year);
  }

  return years.length > 0 ? years : [currentYear];
}

export async function getFinancialReportData(
  options: FinancialReportDataOptions,
): Promise<FinancialReportData> {
  const paidOnly = !options.includeUnpaid;
  const where = buildFinancialReportWhere(options.startDate, options.endDate, paidOnly);

  const [aggregate, invoices] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _sum: {
        subtotal: true,
        vatAmount: true,
        totalAmount: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.invoice.findMany({
      where,
      orderBy: paidOnly ? [{ paidAt: "asc" }, { invoiceNumber: "asc" }] : [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
      select: REPORT_INVOICE_SELECT,
    }),
  ]);

  const invoiceItems = invoices.map((invoice) => mapReportInvoice(invoice, paidOnly));

  return {
    paid_only: paidOnly,
    date_basis: paidOnly ? "paidAt" : "issueDate",
    invoice_count: aggregate._count._all,
    total_ex_vat: Number(aggregate._sum.subtotal ?? 0),
    total_vat: Number(aggregate._sum.vatAmount ?? 0),
    total_inc_vat: Number(aggregate._sum.totalAmount ?? 0),
    monthly_breakdown: buildMonthlyBreakdown(invoiceItems),
    vat_breakdown: buildVatBreakdown(invoiceItems),
    invoices: invoiceItems,
  };
}

function buildFinancialReportWhere(
  startDate: Date,
  endDate: Date,
  paidOnly: boolean,
): Prisma.InvoiceWhereInput {
  if (paidOnly) {
    return {
      status: InvoiceStatus.PAID,
      paidAt: {
        gte: startDate,
        lt: endDate,
      },
    };
  }

  return {
    issueDate: {
      gte: startDate,
      lt: endDate,
    },
  };
}

function mapReportInvoice(invoice: ReportInvoiceRow, paidOnly: boolean): ReportInvoiceItem {
  const reportDate = paidOnly ? invoice.paidAt ?? invoice.issueDate : invoice.issueDate;

  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    client_id: invoice.client.id,
    client_name: invoice.client.companyName,
    project_id: invoice.project?.id ?? null,
    project_name: invoice.project?.name ?? null,
    issue_date: invoice.issueDate.toISOString(),
    due_date: invoice.dueDate.toISOString(),
    service_date: invoice.serviceDate?.toISOString() ?? null,
    paid_at: invoice.paidAt?.toISOString() ?? null,
    report_date: reportDate.toISOString(),
    subtotal: Number(invoice.subtotal),
    vat_rate: Number(invoice.vatRate),
    vat_amount: Number(invoice.vatAmount),
    total_amount: Number(invoice.totalAmount),
    description: invoice.description,
  };
}

function buildMonthlyBreakdown(invoices: ReportInvoiceItem[]): MonthlyBreakdownItem[] {
  const breakdown = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    total_ex_vat: 0,
    total_vat: 0,
    total_inc_vat: 0,
    invoice_count: 0,
  }));

  for (const invoice of invoices) {
    const monthIndex = new Date(invoice.report_date).getUTCMonth();
    const entry = breakdown[monthIndex];

    entry.total_ex_vat += invoice.subtotal;
    entry.total_vat += invoice.vat_amount;
    entry.total_inc_vat += invoice.total_amount;
    entry.invoice_count += 1;
  }

  return breakdown;
}

function buildVatBreakdown(invoices: ReportInvoiceItem[]): VatBreakdownItem[] {
  const vatMap = new Map<number, VatBreakdownItem>();

  for (const invoice of invoices) {
    const current = vatMap.get(invoice.vat_rate) ?? {
      vat_rate: invoice.vat_rate,
      total_ex_vat: 0,
      total_vat: 0,
      total_inc_vat: 0,
      invoice_count: 0,
    };

    current.total_ex_vat += invoice.subtotal;
    current.total_vat += invoice.vat_amount;
    current.total_inc_vat += invoice.total_amount;
    current.invoice_count += 1;

    vatMap.set(invoice.vat_rate, current);
  }

  return Array.from(vatMap.values()).sort((a, b) => a.vat_rate - b.vat_rate);
}
