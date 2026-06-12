import { z } from 'zod'

import { createMutationHook } from '../../tsq-helpers'
import { proxyAccessAuditSettingsSchema } from './proxy-access-audit.query.hooks'

export const updateProxyAccessAuditSettingsSchema = z.object({
    isEnabled: z.boolean().optional(),
    retentionDays: z.number().int().min(1).max(365).optional(),
    hideUsernames: z.boolean().optional(),
    aggregateOnly: z.boolean().optional(),
    distinctDomainWindowMinutes: z.number().int().min(1).max(1440).optional(),
    distinctDomainThreshold: z.number().int().min(1).max(10000).optional(),
    highRiskPorts: z.array(z.number().int().min(1).max(65535)).optional(),
    nodeSpikeMultiplier: z.number().int().min(1).max(100).optional(),
    nodeSpikeMinBytes: z.string().regex(/^\d+$/).optional(),
    blacklistedHosts: z.array(z.string()).optional(),
    blacklistedIps: z.array(z.string()).optional()
})

const updateSettingsResponseSchema = z.object({
    response: proxyAccessAuditSettingsSchema
})

export const cleanupProxyAccessAuditSchema = z.object({
    retentionDays: z.number().int().min(1).max(365).optional(),
    deleteAll: z.boolean().optional(),
    clearAlerts: z.boolean().optional()
})

const cleanupResponseSchema = z.object({
    response: z.object({
        deletedLogs: z.number(),
        deletedAlerts: z.number()
    })
})

export const useUpdateProxyAccessAuditSettings = createMutationHook({
    endpoint: '/api/proxy-access-audit/settings',
    bodySchema: updateProxyAccessAuditSettingsSchema,
    responseSchema: updateSettingsResponseSchema,
    requestMethod: 'patch'
})

export const useCleanupProxyAccessAudit = createMutationHook({
    endpoint: '/api/proxy-access-audit/cleanup',
    bodySchema: cleanupProxyAccessAuditSchema,
    responseSchema: cleanupResponseSchema,
    requestMethod: 'post'
})
