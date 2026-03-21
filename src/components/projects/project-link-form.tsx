"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { addProjectLink } from "@/actions/project-links";

interface ProjectLink {
  id: string;
  label: string;
  url: string;
  description: string | null;
}

interface Props {
  projectId: string;
  onSuccess: (projectLink: ProjectLink) => void;
}

export function ProjectLinkForm({ projectId, onSuccess }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await addProjectLink(
        projectId,
        {
          label,
          url,
          description,
        },
        session.user.id,
      );

      if (!result.success || !result.projectLink) {
        setError(result.error ?? "Link toevoegen mislukt.");
        return;
      }

      setLabel("");
      setUrl("");
      setDescription("");
      onSuccess(result.projectLink);
    } catch {
      setError("Er is een onverwachte fout opgetreden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="project-link-label" className="form-label">
            Naam <span className="text-red-500">*</span>
          </label>
          <input
            id="project-link-label"
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="form-input"
            placeholder="Figma, Hosting, Stripe..."
          />
        </div>

        <div>
          <label htmlFor="project-link-url" className="form-label">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="project-link-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="form-input"
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label htmlFor="project-link-description" className="form-label">
          Korte toelichting
        </label>
        <input
          id="project-link-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="form-input"
          placeholder="Bijvoorbeeld staging, design of ticketboard"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Bezig met toevoegen…
          </>
        ) : (
          "Link toevoegen"
        )}
      </button>
    </form>
  );
}
