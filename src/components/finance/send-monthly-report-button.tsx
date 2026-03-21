"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText } from "lucide-react";
import { sendMonthlyFinancialReportToN8n } from "@/actions/monthly-reports";

interface Props {
  year: number;
  month: number;
  n8nEnabled: boolean;
}

export function SendMonthlyReportButton({ year, month, n8nEnabled }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);

  async function handleSend() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);
    setDriveUrl(null);

    const result = await sendMonthlyFinancialReportToN8n(
      { year, month },
      session.user.id,
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Verzenden mislukt.");
      return;
    }

    setDriveUrl(result.driveUrl ?? null);
  }

  return (
    <div>
      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
      {driveUrl ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block text-xs text-green-700 hover:underline"
        >
          PDF staat klaar in Google Drive
        </a>
      ) : null}
      <button
        type="button"
        className="btn-secondary"
        disabled={loading || !n8nEnabled}
        title={!n8nEnabled ? "N8N_WEBHOOK_MONTHLY_REPORT_URL is niet ingesteld" : undefined}
        onClick={handleSend}
      >
        <FileText className="h-4 w-4" />
        {loading ? "Bezig…" : "PDF via n8n"}
      </button>
    </div>
  );
}
