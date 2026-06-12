import { z } from 'zod'

import { createGetQueryHook, errorHandler } from '../../tsq-helpers'

const byteStringSchema = z.string()

export const proxyAccessLogSchema = z.object({
    id: z.string().uuid(),
    occurredAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value)),
    createdAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value)),
    nodeUuid: z.string().uuid().nullable(),
    nodeName: z.string().nullable(),
    userId: z.string().nullable(),
    userUuid: z.string().uuid().nullable(),
    username: z.string().nullable(),
    targetHost: z.string(),
    targetIp: z.string().nullable(),
    targetPort: z.number().nullable(),
    protocol: z.string().nullable(),
    network: z.string().nullable(),
    inboundTag: z.string().nullable(),
    outboundTag: z.string().nullable(),
    ruleUuid: z.string().uuid().nullable(),
    ruleName: z.string().nullable(),
    ruleAction: z.string().nullable(),
    uplinkBytes: byteStringSchema,
    downlinkBytes: byteStringSchema,
    totalBytes: byteStringSchema,
    sessionId: z.string().nullable(),
    metadata: z.unknown().nullable()
})

export type ProxyAccessLog = z.infer<typeof proxyAccessLogSchema>

export const proxyAccessAuditQuerySchema = z.object({
    start: z.number().default(0),
    size: z.number().min(1).max(1000).default(25),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    user: z.string().optional(),
    nodeUuid: z.string().optional(),
    target: z.string().optional(),
    targetPort: z.number().optional(),
    protocol: z.string().optional(),
    outboundTag: z.string().optional(),
    ruleUuid: z.string().optional()
})

export type ProxyAccessAuditQuery = z.infer<typeof proxyAccessAuditQuerySchema>

const proxyAccessStatsQuerySchema = proxyAccessAuditQuerySchema
    .omit({ start: true, size: true })
    .extend({
        limit: z.number().min(1).max(100).default(20)
    })

export type ProxyAccessStatsQuery = z.infer<typeof proxyAccessStatsQuerySchema>

const proxyAccessSummarySchema = z.object({
    totalLogs: z.number(),
    totalBytes: byteStringSchema,
    uplinkBytes: byteStringSchema,
    downlinkBytes: byteStringSchema,
    uniqueUsers: z.number(),
    uniqueDomains: z.number(),
    uniqueNodes: z.number(),
    alertCount: z.number()
})

export type ProxyAccessSummary = z.infer<typeof proxyAccessSummarySchema>

const proxyAccessTopDomainSchema = z.object({
    targetHost: z.string(),
    hits: z.number(),
    totalBytes: byteStringSchema,
    uplinkBytes: byteStringSchema,
    downlinkBytes: byteStringSchema,
    uniqueUsers: z.number(),
    uniqueNodes: z.number(),
    lastSeenAt: z
        .string()
        .datetime()
        .nullable()
        .transform((value) => (value ? new Date(value) : null))
})

export type ProxyAccessTopDomain = z.infer<typeof proxyAccessTopDomainSchema>

const proxyAccessRuleHitSchema = z.object({
    ruleUuid: z.string().uuid().nullable(),
    ruleName: z.string().nullable(),
    ruleAction: z.string().nullable(),
    hitCount: z.number(),
    cumulativeHitCount: byteStringSchema,
    uplinkBytes: byteStringSchema,
    downlinkBytes: byteStringSchema,
    totalBytes: byteStringSchema,
    uniqueUsers: z.number(),
    uniqueNodes: z.number(),
    lastHitAt: z
        .string()
        .datetime()
        .nullable()
        .transform((value) => (value ? new Date(value) : null))
})

export type ProxyAccessRuleHit = z.infer<typeof proxyAccessRuleHitSchema>

export const proxyAccessAlertSchema = z.object({
    id: z.string().uuid(),
    createdAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value)),
    type: z.enum(['DISTINCT_DOMAINS', 'HIGH_RISK_PORT', 'NODE_TRAFFIC_SPIKE', 'BLACKLIST_HIT']),
    severity: z.enum(['info', 'warning', 'critical']),
    status: z.enum(['OPEN', 'ACKED', 'RESOLVED']),
    message: z.string(),
    userId: z.string().nullable(),
    userUuid: z.string().uuid().nullable(),
    username: z.string().nullable(),
    nodeUuid: z.string().uuid().nullable(),
    nodeName: z.string().nullable(),
    targetHost: z.string().nullable(),
    targetIp: z.string().nullable(),
    targetPort: z.number().nullable(),
    metadata: z.unknown().nullable()
})

