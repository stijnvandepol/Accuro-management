import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validations/shared";

const trimmedRequiredString = (label: string) =>
  z.string().trim().min(2, `${label} must be at least 2 characters`);

export const ClientFormSchema = z.object({
  companyName: trimmedRequiredString("Company name"),
  contactName: trimmedRequiredString("Contact name"),
  email: z.string().trim().email("Invalid email address"),
  phone: optionalTrimmedString,
  address: optionalTrimmedString,
  notes: optionalTrimmedString,
  invoiceDetails: optionalTrimmedString,
});

export type ClientFormData = z.infer<typeof ClientFormSchema>;
