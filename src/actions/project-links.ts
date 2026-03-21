"use server";

import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  ProjectLinkFormSchema,
  type ProjectLinkFormData,
} from "@/lib/validations/project-link";
import { toFieldErrors } from "@/lib/validation-errors";
import { ZodError } from "zod";

export async function addProjectLink(
  projectId: string,
  data: ProjectLinkFormData,
  actorUserId: string,
) {
  try {
    const validated = ProjectLinkFormSchema.parse(data);

    const project = await prisma.projectWorkspace.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return { success: false as const, error: "Project not found" };
    }

    const projectLink = await prisma.projectLink.create({
      data: {
        projectId,
        label: validated.label,
        url: validated.url,
        description: validated.description ?? null,
      },
    });

    await createAuditLog({
      actorUserId,
      entityType: "ProjectLink",
      entityId: projectLink.id,
      action: "CREATE",
      metadata: {
        projectId,
        label: projectLink.label,
        url: projectLink.url,
      },
    });

    return { success: true as const, projectLink };
  } catch (error) {
    logger.error("addProjectLink error:", error, { projectId });
    if (error instanceof ZodError) {
      return {
        success: false as const,
        error: "Validatiefout",
        fieldErrors: toFieldErrors(error),
      };
    }
    return { success: false as const, error: "Link toevoegen mislukt" };
  }
}

export async function deleteProjectLink(
  id: string,
  projectId: string,
  actorUserId: string,
) {
  try {
    const projectLink = await prisma.projectLink.findUnique({
      where: { id },
    });

    if (!projectLink) {
      return { success: false as const, error: "Link not found" };
    }

    if (projectLink.projectId !== projectId) {
      return {
        success: false as const,
        error: "Link does not belong to the specified project",
      };
    }

    await prisma.projectLink.delete({ where: { id } });

    await createAuditLog({
      actorUserId,
      entityType: "ProjectLink",
      entityId: id,
      action: "DELETE",
      metadata: {
        projectId,
        label: projectLink.label,
        url: projectLink.url,
      },
    });

    return { success: true as const };
  } catch (error) {
    logger.error("deleteProjectLink error:", error, { projectId, projectLinkId: id });
    return { success: false as const, error: "Link verwijderen mislukt" };
  }
}
