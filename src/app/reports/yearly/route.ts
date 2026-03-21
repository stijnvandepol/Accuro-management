import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getYearlyFinancialReport,
  isValidReportYear,
  YearlyFinancialReportError,
} from "@/lib/reports/yearly-financial-report";
import {
  buildYearlyFinancialReportCsv,
  buildYearlyFinancialReportPdf,
} from "@/lib/reports/yearly-financial-report-export";

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
  const format = normalizeFormat(request.nextUrl.searchParams.get("format"));
  const includeUnpaid = request.nextUrl.searchParams.get("includeUnpaid") === "true";

  if (!format) {
    return NextResponse.json(
      { success: false, error: "Ongeldig formaat. Gebruik json, csv of pdf." },
      { status: 400 },
    );
  }

  if (!isValidReportYear(year)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig jaar. Gebruik YYYY, bijvoorbeeld 2025." },
      { status: 400 },
    );
  }

  try {
    const report = await getYearlyFinancialReport({
      year,
      includeUnpaid,
    });

    if (format === "csv") {
      const csv = buildYearlyFinancialReportCsv(report);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="jaaropgave-${year}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildYearlyFinancialReportPdf(report);
      return new Response(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="jaaropgave-${year}.pdf"`,
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
    if (error instanceof YearlyFinancialReportError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    logger.error("Failed to generate yearly financial report", error, {
      actorUserId: session.user.id,
      year,
      format,
    });

    return NextResponse.json(
      { success: false, error: "Jaaropgave genereren mislukt." },
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
