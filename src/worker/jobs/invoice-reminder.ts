/**
 * Job: invoice:send-reminder
 *
 * Sends an invoice payment reminder to a client.
 * Future: integrate with email provider (Resend, Nodemailer, etc.)
 */
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import type { InvoiceReminderJobData } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function processInvoiceReminder(data: InvoiceReminderJobData) {
  const { invoiceId, clientEmail, invoiceNumber, totalAmount, dueDate } = data;

  // Verify the invoice is still unpaid before sending
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (invoice.status === InvoiceStatus.PAID) {
    logger.info("Invoice already paid — skipping reminder", { invoiceNumber });
    return { skipped: true, reason: "already_paid" };
  }

  // --- Future: send actual email ---
  // await sendEmail({
  //   to: clientEmail,
  //   subject: `Betalingsherinnering: Factuur ${invoiceNumber}`,
  //   body: buildReminderEmail(clientName, invoiceNumber, totalAmount, dueDate),
  // });

  logger.info("PLACEHOLDER: Would send invoice reminder", { clientEmail, invoiceNumber, totalAmount, dueDate });

  return {
    sent: false,
    placeholder: true,
    invoiceId,
    clientEmail,
  };
}
