"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronUp,
  ExternalLink,
  Github,
  Link2,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { deleteRepository, getRepositories } from "@/actions/repositories";
import { deleteProjectLink } from "@/actions/project-links";
import { RepositoryForm } from "@/components/repositories/repository-form";
import { ProjectLinkForm } from "@/components/projects/project-link-form";

interface Repository {
  id: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
  issueBoardUrl: string | null;
}

interface ProjectLink {
  id: string;
  label: string;
  url: string;
  description: string | null;
}

interface Props {
  projectId: string;
  repositories: Repository[];
  projectLinks: ProjectLink[];
}

export function ProjectGithubTab({
  projectId,
  repositories: initialRepositories,
  projectLinks: initialProjectLinks,
}: Props) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>(initialRepositories);
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>(initialProjectLinks);
  const [showRepositoryForm, setShowRepositoryForm] = useState(false);
  const [showProjectLinkForm, setShowProjectLinkForm] = useState(false);
  const [deletingRepositoryId, setDeletingRepositoryId] = useState<string | null>(null);
  const [deletingProjectLinkId, setDeletingProjectLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRepositoryAdded() {
    setShowRepositoryForm(false);
    const result = await getRepositories(projectId);
    if (result.success && result.repositories) {
      setRepositories(result.repositories);
    }
  }

  function handleProjectLinkAdded(projectLink: ProjectLink) {
    setShowProjectLinkForm(false);
    setProjectLinks((current) => [...current, projectLink]);
  }

  async function handleDeleteRepository(repositoryId: string) {
    if (!session?.user?.id) return;
    if (!confirm("Deze repository uit het project verwijderen?")) return;

    setDeletingRepositoryId(repositoryId);
    try {
      const result = await deleteRepository(repositoryId, projectId, session.user.id);
      if (!result.success) {
        setError(result.error ?? "Repository verwijderen mislukt");
        return;
      }

      setRepositories((current) => current.filter((repo) => repo.id !== repositoryId));
    } finally {
      setDeletingRepositoryId(null);
    }
  }

  async function handleDeleteProjectLink(projectLinkId: string) {
    if (!session?.user?.id) return;
    if (!confirm("Deze link uit het project verwijderen?")) return;

    setDeletingProjectLinkId(projectLinkId);
    try {
      const result = await deleteProjectLink(projectLinkId, projectId, session.user.id);
      if (!result.success) {
        setError(result.error ?? "Link verwijderen mislukt");
        return;
      }

      setProjectLinks((current) => current.filter((link) => link.id !== projectLinkId));
    } finally {
      setDeletingProjectLinkId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Github className="h-4 w-4 text-gray-600" />
              Repositories
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Koppel een repository zodat je snel naar code en issues kunt navigeren.
            </p>
          </div>

          <button
            onClick={() => setShowRepositoryForm((open) => !open)}
            className="btn-secondary"
          >
            {showRepositoryForm ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Annuleren
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Repository toevoegen
              </>
            )}
          </button>
        </div>

        {showRepositoryForm && (
          <div className="mb-5 rounded-lg border border-gray-100 p-4">
            <RepositoryForm projectId={projectId} onSuccess={handleRepositoryAdded} />
          </div>
        )}

        {repositories.length > 0 ? (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={repo.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    {repo.repoName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="mt-1 text-xs text-gray-400">
                    Branch: {repo.defaultBranch}
                    {repo.issueBoardUrl ? " · " : ""}
                    {repo.issueBoardUrl ? (
                      <a
                        href={repo.issueBoardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Issues openen
                      </a>
                    ) : null}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteRepository(repo.id)}
                  disabled={deletingRepositoryId === repo.id}
                  className="p-1 text-gray-400 transition-colors hover:text-red-600"
                  title="Repository verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-400">
            Nog geen repositories gekoppeld.
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Wrench className="h-4 w-4 text-gray-600" />
              Links & tools
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Voeg meerdere projectlinks toe voor design, hosting, dashboards of andere tools.
            </p>
          </div>

          <button
            onClick={() => setShowProjectLinkForm((open) => !open)}
            className="btn-secondary"
          >
            {showProjectLinkForm ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Annuleren
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Link toevoegen
              </>
            )}
          </button>
        </div>

        {showProjectLinkForm && (
          <div className="mb-5 rounded-lg border border-gray-100 p-4">
            <ProjectLinkForm projectId={projectId} onSuccess={handleProjectLinkAdded} />
          </div>
        )}

        {projectLinks.length > 0 ? (
          <div className="space-y-3">
            {projectLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="mt-1 break-all text-xs text-gray-400">{link.url}</p>
                  {link.description && (
                    <p className="mt-1 text-sm text-gray-600">{link.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteProjectLink(link.id)}
                  disabled={deletingProjectLinkId === link.id}
                  className="p-1 text-gray-400 transition-colors hover:text-red-600"
                  title="Link verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-400">
            Nog geen extra projectlinks toegevoegd.
          </div>
        )}
      </div>
    </div>
  );
}
