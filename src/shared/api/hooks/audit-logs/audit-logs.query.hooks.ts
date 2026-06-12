import { z } from 'zod'

import { createGetQueryHook, errorHandler } from '../../tsq-helpers'

export const auditLogSchema = z.object({
    id: z.string().uuid(),
    createdAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value)),
    actorType: z.enum(['admin', 'user', 'node', 'system', 'agent']),
    actorId: z.string().uuid().nullable(),
    actorName: z.string().nullable(),
    action: z.string(),
    resourceType: z.string().nullable(),
    resourceId: z.string().uuid().nullable(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    result: z.enum(['success', 'failed', 'blocked', 'warning']),
    message: z.string().nullable(),
    metadata: z.unknown().nullable()
})

export type AuditLog = z.infer<typeof auditLogSchema>

export const auditLogsQuerySchema = z.object({
    start: z.number().default(0),
    size: z.number().min(1).max(1000).default(25),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    actorType: z.string().optional(),
    actorName: z.string().optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    result: z.string().optional(),
    ip: z.string().optional()
})

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>

const auditLogsResponseSchema = z.object({
    response: z.object({
        records: z.array(auditLogSchema),
        total: z.number()
    })
})

export const useGetAuditLogs = createGetQueryHook({
    endpoint: '/api/audit-logs',
    responseSchema: auditLogsResponseSchema,
    requestQuerySchema: auditLogsQuerySchema,
    getQueryKey: ({ query }) => ['audit-logs', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Audit Logs')
})
