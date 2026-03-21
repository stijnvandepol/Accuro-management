"use server";

import { createAuditLog } from "@/lib/audit";
import { getN8nYearlyReportWebhookUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  buildBusinessProfilePayload,
  buildYearlyReportDefaultsPayload,
} from "@/lib/n8n-payloads";
import {
  getYearlyFinancialReport,
  type YearlyFinancialReport,
  type YearlyFinancialReportOptions,
  YearlyFinancialReportError,
} from "@/lib/reports/yearly-financial-report";
import { getResolvedBusinessSettings } from "@/lib/settings";

type N8nYearlyReportResponse = {
  ok?: boolean;
  driveUrl?: string;
};

export async function sendYearlyFinancialReportToN8n(
  options: YearlyFinancialReportOptions,
  actorUserId: string,
) {
  const webhookUrl = getN8nYearlyReportWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false as const,
      error: "N8N_WEBHOOK_YEARLY_REPORT_URL is niet ingesteld.",
    };
  }

  try {
    const [report, settings] = await Promise.all([
      getYearlyFinancialReport(options),
      getResolvedBusinessSettings(),
    ]);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildYearlyReportPayload(report, settings)),
    });

    if (!res.ok) {
      return { success: false as const, error: `n8n webhook fout: ${res.status}` };
    }

    const response = await parseN8nResponse(res);

    await createAuditLog({
      actorUserId,
      entityType: "YearlyFinancialReport",
      entityId: `${report.year}-${report.paid_only ? "paid-only" : "all-invoices"}`,
      action: "GENERATE",
      metadata: {
        year: report.year,
        includeUnpaid: Boolean(options.includeUnpaid),
        sentViaN8n: true,
        driveUrl: response?.driveUrl ?? null,
      },
    });

    return {
      success: true as const,
      driveUrl: response?.driveUrl ?? null,
    };
  } catch (error) {
    if (error instanceof YearlyFinancialReportError) {
      return { success: false as const, error: error.message };
    }

    logger.error("sendYearlyFinancialReportToN8n error:", error, {
      year: options.year,
      includeUnpaid: Boolean(options.includeUnpaid),
    });

    return {
      success: false as const,
      error: "n8n webhook niet bereikbaar.",
    };
  }
}

function buildYearlyReportPayload(
  report: YearlyFinancialReport,
  settings: Awaited<ReturnType<typeof getResolvedBusinessSettings>>,
) {
  return {
    reportType: "YEARLY_FINANCIAL_REPORT",
    year: report.year,
    paidOnly: report.paid_only,
    includeUnpaid: !report.paid_only,
    generatedAt: report.generated_at,
    period: {
      startDate: `${report.year}-01-01`,
      endDate: `${report.year}-12-31`,
    },
    invoiceCount: report.invoice_count,
    totalExVat: report.total_ex_vat,
    totalVat: report.total_vat,
    totalIncVat: report.total_inc_vat,
    monthlyBreakdown: report.monthly_breakdown,
    from: buildBusinessProfilePayload(settings),
    defaults: buildYearlyReportDefaultsPayload(settings),
  };
}

async function parseN8nResponse(res: Response): Promise<N8nYearlyReportResponse | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await res.json()) as N8nYearlyReportResponse;
  } catch {
    return null;
  }
}
