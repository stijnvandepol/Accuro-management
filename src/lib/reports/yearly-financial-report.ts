import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getResolvedBusinessSettings } from "@/lib/settings";

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

export function buildYearlyFinancialReportCsv(report: YearlyFinancialReport) {
  const lines = [
    ["Jaar", String(report.year)],
    ["Alleen betaald", report.paid_only ? "Ja" : "Nee"],
    ["Gegenereerd op", report.generated_at],
    [],
    ["Maand", "Aantal facturen", "Omzet ex BTW", "BTW", "Omzet incl BTW"],
    ...report.monthly_breakdown.map((month) => [
      month.label,
      String(month.invoice_count),
      formatCsvNumber(month.total_ex_vat),
      formatCsvNumber(month.total_vat),
      formatCsvNumber(month.total_inc_vat),
    ]),
    [],
    [
      "Totaal",
      String(report.invoice_count),
      formatCsvNumber(report.total_ex_vat),
      formatCsvNumber(report.total_vat),
      formatCsvNumber(report.total_inc_vat),
    ],
  ];

  return `${lines.map((line) => line.map(escapeCsvValue).join(";")).join("\n")}\n`;
}

export async function buildYearlyFinancialReportPdf(report: YearlyFinancialReport) {
  const settings = await getResolvedBusinessSettings();
  const lines = [
    `Jaaropgave ${report.year}`,
    settings.companyName ? `Bedrijf: ${settings.companyName}` : undefined,
    `Gegenereerd op: ${formatPdfDate(report.generated_at)}`,
    `Filter: ${report.paid_only ? "alleen betaalde facturen" : "alle facturen"}`,
    "",
    `Aantal facturen: ${report.invoice_count}`,
    `Omzet ex BTW: ${formatPdfMoney(report.total_ex_vat)}`,
    `BTW: ${formatPdfMoney(report.total_vat)}`,
    `Omzet incl BTW: ${formatPdfMoney(report.total_inc_vat)}`,
    "",
    "Maandelijkse uitsplitsing",
    ...report.monthly_breakdown.map(
      (month) =>
        `${month.label.toUpperCase()}  |  ${month.invoice_count} facturen  |  ex BTW ${formatPdfMoney(month.total_ex_vat)}  |  BTW ${formatPdfMoney(month.total_vat)}  |  incl ${formatPdfMoney(month.total_inc_vat)}`,
    ),
  ].filter((line): line is string => typeof line === "string");

  return buildSimplePdf(lines);
}

function formatCsvNumber(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeCsvValue(value: string) {
  if (value.includes(";") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function formatPdfMoney(value: number) {
  return `EUR ${new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatPdfDate(value: string) {
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildSimplePdf(lines: string[]) {
  const wrappedLines = lines.flatMap((line) => wrapPdfLine(line, 92));
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(${escapePdfText(wrappedLines[0] ?? "Jaaropgave")}) Tj`,
    "0 -28 Td",
    "/F1 11 Tf",
    ...wrappedLines.slice(1).flatMap((line) => [`(${escapePdfText(line)}) Tj`, "0 -16 Td"]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapPdfLine(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return [value];
  }

  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
