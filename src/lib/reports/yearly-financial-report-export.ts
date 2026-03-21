import { getResolvedBusinessSettings } from "@/lib/settings";
import type { YearlyFinancialReport } from "@/lib/reports/yearly-financial-report";

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
