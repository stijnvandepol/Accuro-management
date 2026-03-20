"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteClient } from "@/actions/clients";

interface Props {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!session?.user?.id) return;
    if (!window.confirm(`Weet je zeker dat je "${clientName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;

    setLoading(true);
    setError(null);

    const result = await deleteClient(clientId, session.user.id);

    if (!result.success) {
      setError(result.error ?? "Verwijderen mislukt.");
      setLoading(false);
      return;
    }

    router.push("/clients");
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Verwijderen
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
