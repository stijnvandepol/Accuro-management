import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  companyName: z.string().max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
})

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const createContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
