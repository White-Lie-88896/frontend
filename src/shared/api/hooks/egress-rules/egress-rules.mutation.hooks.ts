import {
    CreateEgressRuleCommand,
    CreateProxyGroupCommand,
    CreateProxyOutboundCommand,
    CreateProxySubscriptionCommand,
    DeleteEgressRuleCommand,
    DeleteProxyGroupCommand,
    DeleteProxyOutboundCommand,
    DeleteProxySubscriptionCommand,
    ExportEgressConfigCommand,
    ImportEgressConfigCommand,
    ImportEgressRuleListCommand,
    ReorderEgressRulesCommand,
    SyncProxySubscriptionCommand,
    TestEgressRuleCommand,
    TestProxyOutboundCommand,
    UpdateEgressRuleCommand,
    UpdateProxyGroupCommand,
    UpdateProxyOutboundCommand,
    UpdateProxySubscriptionCommand
} from '@remnawave/backend-contract'

import { createMutationHook } from '../../tsq-helpers'

export const useCreateEgressRule = createMutationHook({
    endpoint: CreateEgressRuleCommand.TSQ_url,
    bodySchema: CreateEgressRuleCommand.RequestSchema,
    responseSchema: CreateEgressRuleCommand.ResponseSchema,
    requestMethod: CreateEgressRuleCommand.endpointDetails.REQUEST_METHOD
})

export const useUpdateEgressRule = createMutationHook({
    endpoint: UpdateEgressRuleCommand.TSQ_url,
    bodySchema: UpdateEgressRuleCommand.RequestSchema,
    responseSchema: UpdateEgressRuleCommand.ResponseSchema,
    requestMethod: UpdateEgressRuleCommand.endpointDetails.REQUEST_METHOD
})

export const useDeleteEgressRule = createMutationHook({
    endpoint: DeleteEgressRuleCommand.TSQ_url,
    routeParamsSchema: DeleteEgressRuleCommand.RequestSchema,
    responseSchema: DeleteEgressRuleCommand.ResponseSchema,
    requestMethod: DeleteEgressRuleCommand.endpointDetails.REQUEST_METHOD
})

export const useReorderEgressRules = createMutationHook({
    endpoint: ReorderEgressRulesCommand.TSQ_url,
    bodySchema: ReorderEgressRulesCommand.RequestSchema,
    responseSchema: ReorderEgressRulesCommand.ResponseSchema,
    requestMethod: ReorderEgressRulesCommand.endpointDetails.REQUEST_METHOD
})

export const useTestEgressRule = createMutationHook({
    endpoint: TestEgressRuleCommand.TSQ_url,
    bodySchema: TestEgressRuleCommand.RequestSchema,
    responseSchema: TestEgressRuleCommand.ResponseSchema,
    requestMethod: TestEgressRuleCommand.endpointDetails.REQUEST_METHOD
})

export const useCreateProxySubscription = createMutationHook({
    endpoint: CreateProxySubscriptionCommand.TSQ_url,
    bodySchema: CreateProxySubscriptionCommand.RequestSchema,
    responseSchema: CreateProxySubscriptionCommand.ResponseSchema,
    requestMethod: CreateProxySubscriptionCommand.endpointDetails.REQUEST_METHOD
})

export const useSyncProxySubscription = createMutationHook({
    endpoint: SyncProxySubscriptionCommand.TSQ_url,
    routeParamsSchema: SyncProxySubscriptionCommand.RequestSchema,
    responseSchema: SyncProxySubscriptionCommand.ResponseSchema,
    requestMethod: SyncProxySubscriptionCommand.endpointDetails.REQUEST_METHOD
})

export const useUpdateProxySubscription = createMutationHook({
    endpoint: UpdateProxySubscriptionCommand.TSQ_url,
    bodySchema: UpdateProxySubscriptionCommand.RequestSchema,
    routeParamsSchema: UpdateProxySubscriptionCommand.RouteSchema,
    responseSchema: UpdateProxySubscriptionCommand.ResponseSchema,
    requestMethod: UpdateProxySubscriptionCommand.endpointDetails.REQUEST_METHOD
})

