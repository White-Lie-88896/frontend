import {
    FindAllEgressRulesCommand,
    GetProxyGroupsCommand,
    GetProxyOutboundsCommand,
    GetProxySubscriptionsCommand
} from '@remnawave/backend-contract'

import { createGetQueryHook, errorHandler } from '../../tsq-helpers'

export const useGetEgressRules = createGetQueryHook({
    endpoint: FindAllEgressRulesCommand.TSQ_url,
    responseSchema: FindAllEgressRulesCommand.ResponseSchema,
    getQueryKey: () => ['egress-rules'],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Egress Rules')
})

export const useGetProxyOutbounds = createGetQueryHook({
    endpoint: GetProxyOutboundsCommand.TSQ_url,
    responseSchema: GetProxyOutboundsCommand.ResponseSchema,
    getQueryKey: () => ['proxy-outbounds'],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Outbounds')
})

export const useGetProxyGroups = createGetQueryHook({
    endpoint: GetProxyGroupsCommand.TSQ_url,
    responseSchema: GetProxyGroupsCommand.ResponseSchema,
    getQueryKey: () => ['proxy-groups'],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Groups')
})

export const useGetProxySubscriptions = createGetQueryHook({
    endpoint: GetProxySubscriptionsCommand.TSQ_url,
    responseSchema: GetProxySubscriptionsCommand.ResponseSchema,
    getQueryKey: () => ['proxy-subscriptions'],
    rQueryParams: {
        staleTime: 5_000,
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Proxy Subscriptions')
})
