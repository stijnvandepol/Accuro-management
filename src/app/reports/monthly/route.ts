import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getMonthlyFinancialReport,
  isValidReportMonth,
  isValidReportYear,
  MonthlyFinancialReportError,
} from "@/lib/reports/monthly-financial-report";
import {
  buildMonthlyFinancialReportCsv,
  buildMonthlyFinancialReportPdf,
} from "@/lib/reports/monthly-financial-report-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportFormat = "json" | "csv" | "pdf";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Niet ingelogd" },
      { status: 401 },
    );
  }

  const year = Number.parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(request.nextUrl.searchParams.get("month") ?? "", 10);
  const format = normalizeFormat(request.nextUrl.searchParams.get("format"));

  if (!format) {
    return NextResponse.json(
      { success: false, error: "Ongeldig formaat. Gebruik json, csv of pdf." },
      { status: 400 },
    );
  }

  if (!isValidReportYear(year) || !isValidReportMonth(month)) {
    return NextResponse.json(
      { success: false, error: "Ongeldige periode. Gebruik YYYY en MM, bijvoorbeeld 2026 en 3." },
      { status: 400 },
    );
  }

  try {
    const report = await getMonthlyFinancialReport({ year, month });
    const monthPadded = String(month).padStart(2, "0");

    if (format === "csv") {
      const csv = buildMonthlyFinancialReportCsv(report);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="maandoverzicht-${year}-${monthPadded}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildMonthlyFinancialReportPdf(report);
      return new Response(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="maandoverzicht-${year}-${monthPadded}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof MonthlyFinancialReportError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    logger.error("Failed to generate monthly financial report", error, {
      actorUserId: session.user.id,
      year,
      month,
      format,
    });

    return NextResponse.json(
      { success: false, error: "Maandoverzicht genereren mislukt." },
      { status: 500 },
    );
  }
}

function normalizeFormat(value: string | null): ReportFormat | null {
  if (value === null || value === "json" || value === "") {
    return "json";
  }

  if (value === "csv" || value === "pdf") {
    return value;
  }

  return null;
}
