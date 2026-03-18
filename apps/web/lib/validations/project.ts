import { z } from 'zod'

export const createProjectSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  clientId: z.string().cuid(),
  packageType: z.enum(['BASIS', 'PREMIUM']).default('BASIS'),
  assignedToId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  targetDeadline: z.string().datetime().optional(),
  deliverables: z.array(z.string().max(200)).default([]),
  notes: z.string().max(5000).optional(),
})

export const updateProjectSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum([
    'KICKOFF',
    'IN_DEVELOPMENT',
    'WAITING_FOR_INPUT',
    'FEEDBACK_RECEIVED',
    'FEEDBACK_ROUND_1',
    'FEEDBACK_ROUND_2',
    'FEEDBACK_ROUND_3',
    'FEEDBACK_ROUND_4',
    'REVISION_IN_PROGRESS',
    'READY_FOR_DELIVERY',
    'GO_LIVE_SCHEDULED',
    'LIVE',
    'HANDED_OVER',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED',
  ]).optional(),
  packageType: z.enum(['BASIS', 'PREMIUM']).optional(),
  assignedToId: z.string().cuid().nullable().optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
  paymentStatus: z.enum([
    'UNPAID',
    'INVOICE_SENT',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'REFUNDED',
  ]).optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDeadline: z.string().datetime().nullable().optional(),
  goLiveDate: z.string().datetime().nullable().optional(),
  deliverables: z.array(z.string().max(200)).optional(),
  notes: z.string().max(5000).optional(),
  statusReason: z.string().max(500).optional(),
})

export const openFeedbackRoundSchema = z.object({
  notes: z.string().max(2000).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type OpenFeedbackRoundInput = z.infer<typeof openFeedbackRoundSchema>
