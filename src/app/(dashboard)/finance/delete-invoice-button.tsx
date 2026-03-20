"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { deleteInvoice } from "@/actions/invoices";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  redirectAfter?: string;
}

export function DeleteInvoiceButton({ invoiceId, invoiceNumber, redirectAfter }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session?.user?.id) return;
    if (!confirm(`Factuur #${invoiceNumber} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    setLoading(true);
    try {
      const result = await deleteInvoice(invoiceId, session.user.id);
      if (result.success) {
        if (redirectAfter) {
          router.push(redirectAfter);
        } else {
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
      title="Factuur verwijderen"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
