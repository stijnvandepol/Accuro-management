import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const MONTH_LABELS = [
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

export interface YearlyFinancialReportOptions {
  year: number;
  includeUnpaid?: boolean;
}

export interface MonthlyBreakdownItem {
  month: number;
  label: string;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
}

export interface YearlyFinancialReport {
  year: number;
  paid_only: boolean;
  generated_at: string;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
  monthly_breakdown: MonthlyBreakdownItem[];
}

export class YearlyFinancialReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YearlyFinancialReportError";
  }
}

export function getCurrentReportYear() {
  return new Date().getFullYear();
}

export function isValidReportYear(year: number) {
  return Number.isInteger(year) && year >= MIN_REPORT_YEAR && year <= getCurrentReportYear() + 1;
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

export async function getAvailableYearlyReportYears() {
  const range = await prisma.invoice.aggregate({
    _min: { issueDate: true },
    _max: { issueDate: true },
  });

  const currentYear = getCurrentReportYear();
  const minYear = range._min.issueDate?.getFullYear() ?? currentYear;
  const maxYear = Math.max(range._max.issueDate?.getFullYear() ?? currentYear, currentYear);
  const years: number[] = [];

  for (let year = maxYear; year >= minYear; year -= 1) {
    years.push(year);
  }

  return years.length > 0 ? years : [currentYear];
}

export async function getYearlyFinancialReport(
  options: YearlyFinancialReportOptions,
): Promise<YearlyFinancialReport> {
  if (!isValidReportYear(options.year)) {
    throw new YearlyFinancialReportError("Ongeldig jaar opgegeven.");
  }

  const startDate = new Date(Date.UTC(options.year, 0, 1));
  const endDate = new Date(Date.UTC(options.year + 1, 0, 1));
  const paidOnly = !options.includeUnpaid;

  const where = {
    issueDate: {
      gte: startDate,
      lt: endDate,
    },
    ...(paidOnly ? { status: InvoiceStatus.PAID } : {}),
  };

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
      orderBy: { issueDate: "asc" },
      select: {
        issueDate: true,
        subtotal: true,
        vatAmount: true,
        totalAmount: true,
      },
    }),
  ]);

  const monthlyBreakdown = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    total_ex_vat: 0,
    total_vat: 0,
    total_inc_vat: 0,
    invoice_count: 0,
  }));

  for (const invoice of invoices) {
    const monthIndex = invoice.issueDate.getUTCMonth();
    const entry = monthlyBreakdown[monthIndex];

    entry.total_ex_vat += Number(invoice.subtotal);
    entry.total_vat += Number(invoice.vatAmount);
    entry.total_inc_vat += Number(invoice.totalAmount);
    entry.invoice_count += 1;
  }

  return {
    year: options.year,
    paid_only: paidOnly,
    generated_at: new Date().toISOString(),
    total_ex_vat: Number(aggregate._sum.subtotal ?? 0),
    total_vat: Number(aggregate._sum.vatAmount ?? 0),
    total_inc_vat: Number(aggregate._sum.totalAmount ?? 0),
    invoice_count: aggregate._count._all,
    monthly_breakdown: monthlyBreakdown,
  };
}
