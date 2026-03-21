"use server";

import { createAuditLog } from "@/lib/audit";
import { getN8nMonthlyReportWebhookUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  buildBusinessProfilePayload,
  buildMonthlyReportDefaultsPayload,
} from "@/lib/n8n-payloads";
import {
  getMonthlyFinancialReport,
  type MonthlyFinancialReport,
  type MonthlyFinancialReportOptions,
  MonthlyFinancialReportError,
} from "@/lib/reports/monthly-financial-report";
import { getResolvedBusinessSettings } from "@/lib/settings";

type N8nMonthlyReportResponse = {
  ok?: boolean;
  driveUrl?: string;
};

export async function sendMonthlyFinancialReportToN8n(
  options: MonthlyFinancialReportOptions,
  actorUserId: string,
) {
  const webhookUrl = getN8nMonthlyReportWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false as const,
      error: "N8N_WEBHOOK_MONTHLY_REPORT_URL is niet ingesteld.",
    };
  }

  try {
    const [report, settings] = await Promise.all([
      getMonthlyFinancialReport(options),
      getResolvedBusinessSettings(),
    ]);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMonthlyReportPayload(report, settings)),
    });

    if (!res.ok) {
      return { success: false as const, error: `n8n webhook fout: ${res.status}` };
    }

    const response = await parseN8nResponse(res);

    await createAuditLog({
      actorUserId,
      entityType: "MonthlyFinancialReport",
      entityId: `${report.year}-${String(report.month).padStart(2, "0")}`,
      action: "GENERATE",
      metadata: {
        year: report.year,
        month: report.month,
        sentViaN8n: true,
        driveUrl: response?.driveUrl ?? null,
      },
    });

    return {
      success: true as const,
      driveUrl: response?.driveUrl ?? null,
    };
  } catch (error) {
    if (error instanceof MonthlyFinancialReportError) {
      return { success: false as const, error: error.message };
    }

    logger.error("sendMonthlyFinancialReportToN8n error:", error, {
      year: options.year,
      month: options.month,
    });

    return {
      success: false as const,
      error: "n8n webhook niet bereikbaar.",
    };
  }
}

function buildMonthlyReportPayload(
  report: MonthlyFinancialReport,
  settings: Awaited<ReturnType<typeof getResolvedBusinessSettings>>,
) {
  const month = String(report.month).padStart(2, "0");

  return {
    reportType: "MONTHLY_FINANCIAL_REPORT",
    year: report.year,
    month: report.month,
    monthLabel: report.month_label,
    monthLabelLong: report.month_label_long,
    paidOnly: true,
    dateBasis: report.date_basis,
    generatedAt: report.generated_at,
    period: {
      startDate: `${report.year}-${month}-01`,
      endDateExclusive:
        report.month === 12
          ? `${report.year + 1}-01-01`
          : `${report.year}-${String(report.month + 1).padStart(2, "0")}-01`,
    },
    invoiceCount: report.invoice_count,
    totalExVat: report.total_ex_vat,
    totalVat: report.total_vat,
    totalIncVat: report.total_inc_vat,
    vatBreakdown: report.vat_breakdown,
    invoices: report.invoices,
    from: buildBusinessProfilePayload(settings),
    defaults: buildMonthlyReportDefaultsPayload(settings),
  };
}

async function parseN8nResponse(res: Response): Promise<N8nMonthlyReportResponse | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await res.json()) as N8nMonthlyReportResponse;
  } catch {
    return null;
  }
}
