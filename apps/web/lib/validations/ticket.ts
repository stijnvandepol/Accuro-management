import { z } from 'zod'

export const createTicketSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(10000).optional(),
  projectId: z.string().cuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  type: z.enum(['TASK', 'BUG', 'FEEDBACK', 'FEATURE', 'QUESTION', 'INTAKE']).default('TASK'),
  assignedToId: z.string().cuid().optional(),
  labels: z.array(z.string().max(50)).default([]),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().max(9999).optional(),
})

export const updateTicketSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(10000).optional(),
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
  assignedToId: z.string().cuid().nullable().optional(),
  labels: z.array(z.string().max(50)).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().positive().max(9999).nullable().optional(),
  isExtraWork: z.boolean().optional(),
  statusReason: z.string().max(500).optional(),
})

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  isInternal: z.boolean().default(true),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
