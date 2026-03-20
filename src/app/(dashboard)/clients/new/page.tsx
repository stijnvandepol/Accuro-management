"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { createClient } from "@/actions/clients";
import { Loader2, ArrowLeft } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    invoiceDetails: "",
  });

  function getFieldError(name: string): string | undefined {
    return fieldErrors[name];
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name } = e.target;
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await createClient(form, session.user.id);
      if (result.success && result.client) {
        router.push(`/clients/${result.client.id}`);
      } else {
        // Handle field-level errors from server action
        if ('fieldErrors' in result && result.fieldErrors && Array.isArray(result.fieldErrors)) {
          const errors: Record<string, string> = {};
          result.fieldErrors.forEach((err: { field: string; message: string }) => {
            errors[err.field] = err.message;
          });
          setFieldErrors(errors);
        }
        setError(result.error ?? "Klant aanmaken mislukt.");
      }
    } catch {
      setError("Er is een onverwachte fout opgetreden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <Link
            href="/clients"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug naar klanten
          </Link>
          <h1 className="page-title">Nieuwe klant</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Contactinformatie
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="companyName" className="form-label">
                Bedrijfsnaam <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={form.companyName}
                onChange={handleChange}
                className={`form-input ${getFieldError('companyName') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Acme B.V."
              />
              {getFieldError('companyName') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('companyName')}</p>
              )}
            </div>
            <div>
              <label htmlFor="contactName" className="form-label">
                Contactpersoon <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                value={form.contactName}
                onChange={handleChange}
                className={`form-input ${getFieldError('contactName') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Jan Janssen"
              />
              {getFieldError('contactName') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('contactName')}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="form-label">
                E-mailadres <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className={`form-input ${getFieldError('email') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="jan@acme.nl"
              />
              {getFieldError('email') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="form-label">
                Telefoon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className={`form-input ${getFieldError('phone') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="+31 6 12345678"
              />
              {getFieldError('phone') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
              )}
            </div>
            <div>
              <label htmlFor="address" className="form-label">
                Adres
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className={`form-input ${getFieldError('address') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Straat 1, 1234 AB Amsterdam"
              />
              {getFieldError('address') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('address')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Billing */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Notities &amp; facturatie
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="invoiceDetails" className="form-label">
                Factuurgegevens
              </label>
              <textarea
                id="invoiceDetails"
                name="invoiceDetails"
                rows={3}
                value={form.invoiceDetails}
                onChange={handleChange}
                className={`form-textarea ${getFieldError('invoiceDetails') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Betaaltermijnen, afwijkend factuuradres, enz."
              />
              {getFieldError('invoiceDetails') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('invoiceDetails')}</p>
              )}
            </div>
            <div>
              <label htmlFor="notes" className="form-label">
                Interne notities
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                className={`form-textarea ${getFieldError('notes') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Interne notities over deze klant…"
              />
              {getFieldError('notes') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('notes')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Bezig met aanmaken…
              </>
            ) : (
              "Klant aanmaken"
            )}
          </button>
          <Link href="/clients" className="btn-secondary">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  );
}
