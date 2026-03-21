"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CommunicationType } from "@prisma/client";
import { ChevronDown, ChevronUp, Link as LinkIcon, Loader2, Lock, Trash2 } from "lucide-react";
import { deleteCommunicationEntry } from "@/actions/communication";

interface CommunicationEntry {
  id: string;
  type: CommunicationType;
  subject: string;
  content: string;
  occurredAt: Date | string;
  externalSenderName: string | null;
  externalSenderEmail: string | null;
  isInternal: boolean;
  links: string[];
  author: { id: string; name: string };
}

interface Props {
  entries: CommunicationEntry[];
  actorUserId?: string;
  onDeleted?: () => void | Promise<void>;
}

const TYPE_LABELS: Record<CommunicationType, string> = {
  EMAIL: "Email",
  CALL: "Gesprek",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
  DM: "DM",
  INTERNAL: "Intern",
  OTHER: "Overig",
};

const TYPE_VARIANTS: Record<
  CommunicationType,
  Parameters<typeof Badge>[0]["variant"]
> = {
  EMAIL: "info",
  CALL: "success",
  MEETING: "purple",
  WHATSAPP: "success",
  DM: "info",
  INTERNAL: "default",
  OTHER: "default",
};

function EntryCard({
  entry,
  actorUserId,
  onDeleted,
}: {
  entry: CommunicationEntry;
  actorUserId?: string;
  onDeleted?: () => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isLong = entry.content.length > 200;
  const preview = isLong && !expanded ? entry.content.slice(0, 200) + "…" : entry.content;

  async function handleDelete() {
    if (!actorUserId) {
      setDeleteError("Je sessie is verlopen. Ververs de pagina.");
      return;
    }

    const confirmed = window.confirm("Weet je zeker dat je dit communicatie-item wilt verwijderen?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteCommunicationEntry(entry.id, actorUserId);
      if (!result.success) {
        setDeleteError(result.error ?? "Verwijderen mislukt.");
        return;
      }

      await onDeleted?.();
    } catch {
      setDeleteError("Er is een onverwachte fout opgetreden.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={TYPE_VARIANTS[entry.type]}>
            {TYPE_LABELS[entry.type]}
          </Badge>
          {entry.isInternal && (
            <Badge variant="default">
              <Lock className="h-2.5 w-2.5 mr-1" />
              Intern
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatDateTime(entry.occurredAt)}
        </span>
      </div>

      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-60"
        >
          {deleting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verwijderen...
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" />
              Verwijderen
            </>
          )}
        </button>
      </div>

      <h4 className="font-medium text-gray-900 text-sm mb-1">{entry.subject}</h4>

      <div className="text-xs text-gray-500 mb-2">
        {entry.externalSenderName ? (
          <span>
            Van: <strong>{entry.externalSenderName}</strong>
            {entry.externalSenderEmail && ` <${entry.externalSenderEmail}>`}
          </span>
        ) : (
          <span>Gelogd door: {entry.author.name}</span>
        )}
      </div>

      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {preview}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Minder tonen
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Toon volledige inhoud
            </>
          )}
        </button>
      )}

      {entry.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <LinkIcon className="h-3 w-3" />
              {link.length > 50 ? link.slice(0, 50) + "…" : link}
            </a>
          ))}
        </div>
      )}

      {deleteError && (
        <p className="mt-3 text-xs text-red-600">{deleteError}</p>
      )}
    </div>
  );
}

export function CommunicationList({ entries, actorUserId, onDeleted }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        Nog geen communicatie-items. Voeg er hierboven een toe.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} actorUserId={actorUserId} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
