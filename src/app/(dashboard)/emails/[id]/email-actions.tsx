"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw, Mail, Link2, Unlink, Reply } from "lucide-react";
import {
  trashEmail,
  restoreEmail,
  markEmailRead,
  linkEmailToTicket,
  unlinkEmailFromTicket,
} from "@/actions/emails";
import { EmailFolder } from "@prisma/client";
import Link from "next/link";

interface Ticket {
  id: string;
  title: string;
  project: { name: string; client: { companyName: string } };
}

interface EmailProps {
  id: string;
  folder: EmailFolder;
  isRead: boolean;
  fromEmail: string;
  subject: string;
  changeRequestId: string | null;
  changeRequest: { id: string; title: string; project: { id: string; name: string; slug: string } } | null;
  client: { id: string; companyName: string } | null;
}

export function EmailActions({
  email,
  tickets,
  currentUserId,
}: {
  email: EmailProps;
  tickets: Ticket[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [linking, setLinking] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState("");

  function handleTrash() {
    startTransition(async () => {
      await trashEmail(email.id, currentUserId);
      router.push("/emails");
    });
  }

  function handleRestore() {
    startTransition(async () => {
      await restoreEmail(email.id, currentUserId);
      router.push("/emails");
    });
  }

  function handleToggleRead() {
    startTransition(async () => {
      await markEmailRead(email.id, !email.isRead);
      router.refresh();
    });
  }

  function handleLink() {
    if (!selectedTicketId) return;
    startTransition(async () => {
      await linkEmailToTicket(email.id, selectedTicketId, currentUserId);
      setLinking(false);
      router.refresh();
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      await unlinkEmailFromTicket(email.id, currentUserId);
      router.refresh();
    });
  }

  const replyUrl = `/emails/compose?replyTo=${email.fromEmail}&subject=${encodeURIComponent(`Re: ${email.subject}`)}&replyToEmailId=${email.id}`;

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acties</h3>

      <Link href={replyUrl} className="btn-secondary w-full justify-center text-sm">
        <Reply className="h-3.5 w-3.5" />
        Beantwoorden
      </Link>

      <button
        onClick={handleToggleRead}
        disabled={isPending}
        className="btn-secondary w-full justify-center text-sm"
      >
        <Mail className="h-3.5 w-3.5" />
        {email.isRead ? "Markeer als ongelezen" : "Markeer als gelezen"}
      </button>

      {email.folder === EmailFolder.TRASH ? (
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="btn-secondary w-full justify-center text-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Herstellen
        </button>
      ) : (
        <button
          onClick={handleTrash}
          disabled={isPending}
          className="btn-secondary w-full justify-center text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Naar prullenbak
        </button>
      )}

      <div className="border-t border-gray-100 pt-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ticket</h3>

        {email.changeRequest ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 bg-blue-50 px-2 py-1.5 rounded">
              {email.changeRequest.title}
            </p>
            <button
              onClick={handleUnlink}
              disabled={isPending}
              className="btn-secondary w-full justify-center text-xs text-red-600 hover:text-red-700"
            >
              <Unlink className="h-3 w-3" />
              Ontkoppelen
            </button>
          </div>
        ) : linking ? (
          <div className="space-y-2">
            <select
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="form-select text-sm"
            >
              <option value="">Kies ticket…</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.project.client.companyName} – {t.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleLink}
                disabled={isPending || !selectedTicketId}
                className="btn-primary flex-1 justify-center text-xs"
              >
                Koppelen
              </button>
              <button
                onClick={() => setLinking(false)}
                className="btn-secondary flex-1 justify-center text-xs"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLinking(true)}
            className="btn-secondary w-full justify-center text-sm"
          >
            <Link2 className="h-3.5 w-3.5" />
            Koppel aan ticket
          </button>
        )}
      </div>
    </div>
  );
}
