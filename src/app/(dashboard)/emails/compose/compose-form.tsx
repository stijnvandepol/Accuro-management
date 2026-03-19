"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { sendEmail, type EmailAttachment } from "@/actions/emails";
import { Loader2, Paperclip, X, FileText } from "lucide-react";
import Link from "next/link";

const MAX_TOTAL_MB = 20;

interface Props {
  defaultTo: string;
  defaultSubject: string;
  replyToEmailId?: string;
  defaultChangeRequestId?: string;
  defaultClientId?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToAttachment(file: File): Promise<EmailAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ name: file.name, mimeType: file.type || "application/octet-stream", data: base64, size: file.size });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ComposeForm({
  defaultTo,
  defaultSubject,
  replyToEmailId,
  defaultChangeRequestId,
  defaultClientId,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    to: defaultTo,
    subject: defaultSubject,
    body: "",
  });

  const totalBytes = attachedFiles.reduce((s, f) => s + f.size, 0);
  const overLimit = totalBytes > MAX_TOTAL_MB * 1024 * 1024;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setAttachedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...selected.filter((f) => !existing.has(f.name + f.size))];
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    if (overLimit) {
      setError(`Totale bijlagegrootte overschrijdt ${MAX_TOTAL_MB} MB.`);
      return;
    }
    setError(null);
    setLoading(true);

    const toAddresses = form.to.split(",").map((s) => s.trim()).filter(Boolean);
    if (toAddresses.length === 0) {
      setError("Voer minimaal één ontvanger in.");
      setLoading(false);
      return;
    }

    let attachments: EmailAttachment[] = [];
    if (attachedFiles.length > 0) {
      try {
        attachments = await Promise.all(attachedFiles.map(fileToAttachment));
      } catch {
        setError("Bijlage inlezen mislukt. Probeer opnieuw.");
        setLoading(false);
        return;
      }
    }

    const result = await sendEmail(
      {
        toAddresses,
        subject: form.subject,
        bodyText: form.body,
        attachments,
        changeRequestId: defaultChangeRequestId,
        clientId: defaultClientId,
        replyToExternalId: replyToEmailId,
      },
      session.user.id
    );

    setLoading(false);
    if (result.success) {
      router.push("/emails?folder=SENT");
    } else {
      setError(result.error ?? "Verzenden mislukt.");
    }
  }

  return (
    <div className="card p-6 max-w-2xl">
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Aan</label>
          <input
            name="to"
            type="text"
            required
            value={form.to}
            onChange={handleChange}
            className="form-input"
            placeholder="naam@bedrijf.nl, naam2@bedrijf.nl"
          />
        </div>
        <div>
          <label className="form-label">Onderwerp</label>
          <input
            name="subject"
            type="text"
            required
            value={form.subject}
            onChange={handleChange}
            className="form-input"
            placeholder="Onderwerp"
          />
        </div>
        <div>
          <label className="form-label">Bericht</label>
          <textarea
            name="body"
            rows={10}
            required
            value={form.body}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Typ hier je bericht…"
          />
        </div>

        {/* Attachments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="form-label mb-0">Bijlagen</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Bestand toevoegen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {attachedFiles.length > 0 && (
            <div className="space-y-1.5">
              {attachedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <p className={`text-xs ${overLimit ? "text-red-600" : "text-gray-400"}`}>
                Totaal: {formatBytes(totalBytes)} / {MAX_TOTAL_MB} MB
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading || overLimit} className="btn-primary">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verzenden…
              </>
            ) : (
              "Verzenden"
            )}
          </button>
          <Link href="/emails" className="btn-secondary">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
