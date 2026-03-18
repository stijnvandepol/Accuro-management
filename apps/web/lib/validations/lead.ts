import { z } from 'zod'

export const createLeadSchema = z.object({
  title: z.string().min(2).max(200),
  clientId: z.string().cuid().optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  companyName: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  source: z.string().max(100).optional(),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().max(5000).optional(),
  assignedToId: z.string().cuid().optional(),
  status: z.enum([
    'NEW_REQUEST',
    'INTAKE_IN_PROGRESS',
    'INTAKE_COMPLETE',
    'DEMO_SCHEDULED',
    'DEMO_IN_PROGRESS',
    'DEMO_50_READY',
    'WAITING_FOR_RESPONSE',
    'APPROVAL_RECEIVED',
    'REJECTED',
    'WAITING_FOR_PAYMENT',
    'PAID',
    'CONVERTED_TO_PROJECT',
  ]).optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

export const convertLeadSchema = z.object({
  clientId: z.string().cuid().optional(),
  packageType: z.enum(['BASIS', 'PREMIUM']).default('BASIS'),
  title: z.string().min(2).max(200).optional(),
  assignedToId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  targetDeadline: z.string().datetime().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>
