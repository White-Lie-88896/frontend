import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Code,
    FileButton,
    Group,
    LoadingOverlay,
    Modal,
    MultiSelect,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import {
    PiArrowDown,
    PiArrowUp,
    PiDownloadSimple,
    PiFolderPlus,
    PiGear,
    PiListPlus,
    PiPencilSimple,
    PiPlayCircle,
    PiShieldCheck,
    PiShieldWarning,
    PiTrash,
    PiUploadSimple
} from 'react-icons/pi'
import { notifications } from '@mantine/notifications'
import { DateTimePicker } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { modals } from '@mantine/modals'
import { useForm } from '@mantine/form'
import { useEffect, useState } from 'react'

import {
    useCreateEgressRule,
    useDeleteEgressRule,
    useExportEgressConfig,
    useGetEgressRules,
    useGetProxyGroups,
    useGetProxyOutbounds,
    useGetUsersV2,
    useImportEgressConfig,
    useImportEgressRuleList,
    useReorderEgressRules,
    useTestEgressRule,
    useUpdateEgressRule
} from '@shared/api/hooks'
import { PageHeaderShared } from '@shared/ui/page-header/page-header.shared'
import { EgressConfigBackupSchema } from '@remnawave/backend-contract'
import { prettyBytesUtil } from '@shared/utils/bytes'
import { Page } from '@shared/ui'

import { ProxyOutboundsPanel } from './proxy-outbounds.panel'
import { ProxyGroupsPanel } from './proxy-groups.panel'

interface EgressRule {
    action: 'BLOCK' | 'DIRECT' | 'PROXY'
    createdAt: Date
    description: null | string
    expiresAt?: Date | null
    isEnabled: boolean
    name: string
    pattern: string
    proxyGroupUuid?: null | string
    proxyOutboundUuid?: null | string
    targetUsers?: null | number[]
    trafficDownlinkBytes: string
    trafficTotalBytes: string
    trafficUplinkBytes: string
    updatedAt: Date
    uuid: string
    validFrom?: Date | null
    viewPosition: number
}

interface ImportRuleListPreview {
    created: number
    duplicates: number
    existingConflicts: number
    internalDuplicates: number
    parsed: number
    preview: {
        duplicate: boolean
        name: string
        pattern: string
    }[]
    skipped: number
    unsupported: number
}

const getActionColor = (action: EgressRule['action']) => {
    if (action === 'BLOCK') return 'red'
    if (action === 'PROXY') return 'violet'
    return 'teal'
}

const getProxyTarget = (rule: EgressRule): null | string => {
    if (rule.proxyGroupUuid) return `group:${rule.proxyGroupUuid}`
    if (rule.proxyOutboundUuid) return `outbound:${rule.proxyOutboundUuid}`
    return null
}

const getRuleLifecycle = (rule: EgressRule) => {
    const now = Date.now()
    if (rule.validFrom && new Date(rule.validFrom).getTime() > now) {
        return { color: 'blue', label: 'Scheduled' }
    }
    if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= now) {
        return { color: 'gray', label: 'Expired' }
    }
    return {
        color: rule.isEnabled ? 'teal' : 'gray',
        label: rule.isEnabled ? 'Active' : 'Disabled'
    }
}

const RULE_PRESETS = [
    {
        name: 'YouTube',
        content: `DOMAIN-SUFFIX,youtube.com
DOMAIN-SUFFIX,youtu.be
DOMAIN-SUFFIX,googlevideo.com
DOMAIN-SUFFIX,ytimg.com
DOMAIN-SUFFIX,youtube-nocookie.com`
    },
    {
        name: 'Google',
        content: `DOMAIN-SUFFIX,google.com
DOMAIN-SUFFIX,googleapis.com
DOMAIN-SUFFIX,gstatic.com
DOMAIN-SUFFIX,googleusercontent.com
DOMAIN-SUFFIX,googlevideo.com`
    },
    {
        name: 'AI',
        content: `DOMAIN-SUFFIX,openai.com
DOMAIN-SUFFIX,chatgpt.com
DOMAIN-SUFFIX,anthropic.com
DOMAIN-SUFFIX,claude.ai
DOMAIN-SUFFIX,perplexity.ai
DOMAIN-SUFFIX,x.ai
DOMAIN,gemini.google.com`
    },
    {
        name: 'Crypto',
        content: `DOMAIN-SUFFIX,binance.com
DOMAIN-SUFFIX,coinbase.com
DOMAIN-SUFFIX,okx.com
DOMAIN-SUFFIX,bybit.com
DOMAIN-SUFFIX,kraken.com
DOMAIN-SUFFIX,coingecko.com
DOMAIN-SUFFIX,coinmarketcap.com`
    },
    {
        name: 'Microsoft',
        content:
            'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/refs/heads/master/Clash/Microsoft.list',
        sourceType: 'URL' as const
    }
]

