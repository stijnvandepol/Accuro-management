import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { SendMonthlyReportButton } from "@/components/finance/send-monthly-report-button";
import type { MonthlyFinancialReport } from "@/lib/reports/monthly-financial-report";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  report: MonthlyFinancialReport;
  availableYears: number[];
  selectedYear: number;
  selectedMonth: number;
  activeStatus?: string;
  n8nEnabled: boolean;
}

const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maart" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Augustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function MonthlyReportCard({
  report,
  availableYears,
  selectedYear,
  selectedMonth,
  activeStatus,
  n8nEnabled,
}: Props) {
  const reportQuery = new URLSearchParams({
    year: String(selectedYear),
    month: String(selectedMonth),
  });

  return (
    <div className="card">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Maandoverzicht</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Overzicht van ontvangen betalingen op basis van betaalde facturen en betaaldatum.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SendMonthlyReportButton
              year={selectedYear}
              month={selectedMonth}
              n8nEnabled={n8nEnabled}
            />
            <a
              href={`/reports/monthly?${reportQuery.toString()}&format=csv`}
              className="btn-secondary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download CSV
            </a>
            <a
              href={`/reports/monthly?${reportQuery.toString()}&format=pdf`}
              className="btn-secondary"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-100 px-5 py-4">
        <form method="GET" className="flex flex-wrap items-end gap-4">
          {activeStatus ? <input type="hidden" name="status" value={activeStatus} /> : null}
          <div>
            <label htmlFor="report-month-year" className="form-label">
              Jaar
            </label>
            <select
              id="report-month-year"
              name="reportYear"
              defaultValue={String(selectedYear)}
              className="form-select min-w-36"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-month" className="form-label">
              Maand
            </label>
            <select
              id="report-month"
              name="reportMonth"
              defaultValue={String(selectedMonth)}
              className="form-select min-w-40"
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary">
            <FileText className="h-4 w-4" />
            Genereer
          </button>

          <a
            href={`/reports/monthly?${reportQuery.toString()}`}
            className="text-sm text-blue-600 hover:underline"
          >
            <span className="inline-flex items-center gap-1">
              <FileJson className="h-4 w-4" />
              JSON API
            </span>
          </a>
        </form>
      </div>

      <div className="grid grid-cols-4 gap-4 p-5">
        <Metric label="Ontvangen ex BTW" value={formatCurrency(report.total_ex_vat)} />
        <Metric label="BTW" value={formatCurrency(report.total_vat)} />
        <Metric label="Ontvangen incl BTW" value={formatCurrency(report.total_inc_vat)} />
        <Metric label="Aantal facturen" value={String(report.invoice_count)} />
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">BTW-uitsplitsing</h3>
          <p className="text-xs text-gray-400">Filter: alleen betaald op betaaldatum</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">BTW-tarief</th>
                <th className="px-4 py-3 font-medium text-gray-600">Aantal</th>
                <th className="px-4 py-3 font-medium text-gray-600">Ex BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">Incl BTW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.vat_breakdown.map((entry) => (
                <tr key={entry.vat_rate} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.vat_rate}%</td>
                  <td className="px-4 py-3 text-gray-600">{entry.invoice_count}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(entry.total_ex_vat)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(entry.total_vat)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(entry.total_inc_vat)}</td>
                </tr>
              ))}
              {report.vat_breakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Geen betaalde facturen in deze periode.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Factuurdetails</h3>
          <p className="text-xs text-gray-400">
            Voor boekhouding en belastingaangifte op basis van ontvangen betalingen.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Factuur</th>
                <th className="px-4 py-3 font-medium text-gray-600">Klant</th>
                <th className="px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="px-4 py-3 font-medium text-gray-600">Betaaldatum</th>
                <th className="px-4 py-3 font-medium text-gray-600">Ex BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">Incl BTW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{invoice.client_name}</td>
                  <td className="px-4 py-3 text-gray-600">{invoice.project_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(invoice.paid_at ?? invoice.report_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.subtotal)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.vat_amount)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                </tr>
              ))}
              {report.invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Geen betaalde facturen in deze periode.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
