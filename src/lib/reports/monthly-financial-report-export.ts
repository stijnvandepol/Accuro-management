import type { MonthlyFinancialReport } from "@/lib/reports/monthly-financial-report";
import {
  buildInvoiceLines,
  buildSimplePdf,
  buildVatBreakdownLines,
  escapeCsvValue,
  formatCsvNumber,
  formatPdfDate,
  formatPdfMoney,
  formatVatRate,
  getCompanyLine,
} from "@/lib/reports/financial-report-export-shared";

export function buildMonthlyFinancialReportCsv(report: MonthlyFinancialReport) {
  const lines = [
    ["Jaar", String(report.year)],
    ["Maand", report.month_label_long],
    ["Alleen betaald", "Ja"],
    ["Periodebasis", "Betaaldatum"],
    ["Gegenereerd op", report.generated_at],
    [],
    ["BTW-tarief", "Aantal facturen", "Omzet ex BTW", "BTW", "Omzet incl BTW"],
    ...report.vat_breakdown.map((entry) => [
      `${formatVatRate(entry.vat_rate)}%`,
      String(entry.invoice_count),
      formatCsvNumber(entry.total_ex_vat),
      formatCsvNumber(entry.total_vat),
      formatCsvNumber(entry.total_inc_vat),
    ]),
    [],
    [
      "Totaal",
      String(report.invoice_count),
      formatCsvNumber(report.total_ex_vat),
      formatCsvNumber(report.total_vat),
      formatCsvNumber(report.total_inc_vat),
    ],
    [],
    [
      "Factuurnummer",
      "Klant",
      "Project",
      "Factuurdatum",
      "Betaaldatum",
      "Ex BTW",
      "BTW %",
      "BTW",
      "Incl BTW",
      "Omschrijving",
    ],
    ...report.invoices.map((invoice) => [
      invoice.invoice_number,
      invoice.client_name,
      invoice.project_name ?? "",
      invoice.issue_date,
      invoice.paid_at ?? "",
      formatCsvNumber(invoice.subtotal),
      formatVatRate(invoice.vat_rate),
      formatCsvNumber(invoice.vat_amount),
      formatCsvNumber(invoice.total_amount),
      invoice.description,
    ]),
  ];

  return `${lines.map((line) => line.map(escapeCsvValue).join(";")).join("\n")}\n`;
}

export async function buildMonthlyFinancialReportPdf(report: MonthlyFinancialReport) {
  const companyLine = await getCompanyLine();
  const lines = [
    `Maandoverzicht ${report.month_label_long} ${report.year}`,
    companyLine,
    `Gegenereerd op: ${formatPdfDate(report.generated_at)}`,
    "Filter: alleen betaalde facturen",
    "Periodebasis: betaaldatum",
    "",
    `Aantal facturen: ${report.invoice_count}`,
    `Omzet ex BTW: ${formatPdfMoney(report.total_ex_vat)}`,
    `BTW: ${formatPdfMoney(report.total_vat)}`,
    `Omzet incl BTW: ${formatPdfMoney(report.total_inc_vat)}`,
    "",
    ...buildVatBreakdownLines(report.vat_breakdown),
    "",
    ...buildInvoiceLines(report.invoices),
  ].filter((line): line is string => typeof line === "string");

  return buildSimplePdf(lines);
}
