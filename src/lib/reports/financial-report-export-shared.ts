import { getResolvedBusinessSettings } from "@/lib/settings";
import type { ReportInvoiceItem, VatBreakdownItem } from "@/lib/reports/financial-report-shared";

export function formatCsvNumber(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function escapeCsvValue(value: string) {
  if (value.includes(";") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

export function formatPdfMoney(value: number) {
  return `EUR ${new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function formatPdfDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatVatRate(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildVatBreakdownLines(vatBreakdown: VatBreakdownItem[]) {
  if (vatBreakdown.length === 0) {
    return ["BTW-uitsplitsing", "Geen betaalde facturen in deze periode."];
  }

  return [
    "BTW-uitsplitsing",
    ...vatBreakdown.map(
      (entry) =>
        `BTW ${formatVatRate(entry.vat_rate)}%  |  ${entry.invoice_count} facturen  |  ex BTW ${formatPdfMoney(entry.total_ex_vat)}  |  BTW ${formatPdfMoney(entry.total_vat)}  |  incl ${formatPdfMoney(entry.total_inc_vat)}`,
    ),
  ];
}

export function buildInvoiceLines(invoices: ReportInvoiceItem[]) {
  if (invoices.length === 0) {
    return ["Factuurdetails", "Geen betaalde facturen in deze periode."];
  }

  return [
    "Factuurdetails",
    ...invoices.map(
      (invoice) =>
        `${invoice.invoice_number}  |  ${invoice.client_name}  |  betaald ${formatPdfDate(invoice.paid_at)}  |  ex BTW ${formatPdfMoney(invoice.subtotal)}  |  BTW ${formatPdfMoney(invoice.vat_amount)}  |  incl ${formatPdfMoney(invoice.total_amount)}`,
    ),
  ];
}

export async function getCompanyLine() {
  const settings = await getResolvedBusinessSettings();
  return settings.companyName ? `Bedrijf: ${settings.companyName}` : undefined;
}

export function buildSimplePdf(lines: string[]) {
  const wrappedLines = lines.flatMap((line) => wrapPdfLine(line, 92));
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(${escapePdfText(wrappedLines[0] ?? "Rapport")}) Tj`,
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
