import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { YearlyFinancialReport } from "@/lib/reports/yearly-financial-report";
import { SendYearlyReportButton } from "@/components/finance/send-yearly-report-button";

interface Props {
  report: YearlyFinancialReport;
  availableYears: number[];
  selectedYear: number;
  includeUnpaid: boolean;
  activeStatus?: string;
  n8nEnabled: boolean;
}

export function YearlyReportCard({
  report,
  availableYears,
  selectedYear,
  includeUnpaid,
  activeStatus,
  n8nEnabled,
}: Props) {
  const reportQuery = new URLSearchParams({
    year: String(selectedYear),
  });

  if (includeUnpaid) {
    reportQuery.set("includeUnpaid", "true");
  }

  return (
    <div className="card">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Jaaropgave</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Genereer een jaaroverzicht op basis van bestaande facturen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SendYearlyReportButton
              year={selectedYear}
              includeUnpaid={includeUnpaid}
              n8nEnabled={n8nEnabled}
            />
            <a
              href={`/reports/yearly?${reportQuery.toString()}&format=csv`}
              className="btn-secondary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download CSV
            </a>
            <a
              href={`/reports/yearly?${reportQuery.toString()}&format=pdf`}
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
            <label htmlFor="report-year" className="form-label">
              Jaar
            </label>
            <select
              id="report-year"
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

          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="includeUnpaid"
              value="true"
              defaultChecked={includeUnpaid}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Neem ook onbetaalde facturen mee
          </label>

          <button type="submit" className="btn-primary">
            <FileText className="h-4 w-4" />
            Genereer
          </button>

          <a
            href={`/reports/yearly?${reportQuery.toString()}`}
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
        <Metric
          label="Omzet ex BTW"
          value={formatCurrency(report.total_ex_vat)}
        />
        <Metric
          label="BTW"
          value={formatCurrency(report.total_vat)}
        />
        <Metric
          label="Omzet incl BTW"
          value={formatCurrency(report.total_inc_vat)}
        />
        <Metric
          label="Aantal facturen"
          value={String(report.invoice_count)}
        />
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Maandelijkse uitsplitsing
          </h3>
          <p className="text-xs text-gray-400">
            Filter: {report.paid_only ? "alleen betaald" : "alle facturen"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Maand</th>
                <th className="px-4 py-3 font-medium text-gray-600">Aantal</th>
                <th className="px-4 py-3 font-medium text-gray-600">Ex BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">BTW</th>
                <th className="px-4 py-3 font-medium text-gray-600">Incl BTW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.monthly_breakdown.map((month) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium uppercase text-gray-900">
                    {month.label}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{month.invoice_count}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatCurrency(month.total_ex_vat)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatCurrency(month.total_vat)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatCurrency(month.total_inc_vat)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold text-gray-900">
                <td className="px-4 py-3">Totaal</td>
                <td className="px-4 py-3">{report.invoice_count}</td>
                <td className="px-4 py-3">{formatCurrency(report.total_ex_vat)}</td>
                <td className="px-4 py-3">{formatCurrency(report.total_vat)}</td>
                <td className="px-4 py-3">{formatCurrency(report.total_inc_vat)}</td>
              </tr>
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
