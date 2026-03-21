import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validations/shared";

export const ProjectLinkFormSchema = z.object({
  label: z.string().trim().min(1, "Naam is verplicht").max(120, "Naam is te lang"),
  url: z.string().trim().url("Voer een geldige URL in"),
  description: optionalTrimmedString,
});

export type ProjectLinkFormData = z.infer<typeof ProjectLinkFormSchema>;