export const useDeleteProxySubscription = createMutationHook({
    endpoint: DeleteProxySubscriptionCommand.TSQ_url,
    routeParamsSchema: DeleteProxySubscriptionCommand.RequestSchema,
    responseSchema: DeleteProxySubscriptionCommand.ResponseSchema,
    requestMethod: DeleteProxySubscriptionCommand.endpointDetails.REQUEST_METHOD
})

export const useCreateProxyOutbound = createMutationHook({
    endpoint: CreateProxyOutboundCommand.TSQ_url,
    bodySchema: CreateProxyOutboundCommand.RequestSchema,
    responseSchema: CreateProxyOutboundCommand.ResponseSchema,
    requestMethod: CreateProxyOutboundCommand.endpointDetails.REQUEST_METHOD
})

export const useUpdateProxyOutbound = createMutationHook({
    endpoint: UpdateProxyOutboundCommand.TSQ_url,
    bodySchema: UpdateProxyOutboundCommand.RequestSchema,
    responseSchema: UpdateProxyOutboundCommand.ResponseSchema,
    requestMethod: UpdateProxyOutboundCommand.endpointDetails.REQUEST_METHOD
})

export const useDeleteProxyOutbound = createMutationHook({
    endpoint: DeleteProxyOutboundCommand.TSQ_url,
    routeParamsSchema: DeleteProxyOutboundCommand.RequestSchema,
    responseSchema: DeleteProxyOutboundCommand.ResponseSchema,
    requestMethod: DeleteProxyOutboundCommand.endpointDetails.REQUEST_METHOD
})

export const useTestProxyOutbound = createMutationHook({
    endpoint: TestProxyOutboundCommand.TSQ_url,
    bodySchema: TestProxyOutboundCommand.RequestSchema,
    responseSchema: TestProxyOutboundCommand.ResponseSchema,
    requestMethod: TestProxyOutboundCommand.endpointDetails.REQUEST_METHOD
})

export const useCreateProxyGroup = createMutationHook({
    endpoint: CreateProxyGroupCommand.TSQ_url,
    bodySchema: CreateProxyGroupCommand.RequestSchema,
    responseSchema: CreateProxyGroupCommand.ResponseSchema,
    requestMethod: CreateProxyGroupCommand.endpointDetails.REQUEST_METHOD
})

export const useUpdateProxyGroup = createMutationHook({
    endpoint: UpdateProxyGroupCommand.TSQ_url,
    bodySchema: UpdateProxyGroupCommand.RequestSchema,
    responseSchema: UpdateProxyGroupCommand.ResponseSchema,
    requestMethod: UpdateProxyGroupCommand.endpointDetails.REQUEST_METHOD
})

export const useDeleteProxyGroup = createMutationHook({
    endpoint: DeleteProxyGroupCommand.TSQ_url,
    routeParamsSchema: DeleteProxyGroupCommand.RequestSchema,
    responseSchema: DeleteProxyGroupCommand.ResponseSchema,
    requestMethod: DeleteProxyGroupCommand.endpointDetails.REQUEST_METHOD
})

export const useExportEgressConfig = createMutationHook({
    endpoint: ExportEgressConfigCommand.TSQ_url,
    bodySchema: ExportEgressConfigCommand.RequestSchema,
    responseSchema: ExportEgressConfigCommand.ResponseSchema,
    requestMethod: ExportEgressConfigCommand.endpointDetails.REQUEST_METHOD
})

export const useImportEgressConfig = createMutationHook({
    endpoint: ImportEgressConfigCommand.TSQ_url,
    bodySchema: ImportEgressConfigCommand.RequestSchema,
    responseSchema: ImportEgressConfigCommand.ResponseSchema,
    requestMethod: ImportEgressConfigCommand.endpointDetails.REQUEST_METHOD
})

export const useImportEgressRuleList = createMutationHook({
    endpoint: ImportEgressRuleListCommand.TSQ_url,
    bodySchema: ImportEgressRuleListCommand.RequestSchema,
    responseSchema: ImportEgressRuleListCommand.ResponseSchema,
    requestMethod: ImportEgressRuleListCommand.endpointDetails.REQUEST_METHOD
})
