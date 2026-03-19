import { requireSession } from "@/lib/auth";
import { getEmails } from "@/actions/emails";
import { EmailFolder } from "@prisma/client";
import Link from "next/link";
import { Mail, Send, Trash2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const FOLDERS: { folder: EmailFolder; label: string; icon: typeof Inbox }[] = [
  { folder: EmailFolder.INBOX, label: "Inbox", icon: Inbox },
  { folder: EmailFolder.SENT, label: "Verzonden", icon: Send },
  { folder: EmailFolder.TRASH, label: "Prullenbak", icon: Trash2 },
];

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

interface Props {
  searchParams: Promise<{ folder?: string }>;
}

export default async function EmailsPage({ searchParams }: Props) {
  await requireSession();
  const { folder: folderParam } = await searchParams;
  const folder = (Object.values(EmailFolder) as string[]).includes(folderParam ?? "")
    ? (folderParam as EmailFolder)
    : EmailFolder.INBOX;

  const result = await getEmails(folder);
  const emails = result.success ? result.emails : [];

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Folder sidebar */}
      <div className="w-48 border-r border-gray-100 bg-gray-50 flex-shrink-0 p-3 space-y-0.5">
        <div className="px-3 py-2 mb-2">
          <Link href="/emails/compose" className="btn-primary w-full justify-center text-sm">
            <Mail className="h-3.5 w-3.5" />
            Nieuw
          </Link>
        </div>
        {FOLDERS.map(({ folder: f, label, icon: Icon }) => (
          <Link
            key={f}
            href={`/emails?folder=${f}`}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              folder === f
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:bg-white hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Geen e-mails in {FOLDERS.find((f) => f.folder === folder)?.label.toLowerCase() ?? "map"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => (
              <Link
                key={email.id}
                href={`/emails/${email.id}`}
                className={cn(
                  "flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors",
                  !email.isRead && "bg-blue-50/40"
                )}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0">
                  {!email.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  ) : (
                    <div className="w-2 h-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn("text-sm truncate", !email.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                      {folder === EmailFolder.SENT
                        ? (email.toAddresses[0] ?? "—")
                        : (email.fromName ?? email.fromEmail)}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(email.receivedAt ?? email.sentAt ?? email.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">{email.subject}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {email.client && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {email.client.companyName}
                      </span>
                    )}
                    {email.changeRequest && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {email.changeRequest.title}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
