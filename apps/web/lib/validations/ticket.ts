import { z } from 'zod'

export const createTicketSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(10000).optional(),
  clientId: z.string().cuid().optional(),
  clientContactId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  type: z.enum(['TASK', 'BUG', 'FEEDBACK', 'FEATURE', 'QUESTION', 'INTAKE']).default('TASK'),
  category: z.string().min(1).max(100).optional(),
  source: z.enum(['MANUAL', 'API', 'AUTOMATION', 'COMMUNICATION', 'GITHUB', 'OTHER']).default('MANUAL'),
  assignedToId: z.string().cuid().optional(),
  labels: z.array(z.string().max(50)).default([]),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().max(9999).optional(),
  approvalStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).default('NOT_REQUIRED'),
  paymentStatus: z.enum(['NOT_APPLICABLE', 'UNPAID', 'INVOICE_SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED']).default('NOT_APPLICABLE'),
})

export const updateTicketSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(10000).optional(),
  clientId: z.string().cuid().nullable().optional(),
  clientContactId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  status: z.enum([
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_CLIENT',
    'APPROVAL_PENDING',
    'WAITING_FOR_PAYMENT',
    'FEEDBACK_REQUESTED',
    'IN_REVIEW',
    'DONE',
    'CANCELLED',
    'ON_HOLD',
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  type: z.enum(['TASK', 'BUG', 'FEEDBACK', 'FEATURE', 'QUESTION', 'INTAKE']).optional(),
  category: z.string().min(1).max(100).nullable().optional(),
  source: z.enum(['MANUAL', 'API', 'AUTOMATION', 'COMMUNICATION', 'GITHUB', 'OTHER']).optional(),
  assignedToId: z.string().cuid().nullable().optional(),
  labels: z.array(z.string().max(50)).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().positive().max(9999).nullable().optional(),
  isExtraWork: z.boolean().optional(),
  approvalStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
  paymentStatus: z.enum(['NOT_APPLICABLE', 'UNPAID', 'INVOICE_SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED']).optional(),
  statusReason: z.string().max(500).optional(),
  version: z.number().int().positive().optional(),
})

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  isInternal: z.boolean().default(true),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