export type ProxyAccessAlert = z.infer<typeof proxyAccessAlertSchema>

export const proxyAccessAlertsQuerySchema = proxyAccessAuditQuerySchema
    .omit({
        outboundTag: true,
        protocol: true,
        ruleUuid: true,
        targetPort: true
    })
    .extend({
        type: z.string().optional(),
        severity: z.string().optional(),
        status: z.string().optional()
    })

export type ProxyAccessAlertsQuery = z.infer<typeof proxyAccessAlertsQuerySchema>

export const proxyAccessAuditSettingsSchema = z.object({
    id: z.number(),
    isEnabled: z.boolean(),
    retentionDays: z.number(),
    hideUsernames: z.boolean(),
    aggregateOnly: z.boolean(),
    distinctDomainWindowMinutes: z.number(),
    distinctDomainThreshold: z.number(),
    highRiskPorts: z.array(z.number()),
    nodeSpikeMultiplier: z.number(),
    nodeSpikeMinBytes: byteStringSchema,
    blacklistedHosts: z.array(z.string()),
    blacklistedIps: z.array(z.string()),
    createdAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value)),
    updatedAt: z
        .string()
        .datetime()
        .transform((value) => new Date(value))
})

export type ProxyAccessAuditSettings = z.infer<typeof proxyAccessAuditSettingsSchema>

const logsResponseSchema = z.object({
    response: z.object({
        records: z.array(proxyAccessLogSchema),
        total: z.number(),
        aggregateOnly: z.boolean()
    })
})

const summaryResponseSchema = z.object({
    response: proxyAccessSummarySchema
})

const topDomainsResponseSchema = z.object({
    response: z.array(proxyAccessTopDomainSchema)
})

const ruleHitsResponseSchema = z.object({
    response: z.array(proxyAccessRuleHitSchema)
})

const alertsResponseSchema = z.object({
    response: z.object({
        records: z.array(proxyAccessAlertSchema),
        total: z.number()
    })
})

const settingsResponseSchema = z.object({
    response: proxyAccessAuditSettingsSchema
})

export const useGetProxyAccessLogs = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/logs',
    responseSchema: logsResponseSchema,
    requestQuerySchema: proxyAccessAuditQuerySchema,
    getQueryKey: ({ query }) => ['proxy-access-audit', 'logs', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Logs')
})

export const useGetProxyAccessSummary = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/summary',
    responseSchema: summaryResponseSchema,
    requestQuerySchema: proxyAccessStatsQuerySchema.omit({ limit: true }),
    getQueryKey: ({ query }) => ['proxy-access-audit', 'summary', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Summary')
})

export const useGetProxyAccessTopDomains = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/top-domains',
    responseSchema: topDomainsResponseSchema,
    requestQuerySchema: proxyAccessStatsQuerySchema,
    getQueryKey: ({ query }) => ['proxy-access-audit', 'top-domains', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Top Domains')
})

export const useGetProxyAccessRuleHits = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/rule-hits',
    responseSchema: ruleHitsResponseSchema,
    requestQuerySchema: proxyAccessStatsQuerySchema,
    getQueryKey: ({ query }) => ['proxy-access-audit', 'rule-hits', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Rule Hits')
})

export const useGetProxyAccessAlerts = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/alerts',
    responseSchema: alertsResponseSchema,
    requestQuerySchema: proxyAccessAlertsQuerySchema,
    getQueryKey: ({ query }) => ['proxy-access-audit', 'alerts', query],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Alerts')
})

export const useGetProxyAccessAuditSettings = createGetQueryHook({
    endpoint: '/api/proxy-access-audit/settings',
    responseSchema: settingsResponseSchema,
    getQueryKey: () => ['proxy-access-audit', 'settings'],
    rQueryParams: {
        staleTime: 10_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Access Audit Settings')
})
