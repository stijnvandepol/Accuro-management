import {
  FinancialReportError,
  getCurrentReportMonth,
  getCurrentReportYear,
  getFinancialReportData,
  getMonthLabel,
  getMonthLongLabel,
  getAvailablePaidInvoiceYears,
  isValidReportMonth,
  isValidReportYear,
  normalizeReportMonth,
  normalizeReportYear,
  type ReportInvoiceItem,
  type VatBreakdownItem,
} from "@/lib/reports/financial-report-shared";

export interface MonthlyFinancialReportOptions {
  year: number;
  month: number;
}

export interface MonthlyFinancialReport {
  year: number;
  month: number;
  month_label: string;
  month_label_long: string;
  paid_only: true;
  date_basis: "paidAt";
  generated_at: string;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
  vat_breakdown: VatBreakdownItem[];
  invoices: ReportInvoiceItem[];
}

export class MonthlyFinancialReportError extends FinancialReportError {
  constructor(message: string) {
    super(message);
    this.name = "MonthlyFinancialReportError";
  }
}

export {
  getCurrentReportMonth,
  getCurrentReportYear,
  getAvailablePaidInvoiceYears as getAvailableMonthlyReportYears,
  isValidReportMonth,
  isValidReportYear,
  normalizeReportMonth,
  normalizeReportYear,
};

export async function getMonthlyFinancialReport(
  options: MonthlyFinancialReportOptions,
): Promise<MonthlyFinancialReport> {
  if (!isValidReportYear(options.year)) {
    throw new MonthlyFinancialReportError("Ongeldig jaar opgegeven.");
  }

  if (!isValidReportMonth(options.month)) {
    throw new MonthlyFinancialReportError("Ongeldige maand opgegeven.");
  }

  const startDate = new Date(Date.UTC(options.year, options.month - 1, 1));
  const endDate = new Date(Date.UTC(options.year, options.month, 1));
  const data = await getFinancialReportData({
    startDate,
    endDate,
  });

  return {
    year: options.year,
    month: options.month,
    month_label: getMonthLabel(options.month),
    month_label_long: getMonthLongLabel(options.month),
    generated_at: new Date().toISOString(),
    paid_only: true,
    date_basis: "paidAt",
    total_ex_vat: data.total_ex_vat,
    total_vat: data.total_vat,
    total_inc_vat: data.total_inc_vat,
    invoice_count: data.invoice_count,
    vat_breakdown: data.vat_breakdown,
    invoices: data.invoices,
  };
}
