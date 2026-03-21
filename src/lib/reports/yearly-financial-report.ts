import {
  FinancialReportError,
  getAvailablePaidInvoiceYears,
  getCurrentReportYear,
  getFinancialReportData,
  isValidReportYear,
  normalizeReportYear,
  type MonthlyBreakdownItem,
  type ReportInvoiceItem,
  type VatBreakdownItem,
} from "@/lib/reports/financial-report-shared";

export interface YearlyFinancialReportOptions {
  year: number;
  includeUnpaid?: boolean;
}

export interface YearlyFinancialReport {
  year: number;
  paid_only: boolean;
  date_basis: "paidAt" | "issueDate";
  generated_at: string;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  invoice_count: number;
  monthly_breakdown: MonthlyBreakdownItem[];
  vat_breakdown: VatBreakdownItem[];
  invoices: ReportInvoiceItem[];
}

export class YearlyFinancialReportError extends FinancialReportError {
  constructor(message: string) {
    super(message);
    this.name = "YearlyFinancialReportError";
  }
}

export { getCurrentReportYear, isValidReportYear, normalizeReportYear };

export async function getAvailableYearlyReportYears() {
  return getAvailablePaidInvoiceYears();
}

export async function getYearlyFinancialReport(
  options: YearlyFinancialReportOptions,
): Promise<YearlyFinancialReport> {
  if (!isValidReportYear(options.year)) {
    throw new YearlyFinancialReportError("Ongeldig jaar opgegeven.");
  }

  const startDate = new Date(Date.UTC(options.year, 0, 1));
  const endDate = new Date(Date.UTC(options.year + 1, 0, 1));
  const data = await getFinancialReportData({
    startDate,
    endDate,
    includeUnpaid: options.includeUnpaid,
  });

  return {
    year: options.year,
    generated_at: new Date().toISOString(),
    ...data,
  };
}