export function EgressRulesPage() {
    const { t } = useTranslation()
    const { data: rulesData, isFetching, refetch } = useGetEgressRules()
    const { data: proxyOutboundsData, refetch: refetchProxyOutbounds } = useGetProxyOutbounds()
    const { data: proxyGroupsData, refetch: refetchProxyGroups } = useGetProxyGroups()

    const createMutation = useCreateEgressRule()
    const updateMutation = useUpdateEgressRule()
    const deleteMutation = useDeleteEgressRule()
    const reorderMutation = useReorderEgressRules()
    const testMutation = useTestEgressRule()
    const exportMutation = useExportEgressConfig()
    const importMutation = useImportEgressConfig()
    const importRuleListMutation = useImportEgressRuleList()

    const { data: usersResponse } = useGetUsersV2({ query: { start: 0, size: 1000 } })
    const usersList = usersResponse?.users ?? []
    const selectData = usersList.map((user) => ({
        value: String(user.id),
        label: user.username || `User #${user.id}`
    }))
    const proxyOutbounds = proxyOutboundsData ?? []
    const proxyGroups = proxyGroupsData ?? []
    const proxyTargetOptions = [
        ...proxyOutbounds
            .filter((outbound) => outbound.isEnabled)
            .map((outbound) => ({
                value: `outbound:${outbound.uuid}`,
                label: `Outbound · ${outbound.name}`
            })),
        ...proxyGroups
            .filter((group) => group.isEnabled)
            .map((group) => ({
                value: `group:${group.uuid}`,
                label: `Group · ${group.name} · ${group.mode}`
            }))
    ]

    const [modalOpened, setModalOpened] = useState(false)
    const [importListOpened, setImportListOpened] = useState(false)
    const [editingRule, setEditingRule] = useState<EgressRule | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [importPreview, setImportPreview] = useState<ImportRuleListPreview | null>(null)

    const importListForm = useForm({
        initialValues: {
            sourceType: 'URL' as 'TEXT' | 'URL',
            source: '',
            namePrefix: '',
            action: 'PROXY' as 'BLOCK' | 'DIRECT' | 'PROXY',
            isEnabled: true,
            targetUsers: [] as string[],
            proxyTarget: null as null | string
        },
        validate: {
            source: (value) => (value.trim() ? null : '请输入规则链接或规则文本'),
            namePrefix: (value) => (value.trim() ? null : '请输入规则名称前缀'),
            proxyTarget: (value, values) =>
                values.action === 'PROXY' && !value ? '请选择代理出口或代理组' : null
        }
    })

    const importListTargetUsersKey = importListForm.values.targetUsers.join(',')

    useEffect(() => {
        setImportPreview(null)
    }, [
        importListForm.values.action,
        importListForm.values.isEnabled,
        importListForm.values.namePrefix,
        importListForm.values.proxyTarget,
        importListForm.values.source,
        importListForm.values.sourceType,
        importListTargetUsersKey
    ])

    const applyPreset = (preset: (typeof RULE_PRESETS)[number]) => {
        importListForm.setValues({
            sourceType: preset.sourceType ?? 'TEXT',
            source: preset.content,
            namePrefix: preset.name
        })
        setImportPreview(null)
    }

    const handleImportSourceTypeChange = (value: null | string) => {
        const sourceType = value === 'TEXT' ? 'TEXT' : 'URL'
        if (sourceType === importListForm.values.sourceType) return

        importListForm.setValues({
            sourceType,
            source: ''
        })
        setImportPreview(null)
    }

    const openImportListModal = () => {
        importListForm.reset()
        setImportPreview(null)
        setImportListOpened(true)
    }

    const closeImportListModal = () => {
        setImportListOpened(false)
        importListForm.reset()
        setImportPreview(null)
    }

    const handlePreviewImportRuleList = async () => {
        const validation = importListForm.validate()
        if (validation.hasErrors) return

        const values = importListForm.values
        const proxyOutboundUuid =
            values.action === 'PROXY' && values.proxyTarget?.startsWith('outbound:')
                ? values.proxyTarget.substring(9)
                : null
        const proxyGroupUuid =
            values.action === 'PROXY' && values.proxyTarget?.startsWith('group:')
                ? values.proxyTarget.substring(6)
                : null

        try {
            const result = await importRuleListMutation.mutateAsync({
                variables: {
                    sourceType: values.sourceType,
                    source: values.source.trim(),
                    namePrefix: values.namePrefix.trim(),
                    action: values.action,
                    dryRun: true,
                    isEnabled: values.isEnabled,
                    targetUsers: values.targetUsers.map(Number),
                    proxyOutboundUuid,
                    proxyGroupUuid
                }
            })
            setImportPreview(result)
        } catch {
            notifications.show({
                color: 'red',
                title: '规则预览失败',
                message: '请检查链接、文本格式和代理出口设置。'
            })
        }
    }

    const handleImportRuleList = async (values: typeof importListForm.values) => {
        if (!importPreview || importPreview.parsed - importPreview.existingConflicts <= 0) {
            notifications.show({
                color: 'yellow',
                title: '请先预览规则',
                message: '确认预览结果后再导入，已有规则会跳过且不会覆盖。'
            })
            return
        }

        const proxyOutboundUuid =
            values.action === 'PROXY' && values.proxyTarget?.startsWith('outbound:')
                ? values.proxyTarget.substring(9)
                : null
        const proxyGroupUuid =
            values.action === 'PROXY' && values.proxyTarget?.startsWith('group:')
                ? values.proxyTarget.substring(6)
                : null
        try {
            const result = await importRuleListMutation.mutateAsync({
                variables: {
                    sourceType: values.sourceType,
                    source: values.source.trim(),
                    namePrefix: values.namePrefix.trim(),
                    action: values.action,
                    dryRun: false,
                    isEnabled: values.isEnabled,
                    targetUsers: values.targetUsers.map(Number),
                    proxyOutboundUuid,
                    proxyGroupUuid
                }
            })
            notifications.show({
                color: 'teal',
                title: '规则导入完成',
                message: `新增 ${result.created} 条，跳过 ${result.skipped} 条，不支持 ${result.unsupported} 条`
            })
            closeImportListModal()
            refetch()
        } catch {
            notifications.show({
                color: 'red',
                title: '规则导入失败',
                message: '请检查链接、文本格式和代理出口设置'
            })
        }
    }

    // 测试规则相关状态
    const [testPattern, setTestPattern] = useState('')
    const [testResult, setTestResult] = useState<null | {
        matched: boolean
        rule: EgressRule | null
    }>(null)

    const form = useForm({
        initialValues: {
            name: '',
            description: '',
            pattern: '',
            action: 'BLOCK' as 'BLOCK' | 'DIRECT' | 'PROXY',
            isEnabled: true,
            targetUsers: [] as string[],
            proxyTarget: null as null | string,
            validFrom: null as Date | null,
            expiresAt: null as Date | null
        },
        validate: {
            name: (value) => (value.trim() ? null : 'Name is required'),
            pattern: (value) => (value.trim() ? null : 'Pattern is required'),
            proxyTarget: (value, values) =>
                values.action === 'PROXY' && !value ? 'Proxy target is required' : null
        }
    })

    const rules = (rulesData ?? []) as EgressRule[]
    const normalizedPattern = form.values.pattern.trim().toLowerCase()
    const selectedUsers = new Set(form.values.targetUsers)
    const conflictingRules = normalizedPattern
        ? rules.filter((rule) => {
            if (rule.uuid === editingRule?.uuid || !rule.isEnabled) return false
            if (rule.pattern.trim().toLowerCase() !== normalizedPattern) return false
            const ruleUsers = Array.isArray(rule.targetUsers) ? rule.targetUsers.map(String) : []
            return (
                ruleUsers.length === 0 ||
                  selectedUsers.size === 0 ||
                  ruleUsers.some((id) => selectedUsers.has(id))
            )
        })
        : []

    const openCreateModal = () => {
        setEditingRule(null)
        form.reset()
        setModalOpened(true)
    }

    const openEditModal = (rule: EgressRule) => {
        setEditingRule(rule)
        form.setValues({
            name: rule.name,
            description: rule.description ?? '',
            pattern: rule.pattern,
            action: rule.action,
            isEnabled: rule.isEnabled,
            targetUsers: (Array.isArray(rule.targetUsers) ? rule.targetUsers : []).map(String),
            proxyTarget: getProxyTarget(rule),
            validFrom: rule.validFrom ? new Date(rule.validFrom) : null,
            expiresAt: rule.expiresAt ? new Date(rule.expiresAt) : null
        })
        setModalOpened(true)
    }

    const handleSubmit = async (values: typeof form.values) => {
        setIsSubmitting(true)
        const payload = {
            ...values,
            targetUsers: Array.isArray(values.targetUsers) ? values.targetUsers.map(Number) : [],
            proxyOutboundUuid:
                values.action === 'PROXY' && values.proxyTarget?.startsWith('outbound:')
                    ? values.proxyTarget.substring(9)
                    : null,
            proxyGroupUuid:
                values.action === 'PROXY' && values.proxyTarget?.startsWith('group:')
                    ? values.proxyTarget.substring(6)
                    : null,
            validFrom: values.validFrom,
            expiresAt: values.expiresAt
        }
        try {
            if (editingRule) {
                await updateMutation.mutateAsync({
                    variables: {
                        uuid: editingRule.uuid,
                        ...payload
                    }
                })
                notifications.show({
                    title: t('common.success'),
                    message: t('common.save-changes'),
                    color: 'teal'
                })
            } else {
                await createMutation.mutateAsync({
                    variables: payload
                })
                notifications.show({
                    title: t('common.success'),
                    message: t('common.success'),
                    color: 'teal'
                })
            }
            setModalOpened(false)
            refetch()
        } catch {
            notifications.show({
                title: t('config-editor-actions.feature.error'),
                message: 'Failed to save rule',
                color: 'red'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = (uuid: string) =>
        modals.openConfirmModal({
            centered: true,
            children: t('common.confirm-action-description'),
            confirmProps: { color: 'red' },
            labels: {
                cancel: t('common.cancel'),
                confirm: t('common.delete')
            },
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync({
                        route: { uuid }
                    })
                    notifications.show({
                        color: 'teal',
                        message: t('common.delete'),
                        title: t('common.success')
                    })
                    refetch()
                } catch {
                    notifications.show({
                        color: 'red',
                        message: 'Failed to delete rule',
                        title: t('config-editor-actions.feature.error')
                    })
                }
            },
            title: t('common.delete')
        })

    const handleMove = async (index: number, direction: 'down' | 'up') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= rules.length) return

        const newRules = [...rules]
        const temp = newRules[index]
        newRules[index] = newRules[targetIndex]
        newRules[targetIndex] = temp

        const uuids = newRules.map((r) => r.uuid)
        try {
            await reorderMutation.mutateAsync({
                variables: { uuids }
            })
            notifications.show({
                title: t('common.success'),
                message: t('egress-rules.reordered'),
                color: 'teal'
            })
            refetch()
        } catch {
            notifications.show({
                title: t('config-editor-actions.feature.error'),
                message: 'Failed to reorder rules',
                color: 'red'
            })
        }
    }

    const handleToggleEnable = async (rule: EgressRule, checked: boolean) => {
        try {
            await updateMutation.mutateAsync({
                variables: {
                    uuid: rule.uuid,
                    name: rule.name,
                    description: rule.description,
                    pattern: rule.pattern,
                    action: rule.action,
                    isEnabled: checked,
                    targetUsers: Array.isArray(rule.targetUsers) ? rule.targetUsers : null,
                    proxyOutboundUuid: rule.proxyOutboundUuid ?? null,
                    proxyGroupUuid: rule.proxyGroupUuid ?? null,
                    validFrom: rule.validFrom ?? null,
                    expiresAt: rule.expiresAt ?? null
                }
            })
            refetch()
        } catch {
            notifications.show({
                title: t('config-editor-actions.feature.error'),
                message: 'Failed to update rule status',
                color: 'red'
            })
        }
    }

    const handleTestRule = async () => {
        if (!testPattern.trim()) return

        try {
            const res = await testMutation.mutateAsync({
                variables: { pattern: testPattern }
            })
            setTestResult(res as { matched: boolean; rule: EgressRule | null })
        } catch {
            notifications.show({
                title: t('config-editor-actions.feature.error'),
                message: 'Failed to test pattern matching',
                color: 'red'
            })
        }
    }

    const downloadBackup = async (includeSecrets: boolean) => {
        try {
            const backup = await exportMutation.mutateAsync({
                variables: { includeSecrets }
            })
            const blob = new Blob([JSON.stringify(backup, null, 2)], {
                type: 'application/json'
            })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `remnawave-egress-${includeSecrets ? 'private' : 'redacted'}-${new Date().toISOString().slice(0, 10)}.json`
            anchor.click()
            URL.revokeObjectURL(url)
        } catch {
            notifications.show({
                color: 'red',
                message: 'Unable to export configuration.',
                title: 'Export failed'
            })
        }
    }

    const exportWithSecrets = () =>
        modals.openConfirmModal({
            centered: true,
            children:
                'This file contains proxy passwords, UUIDs and Reality credentials. Store it securely.',
            confirmProps: { color: 'red' },
            labels: { cancel: 'Cancel', confirm: 'Export private backup' },
            onConfirm: () => downloadBackup(true),
            title: 'Export sensitive configuration'
        })

    const importBackup = async (file: File | null) => {
        if (!file) return
        try {
            const backup = EgressConfigBackupSchema.parse(JSON.parse(await file.text()))
            const result = await importMutation.mutateAsync({ variables: { backup } })
            await Promise.all([refetch(), refetchProxyOutbounds(), refetchProxyGroups()])
            notifications.show({
                color: 'teal',
                message: `Imported ${result.rules} rules, ${result.proxyOutbounds} outbounds and ${result.proxyGroups} groups.`,
                title: 'Import complete'
            })
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error instanceof Error ? error.message : 'Invalid backup file.',
                title: 'Import failed'
            })
        }
    }

    const importablePreviewCount = importPreview
        ? Math.max(importPreview.parsed - importPreview.existingConflicts, 0)
        : 0

    return (
        <Page title={t('egress-rules.title')}>
            <Stack gap="lg">
                <PageHeaderShared
                    description={t('egress-rules.description')}
                    title={t('egress-rules.title')}
                />

                <Group justify="space-between">
                    <Group gap="xs">
                        <Button
                            leftSection={<PiFolderPlus size={18} />}
                            onClick={openCreateModal}
                            variant="filled"
                        >
                            {t('egress-rules.new-rule')}
                        </Button>
                        <Button
                            leftSection={<PiListPlus size={18} />}
                            onClick={openImportListModal}
                            variant="light"
                        >
                            批量导入规则
                        </Button>
                    </Group>
                    <Group gap="xs">
                        <FileButton accept="application/json,.json" onChange={importBackup}>
                            {(props) => (
                                <Button
                                    leftSection={<PiUploadSimple />}
                                    loading={importMutation.isPending}
                                    variant="light"
                                    {...props}
                                >
                                    Import
                                </Button>
                            )}
                        </FileButton>
                        <Button
                            leftSection={<PiDownloadSimple />}
                            loading={exportMutation.isPending}
                            onClick={() => downloadBackup(false)}
                            variant="light"
                        >
                            Export
                        </Button>
                        <Button color="red" onClick={exportWithSecrets} variant="subtle">
                            Export with secrets
                        </Button>
                    </Group>
                </Group>

                <ProxyOutboundsPanel />
                <ProxyGroupsPanel />

                <Group align="flex-start" grow wrap="wrap">
                    {/* 规则管理面板 */}
                    <Paper p="md" pos="relative" radius="sm" style={{ flex: 2 }} withBorder>
                        <LoadingOverlay visible={isFetching || reorderMutation.isPending} />
                        <Table.ScrollContainer minWidth={600}>
                            <Table highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th w={80}>Priority</Table.Th>
                                        <Table.Th>Name</Table.Th>
                                        <Table.Th>Pattern</Table.Th>
                                        <Table.Th w={150}>Scope</Table.Th>
                                        <Table.Th w={120}>Action</Table.Th>
                                        <Table.Th w={140}>Traffic</Table.Th>
                                        <Table.Th w={100}>Status</Table.Th>
                                        <Table.Th w={100} />
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {rules.map((rule, index) => (
                                        <Table.Tr key={rule.uuid}>
                                            <Table.Td>
                                                <Group gap={4} wrap="nowrap">
                                                    <Tooltip label="Move Up">
                                                        <ActionIcon
                                                            disabled={index === 0}
                                                            onClick={() => handleMove(index, 'up')}
                                                            size="sm"
                                                            variant="subtle"
                                                        >
                                                            <PiArrowUp size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Move Down">
                                                        <ActionIcon
                                                            disabled={index === rules.length - 1}
                                                            onClick={() =>
                                                                handleMove(index, 'down')
                                                            }
                                                            size="sm"
                                                            variant="subtle"
                                                        >
                                                            <PiArrowDown size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text fw={500} size="sm">
                                                    {rule.name}
                                                </Text>
                                                {rule.description && (
                                                    <Text c="dimmed" size="xs">
                                                        {rule.description}
                                                    </Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Code
                                                    color="dark"
                                                    style={{ wordBreak: 'break-all' }}
                                                >
                                                    {rule.pattern}
                                                </Code>
                                            </Table.Td>
                                            <Table.Td>
                                                {!rule.targetUsers ||
                                                !Array.isArray(rule.targetUsers) ||
                                                rule.targetUsers.length === 0 ? (
                                                        <Badge color="blue" variant="outline">
                                                            Global
                                                        </Badge>
                                                    ) : (
                                                        <Group gap={4}>
                                                            {rule.targetUsers.map((tId) => {
                                                                const user = usersList.find(
                                                                    (candidate) =>
                                                                        Number(candidate.id) ===
                                                                    Number(tId)
                                                                )
                                                                return (
                                                                    <Badge
                                                                        color="grape"
                                                                        key={tId}
                                                                        variant="light"
                                                                    >
                                                                        {user?.username || `#${tId}`}
                                                                    </Badge>
                                                                )
                                                            })}
                                                        </Group>
                                                    )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    color={getActionColor(rule.action)}
                                                    variant="light"
                                                >
                                                    {rule.action === 'PROXY'
                                                        ? `PROXY · ${
                                                            rule.proxyGroupUuid
                                                                ? (proxyGroups.find(
                                                                    (group) =>
                                                                        group.uuid ===
                                                                            rule.proxyGroupUuid
                                                                )?.name ?? 'Missing group')
                                                                : (proxyOutbounds.find(
                                                                    (outbound) =>
                                                                        outbound.uuid ===
                                                                            rule.proxyOutboundUuid
                                                                )?.name ?? 'Missing outbound')
                                                        }`
                                                        : rule.action}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text fw={500} size="sm">
                                                    {prettyBytesUtil(
                                                        Number(rule.trafficTotalBytes || 0)
                                                    ) || '0 B'}
                                                </Text>
                                                <Text c="dimmed" size="xs">
                                                    ↑{' '}
                                                    {prettyBytesUtil(
                                                        Number(rule.trafficUplinkBytes || 0)
                                                    ) || '0 B'}{' '}
                                                    ↓{' '}
                                                    {prettyBytesUtil(
                                                        Number(rule.trafficDownlinkBytes || 0)
                                                    ) || '0 B'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Stack gap={4}>
                                                    <Switch
                                                        checked={rule.isEnabled}
                                                        onChange={(event) =>
                                                            handleToggleEnable(
                                                                rule,
                                                                event.currentTarget.checked
                                                            )
                                                        }
                                                        size="sm"
                                                    />
                                                    <Badge
                                                        color={getRuleLifecycle(rule).color}
                                                        size="xs"
                                                        variant="light"
                                                    >
                                                        {getRuleLifecycle(rule).label}
                                                    </Badge>
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={8} justify="flex-end">
                                                    <Tooltip label={t('common.edit')}>
                                                        <ActionIcon
                                                            onClick={() => openEditModal(rule)}
                                                            variant="subtle"
                                                        >
                                                            <PiPencilSimple size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label={t('common.delete')}>
                                                        <ActionIcon
                                                            color="red"
                                                            onClick={() => handleDelete(rule.uuid)}
                                                            variant="subtle"
                                                        >
                                                            <PiTrash size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                    {!isFetching && !rules.length && (
                                        <Table.Tr>
                                            <Table.Td colSpan={8}>
                                                <Text c="dimmed" py="xl" ta="center">
                                                    {t('egress-rules.empty')}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Paper>

                    {/* 命中匹配测试小工具 */}
                    <Stack gap="md" style={{ flex: 1 }}>
                        <Card radius="sm" withBorder>
                            <Card.Section inheritPadding py="xs" withBorder>
                                <Group justify="space-between">
                                    <Text fw={500} size="sm">
                                        {t('egress-rules.test-rule')}
                                    </Text>
                                    <ThemeIcon color="blue" size="sm" variant="light">
                                        <PiGear size={16} />
                                    </ThemeIcon>
                                </Group>
                            </Card.Section>

                            <Stack gap="sm" mt="md">
                                <TextInput
                                    description="Enter domain (google.com), IP (1.1.1.1), Port (80) or Protocol (bittorrent)"
                                    label={t('egress-rules.test-pattern')}
                                    onChange={(e) => setTestPattern(e.currentTarget.value)}
                                    placeholder="e.g. google.com"
                                    value={testPattern}
                                />
                                <Button
                                    leftSection={<PiPlayCircle size={18} />}
                                    loading={testMutation.isPending}
                                    onClick={handleTestRule}
                                    variant="light"
                                >
                                    {t('egress-rules.test')}
                                </Button>

                                {testResult && (
                                    <Paper mt="sm" p="sm" radius="xs" withBorder>
                                        <Stack gap="xs">
                                            <Group gap="xs">
                                                {testResult.matched ? (
                                                    <>
                                                        <ThemeIcon
                                                            color="red"
                                                            size="md"
                                                            variant="light"
                                                        >
                                                            <PiShieldWarning size={18} />
                                                        </ThemeIcon>
                                                        <Text fw={600} size="sm">
                                                            {t('egress-rules.matched')}
                                                        </Text>
                                                        <Badge color="red" variant="light">
                                                            {testResult.rule?.action}
                                                        </Badge>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ThemeIcon
                                                            color="teal"
                                                            size="md"
                                                            variant="light"
                                                        >
                                                            <PiShieldCheck size={18} />
                                                        </ThemeIcon>
                                                        <Text fw={600} size="sm">
                                                            {t('egress-rules.not-matched')}
                                                        </Text>
                                                        <Badge color="teal" variant="light">
                                                            ALLOW
                                                        </Badge>
                                                    </>
                                                )}
                                            </Group>

                                            {testResult.matched && testResult.rule && (
                                                <Stack gap={4} mt="xs">
                                                    <Text size="xs">
                                                        <b>Rule Name:</b> {testResult.rule.name}
                                                    </Text>
                                                    <Text size="xs">
                                                        <b>Rule Pattern:</b>{' '}
                                                        <Code>{testResult.rule.pattern}</Code>
                                                    </Text>
                                                    {testResult.rule.description && (
                                                        <Text size="xs">
                                                            <b>Description:</b>{' '}
                                                            {testResult.rule.description}
                                                        </Text>
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        </Card>
                    </Stack>
                </Group>
            </Stack>

            <Modal
                onClose={() => setModalOpened(false)}
                opened={modalOpened}
                size="md"
                title={editingRule ? t('egress-rules.edit-rule') : t('egress-rules.new-rule')}
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label={t('egress-rules.rule-name')}
                            placeholder="e.g. Block Google"
                            required
                            {...form.getInputProps('name')}
                        />
                        <Textarea
                            label={t('egress-rules.rule-description')}
                            placeholder="e.g. Block all connection to Google services"
                            {...form.getInputProps('description')}
                        />
                        <TextInput
                            description="Supports geosite:cn, geoip:cn, domain:google.com, keyword:crypto, ip:1.1.1.1, port:80, protocol:bittorrent, 10.0.0.0/8"
                            label={t('egress-rules.rule-pattern')}
                            placeholder="e.g. domain:google.com"
                            required
                            {...form.getInputProps('pattern')}
                        />
                        {conflictingRules.length > 0 && (
                            <Paper p="sm" withBorder>
                                <Text c="orange" fw={600} size="sm">
                                    This rule overlaps existing higher-priority rules:
                                </Text>
                                {conflictingRules.map((rule) => (
                                    <Text key={rule.uuid} size="xs">
                                        #{rule.viewPosition} {rule.name} ({rule.action})
                                    </Text>
                                ))}
                            </Paper>
                        )}
                        <Select
                            data={[
                                { value: 'BLOCK', label: 'BLOCK' },
                                { value: 'DIRECT', label: 'DIRECT' },
                                { value: 'PROXY', label: 'PROXY' }
                            ]}
                            label={t('egress-rules.rule-action')}
                            {...form.getInputProps('action')}
                        />
                        {form.values.action === 'PROXY' && (
                            <Select
                                data={proxyTargetOptions}
                                description="Traffic matching this rule will use an outbound or proxy group."
                                label="Proxy target"
                                placeholder="Select an enabled outbound or group"
                                required
                                searchable
                                {...form.getInputProps('proxyTarget')}
                            />
                        )}
                        <MultiSelect
                            clearable
                            data={selectData}
                            label="Target Users (Optional)"
                            placeholder="Select users to apply this rule to"
                            searchable
                            {...form.getInputProps('targetUsers')}
                        />
                        <Group grow>
                            <DateTimePicker
                                clearable
                                label="Starts at"
                                placeholder="Immediately"
                                {...form.getInputProps('validFrom')}
                            />
                            <DateTimePicker
                                clearable
                                label="Expires at"
                                placeholder="Never"
                                {...form.getInputProps('expiresAt')}
                            />
                        </Group>
                        <Switch
                            checked={form.values.isEnabled}
                            label={t('egress-rules.rule-is-enabled')}
                            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button onClick={() => setModalOpened(false)} variant="default">
                                {t('common.cancel')}
                            </Button>
                            <Button loading={isSubmitting} type="submit">
                                {t('common.save')}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                onClose={closeImportListModal}
                opened={importListOpened}
                size="lg"
                title="批量导入出口规则"
            >
                <form onSubmit={importListForm.onSubmit(handleImportRuleList)}>
                    <Stack gap="md">
                        <div>
                            <Text fw={600} mb={6} size="sm">
                                常用规则
                            </Text>
                            <Group gap="xs" wrap="wrap">
                                {RULE_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.name}
                                        onClick={() => applyPreset(preset)}
                                        size="xs"
                                        type="button"
                                        variant="default"
                                    >
                                        {preset.name}
                                    </Button>
                                ))}
                            </Group>
                        </div>

                        <Select
                            data={[
                                { value: 'URL', label: '规则链接' },
                                { value: 'TEXT', label: '粘贴规则文本' }
                            ]}
                            label="导入方式"
                            onChange={handleImportSourceTypeChange}
                            value={importListForm.values.sourceType}
                        />

                        {importListForm.values.sourceType === 'URL' ? (
                            <TextInput
                                description="支持 ACL4SSR / Clash 文本规则链接"
                                label="规则链接"
                                placeholder="https://example.com/rules.list"
                                required
                                {...importListForm.getInputProps('source')}
                            />
                        ) : (
                            <Textarea
                                autosize
                                description="每行一条，支持 DOMAIN-SUFFIX、DOMAIN-KEYWORD、IP-CIDR、GEOIP 等格式"
                                label="规则文本"
                                maxRows={14}
                                minRows={7}
                                placeholder={'DOMAIN-SUFFIX,youtube.com\nDOMAIN-KEYWORD,google'}
                                required
                                {...importListForm.getInputProps('source')}
                            />
                        )}

                        <TextInput
                            description="生成的规则将以此前缀命名"
                            label="名称前缀"
                            placeholder="例如 Microsoft"
                            required
                            {...importListForm.getInputProps('namePrefix')}
                        />

                        <Select
                            data={[
                                { value: 'BLOCK', label: 'BLOCK' },
                                { value: 'DIRECT', label: 'DIRECT' },
                                { value: 'PROXY', label: 'PROXY' }
                            ]}
                            label="规则动作"
                            {...importListForm.getInputProps('action')}
                        />

                        {importListForm.values.action === 'PROXY' && (
                            <Select
                                data={proxyTargetOptions}
                                label="代理出口"
                                placeholder="选择一个出口或代理组"
                                required
                                searchable
                                {...importListForm.getInputProps('proxyTarget')}
                            />
                        )}

                        <MultiSelect
                            clearable
                            data={selectData}
                            label="目标用户（可选）"
                            placeholder="不选择则对所有用户生效"
                            searchable
                            {...importListForm.getInputProps('targetUsers')}
                        />

                        <Switch
                            checked={importListForm.values.isEnabled}
                            label="导入后立即启用"
                            {...importListForm.getInputProps('isEnabled', { type: 'checkbox' })}
                        />

                        {importPreview && (
                            <Paper p="sm" radius="sm" withBorder>
                                <Stack gap="sm">
                                    <Group gap="xs" wrap="wrap">
                                        <Badge color="blue" variant="light">
                                            解析 {importPreview.parsed}
                                        </Badge>
                                        <Badge color="teal" variant="light">
                                            可导入 {importablePreviewCount}
                                        </Badge>
                                        <Badge color="orange" variant="light">
                                            已有冲突 {importPreview.existingConflicts}
                                        </Badge>
                                        <Badge color="yellow" variant="light">
                                            列表内重复 {importPreview.internalDuplicates}
                                        </Badge>
                                        <Badge color="gray" variant="light">
                                            不支持 {importPreview.unsupported}
                                        </Badge>
                                    </Group>

                                    {(importPreview.existingConflicts > 0 ||
                                        importPreview.internalDuplicates > 0) && (
                                        <Text c="dimmed" size="xs">
                                            已存在的规则会跳过，不会覆盖；列表内部重复项已自动去重。
                                        </Text>
                                    )}

                                    <Table.ScrollContainer minWidth={520}>
                                        <Table striped>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>规则名称</Table.Th>
                                                    <Table.Th>匹配规则</Table.Th>
                                                    <Table.Th>状态</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {importPreview.preview.map((item) => (
                                                    <Table.Tr key={`${item.pattern}-${item.name}`}>
                                                        <Table.Td>
                                                            <Text lineClamp={1} size="xs">
                                                                {item.name}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Code>{item.pattern}</Code>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge
                                                                color={item.duplicate ? 'orange' : 'teal'}
                                                                size="xs"
                                                                variant="light"
                                                            >
                                                                {item.duplicate ? '已存在' : '将导入'}
                                                            </Badge>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Table.ScrollContainer>
                                </Stack>
                            </Paper>
                        )}

                        <Group justify="flex-end">
                            <Button
                                loading={importRuleListMutation.isPending}
                                onClick={handlePreviewImportRuleList}
                                type="button"
                                variant="light"
                            >
                                预览
                            </Button>
                            <Button onClick={closeImportListModal} variant="default">
                                取消
                            </Button>
                            <Button
                                disabled={
                                    !importPreview || importablePreviewCount <= 0
                                }
                                loading={importRuleListMutation.isPending}
                                type="submit"
                            >
                                确认导入
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Page>
    )
}
