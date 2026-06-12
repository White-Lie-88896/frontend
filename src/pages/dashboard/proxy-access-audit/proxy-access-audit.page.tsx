import {
    ActionIcon,
    Badge,
    Button,
    Code,
    Group,
    LoadingOverlay,
    Modal,
    Pagination,
    Paper,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Table,
    Tabs,
    Text,
    TextInput,
    Textarea,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import {
    PiBroom,
    PiChartBar,
    PiEye,
    PiFunnel,
    PiGlobeHemisphereWest,
    PiShieldWarning,
    PiTreeStructure,
    PiUserFocus,
    PiX
} from 'react-icons/pi'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import {
    ProxyAccessAlert,
    ProxyAccessAuditQuery,
    ProxyAccessLog,
    useCleanupProxyAccessAudit,
    useGetProxyAccessAlerts,
    useGetProxyAccessAuditSettings,
    useGetProxyAccessLogs,
    useGetProxyAccessRuleHits,
    useGetProxyAccessSummary,
    useGetProxyAccessTopDomains,
    useUpdateProxyAccessAuditSettings
} from '@shared/api/hooks'
import { PageHeaderShared } from '@shared/ui/page-header/page-header.shared'
import { prettyBytesUtil } from '@shared/utils/bytes'
import { Page } from '@shared/ui'

const PAGE_SIZE = 25

interface FilterValues {
    endTime: string
    nodeUuid: string
    outboundTag: string
    protocol: string
    ruleUuid: string
    startTime: string
    target: string
    targetPort: string
    user: string
}

interface SettingsDraft {
    aggregateOnly: boolean
    blacklistedHosts: string
    blacklistedIps: string
    distinctDomainThreshold: string
    distinctDomainWindowMinutes: string
    hideUsernames: boolean
    highRiskPorts: string
    isEnabled: boolean
    nodeSpikeMinBytes: string
    nodeSpikeMultiplier: string
    retentionDays: string
}

const emptyFilters: FilterValues = {
    user: '',
    target: '',
    nodeUuid: '',
    protocol: '',
    targetPort: '',
    outboundTag: '',
    ruleUuid: '',
    startTime: '',
    endTime: ''
}

const defaultSettingsDraft: SettingsDraft = {
    isEnabled: true,
    retentionDays: '30',
    hideUsernames: false,
    aggregateOnly: false,
    distinctDomainWindowMinutes: '10',
    distinctDomainThreshold: '50',
    highRiskPorts: '22,23,25,465,587,3389,5900,6379,9200,11211',
    nodeSpikeMultiplier: '3',
    nodeSpikeMinBytes: '1073741824',
    blacklistedHosts: '',
    blacklistedIps: ''
}

const alertTypeLabels: Record<ProxyAccessAlert['type'], string> = {
    DISTINCT_DOMAINS: '域名异常',
    HIGH_RISK_PORT: '高风险端口',
    NODE_TRAFFIC_SPIKE: '节点突增',
    BLACKLIST_HIT: '黑名单命中'
}

const alertSeverityColors: Record<ProxyAccessAlert['severity'], string> = {
    info: 'blue',
    warning: 'yellow',
    critical: 'red'
}

function formatBytes(value: string | null | undefined) {
    return prettyBytesUtil(value ?? '0', true) ?? '0'
}

function formatTime(value: Date | null | undefined) {
    return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
}

function parseStringList(value: string) {
    return value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
}

function parseNumberList(value: string) {
    return Array.from(
        new Set(
            parseStringList(value)
                .map((item) => Number(item))
                .filter((item) => Number.isInteger(item) && item > 0 && item <= 65535)
        )
    )
}

function StatPaper({
    icon,
    label,
    value
}: {
    icon: React.ReactNode
    label: string
    value: string
}) {
    return (
        <Paper p="md" radius="sm" withBorder>
            <Group gap="sm" wrap="nowrap">
                <ThemeIcon radius="sm" size="lg" variant="light">
                    {icon}
                </ThemeIcon>
                <Stack gap={2}>
                    <Text c="dimmed" size="xs">
                        {label}
                    </Text>
                    <Text fw={700} size="lg">
                        {value}
                    </Text>
                </Stack>
            </Group>
        </Paper>
    )
}

export function ProxyAccessAuditPage() {
    const [page, setPage] = useState(1)
    const [alertPage, setAlertPage] = useState(1)
    const [alertStatus, setAlertStatus] = useState('OPEN')
    const [filters, setFilters] = useState<FilterValues>(emptyFilters)
    const [appliedFilters, setAppliedFilters] = useState<FilterValues>(emptyFilters)
    const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(defaultSettingsDraft)
    const [details, setDetails] = useState<{
        title: string
        value: ProxyAccessAlert | ProxyAccessLog
    } | null>(null)

    const baseQuery = useMemo<Omit<ProxyAccessAuditQuery, 'size' | 'start'>>(
        () => ({
            user: appliedFilters.user || undefined,
            target: appliedFilters.target || undefined,
            nodeUuid: appliedFilters.nodeUuid || undefined,
            protocol: appliedFilters.protocol || undefined,
            targetPort: appliedFilters.targetPort ? Number(appliedFilters.targetPort) : undefined,
            outboundTag: appliedFilters.outboundTag || undefined,
            ruleUuid: appliedFilters.ruleUuid || undefined,
            startTime: appliedFilters.startTime
                ? dayjs(appliedFilters.startTime).toISOString()
                : undefined,
            endTime: appliedFilters.endTime
                ? dayjs(appliedFilters.endTime).toISOString()
                : undefined
        }),
        [appliedFilters]
    )

    const logsQuery = useMemo<ProxyAccessAuditQuery>(
        () => ({
            ...baseQuery,
            start: (page - 1) * PAGE_SIZE,
            size: PAGE_SIZE
        }),
        [baseQuery, page]
    )

    const alertsQuery = useMemo(
        () => ({
            start: (alertPage - 1) * PAGE_SIZE,
            size: PAGE_SIZE,
            startTime: baseQuery.startTime,
            endTime: baseQuery.endTime,
            user: baseQuery.user,
            nodeUuid: baseQuery.nodeUuid,
            target: baseQuery.target,
            status: alertStatus || undefined
        }),
        [alertPage, alertStatus, baseQuery]
    )

    const {
        data: logsData,
        isFetching: isLogsFetching,
        refetch: refetchLogs
    } = useGetProxyAccessLogs({ query: logsQuery })
    const { data: summaryData, refetch: refetchSummary } = useGetProxyAccessSummary({
        query: baseQuery
    })
    const {
        data: topDomainsData,
        isFetching: isTopDomainsFetching,
        refetch: refetchTopDomains
    } = useGetProxyAccessTopDomains({ query: { ...baseQuery, limit: 20 } })
    const {
        data: ruleHitsData,
        isFetching: isRuleHitsFetching,
        refetch: refetchRuleHits
    } = useGetProxyAccessRuleHits({ query: { ...baseQuery, limit: 20 } })
    const {
        data: alertsData,
        isFetching: isAlertsFetching,
        refetch: refetchAlerts
    } = useGetProxyAccessAlerts({ query: alertsQuery })
    const { data: settingsData, refetch: refetchSettings } = useGetProxyAccessAuditSettings()

    const updateSettingsMutation = useUpdateProxyAccessAuditSettings()
    const cleanupMutation = useCleanupProxyAccessAudit()

    useEffect(() => {
        if (!settingsData) return

        setSettingsDraft({
            isEnabled: settingsData.isEnabled,
            retentionDays: String(settingsData.retentionDays),
            hideUsernames: settingsData.hideUsernames,
            aggregateOnly: settingsData.aggregateOnly,
            distinctDomainWindowMinutes: String(settingsData.distinctDomainWindowMinutes),
            distinctDomainThreshold: String(settingsData.distinctDomainThreshold),
            highRiskPorts: settingsData.highRiskPorts.join(','),
            nodeSpikeMultiplier: String(settingsData.nodeSpikeMultiplier),
            nodeSpikeMinBytes: settingsData.nodeSpikeMinBytes,
            blacklistedHosts: settingsData.blacklistedHosts.join('\n'),
            blacklistedIps: settingsData.blacklistedIps.join('\n')
        })
    }, [settingsData])

    const refetchAuditData = async () => {
        await Promise.all([
            refetchLogs(),
            refetchSummary(),
            refetchTopDomains(),
            refetchRuleHits(),
            refetchAlerts(),
            refetchSettings()
        ])
    }

    const applyFilters = () => {
        setPage(1)
        setAlertPage(1)
        setAppliedFilters(filters)
    }

    const clearFilters = () => {
        setPage(1)
        setAlertPage(1)
        setFilters(emptyFilters)
        setAppliedFilters(emptyFilters)
    }

    const saveSettings = async () => {
        await updateSettingsMutation.mutateAsync({
            variables: {
                isEnabled: settingsDraft.isEnabled,
                retentionDays: Number(settingsDraft.retentionDays),
                hideUsernames: settingsDraft.hideUsernames,
                aggregateOnly: settingsDraft.aggregateOnly,
                distinctDomainWindowMinutes: Number(settingsDraft.distinctDomainWindowMinutes),
                distinctDomainThreshold: Number(settingsDraft.distinctDomainThreshold),
                highRiskPorts: parseNumberList(settingsDraft.highRiskPorts),
                nodeSpikeMultiplier: Number(settingsDraft.nodeSpikeMultiplier),
                nodeSpikeMinBytes: settingsDraft.nodeSpikeMinBytes,
                blacklistedHosts: parseStringList(settingsDraft.blacklistedHosts),
                blacklistedIps: parseStringList(settingsDraft.blacklistedIps)
            }
        })
        notifications.show({ color: 'teal', message: '访问审计设置已保存' })
        await refetchAuditData()
    }

    const cleanupByRetention = () => {
        modals.openConfirmModal({
            title: '清理访问日志',
            children: <Text size="sm">将按当前保留天数删除过期访问日志。</Text>,
            labels: { confirm: '清理', cancel: '取消' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                const result = await cleanupMutation.mutateAsync({
                    variables: {
                        retentionDays: Number(settingsDraft.retentionDays),
                        clearAlerts: true
                    }
                })
                notifications.show({
                    color: 'teal',
                    message: `已删除 ${result.deletedLogs} 条日志，${result.deletedAlerts} 条告警`
                })
                await refetchAuditData()
            }
        })
    }

    const cleanupAll = () => {
        modals.openConfirmModal({
            title: '清空访问日志',
            children: <Text size="sm">将清空全部访问日志和告警，此操作不可恢复。</Text>,
            labels: { confirm: '清空', cancel: '取消' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                const result = await cleanupMutation.mutateAsync({
                    variables: { deleteAll: true, clearAlerts: true }
                })
                notifications.show({
                    color: 'teal',
                    message: `已删除 ${result.deletedLogs} 条日志，${result.deletedAlerts} 条告警`
                })
                await refetchAuditData()
            }
        })
    }

    return (
        <Page title="访问审计">
            <Stack gap="md">
                <PageHeaderShared description="代理访问日志与异常情况" title="访问审计" />

                <Paper p="md" radius="sm" withBorder>
                    <Stack gap="sm">
                        <Group align="end" grow wrap="wrap">
                            <TextInput
                                label="用户"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        user: event.currentTarget.value
                                    }))
                                }
                                value={filters.user}
                            />
                            <TextInput
                                label="域名 / IP"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        target: event.currentTarget.value
                                    }))
                                }
                                value={filters.target}
                            />
                            <TextInput
                                label="节点 UUID"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        nodeUuid: event.currentTarget.value
                                    }))
                                }
                                value={filters.nodeUuid}
                            />
                            <TextInput
                                label="协议"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        protocol: event.currentTarget.value
                                    }))
                                }
                                value={filters.protocol}
                            />
                        </Group>

                        <Group align="end" grow wrap="wrap">
                            <TextInput
                                label="端口"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        targetPort: event.currentTarget.value
                                    }))
                                }
                                value={filters.targetPort}
                            />
                            <TextInput
                                label="出站"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        outboundTag: event.currentTarget.value
                                    }))
                                }
                                value={filters.outboundTag}
                            />
                            <TextInput
                                label="规则 UUID"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        ruleUuid: event.currentTarget.value
                                    }))
                                }
                                value={filters.ruleUuid}
                            />
                            <TextInput
                                label="开始时间"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        startTime: event.currentTarget.value
                                    }))
                                }
                                type="datetime-local"
                                value={filters.startTime}
                            />
                            <TextInput
                                label="结束时间"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        endTime: event.currentTarget.value
                                    }))
                                }
                                type="datetime-local"
                                value={filters.endTime}
                            />
                        </Group>

                        <Group justify="flex-end">
                            <Button
                                leftSection={<PiX size={16} />}
                                onClick={clearFilters}
                                variant="default"
                            >
                                清空
                            </Button>
                            <Button leftSection={<PiFunnel size={16} />} onClick={applyFilters}>
                                筛选
                            </Button>
                        </Group>
                    </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
                    <StatPaper
                        icon={<PiChartBar size={18} />}
                        label="访问记录"
                        value={String(summaryData?.totalLogs ?? 0)}
                    />
                    <StatPaper
                        icon={<PiGlobeHemisphereWest size={18} />}
                        label="域名数"
                        value={String(summaryData?.uniqueDomains ?? 0)}
                    />
                    <StatPaper
                        icon={<PiUserFocus size={18} />}
                        label="用户数"
                        value={String(summaryData?.uniqueUsers ?? 0)}
                    />
                    <StatPaper
                        icon={<PiTreeStructure size={18} />}
                        label="节点数"
                        value={String(summaryData?.uniqueNodes ?? 0)}
                    />
                    <StatPaper
                        icon={<PiShieldWarning size={18} />}
                        label="打开告警"
                        value={String(summaryData?.alertCount ?? 0)}
                    />
                </SimpleGrid>

                <Tabs defaultValue="logs">
                    <Tabs.List>
                        <Tabs.Tab value="logs">访问日志</Tabs.Tab>
                        <Tabs.Tab value="top-domains">域名排行</Tabs.Tab>
                        <Tabs.Tab value="rule-hits">规则命中</Tabs.Tab>
                        <Tabs.Tab value="alerts">异常告警</Tabs.Tab>
                        <Tabs.Tab value="settings">设置</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel pt="md" value="logs">
                        <Paper pos="relative" radius="sm" withBorder>
                            <LoadingOverlay visible={isLogsFetching} />
                            {logsData?.aggregateOnly ? (
                                <Text c="dimmed" py="xl" ta="center">
                                    当前开启仅聚合统计，明细日志已隐藏
                                </Text>
                            ) : (
                                <>
                                    <Table.ScrollContainer minWidth={1180}>
                                        <Table highlightOnHover verticalSpacing="sm">
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>时间</Table.Th>
                                                    <Table.Th>用户</Table.Th>
                                                    <Table.Th>节点</Table.Th>
                                                    <Table.Th>目标</Table.Th>
                                                    <Table.Th>协议 / 端口</Table.Th>
                                                    <Table.Th>出站 / 规则</Table.Th>
                                                    <Table.Th>流量</Table.Th>
                                                    <Table.Th w={52} />
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {logsData?.records.map((record) => (
                                                    <Table.Tr key={record.id}>
                                                        <Table.Td>
                                                            {formatTime(record.occurredAt)}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text fw={500} size="sm">
                                                                {record.username ?? '-'}
                                                            </Text>
                                                            <Text c="dimmed" size="xs">
                                                                {record.userId ??
                                                                    record.userUuid ??
                                                                    '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">
                                                                {record.nodeName ?? '-'}
                                                            </Text>
                                                            <Text
                                                                c="dimmed"
                                                                maw={220}
                                                                size="xs"
                                                                truncate
                                                            >
                                                                {record.nodeUuid ?? '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text fw={500} size="sm">
                                                                {record.targetHost}
                                                            </Text>
                                                            <Text c="dimmed" size="xs">
                                                                {record.targetIp ?? '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge variant="light">
                                                                {record.protocol ??
                                                                    record.network ??
                                                                    '-'}
                                                            </Badge>
                                                            <Text c="dimmed" size="xs">
                                                                {record.targetPort ?? '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">
                                                                {record.outboundTag ?? '-'}
                                                            </Text>
                                                            <Text
                                                                c="dimmed"
                                                                maw={260}
                                                                size="xs"
                                                                truncate
                                                            >
                                                                {record.ruleName ??
                                                                    record.ruleUuid ??
                                                                    '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {formatBytes(record.totalBytes)}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Tooltip label="详情">
                                                                <ActionIcon
                                                                    aria-label="详情"
                                                                    onClick={() =>
                                                                        setDetails({
                                                                            title: '访问日志详情',
                                                                            value: record
                                                                        })
                                                                    }
                                                                    variant="subtle"
                                                                >
                                                                    <PiEye size={18} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                                {!isLogsFetching && !logsData?.records.length && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={8}>
                                                            <Text c="dimmed" py="xl" ta="center">
                                                                暂无访问日志
                                                            </Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Table.Tbody>
                                        </Table>
                                    </Table.ScrollContainer>

                                    {!!logsData?.total && (
                                        <Group justify="space-between" p="md">
                                            <Text c="dimmed" size="sm">
                                                共 {logsData.total} 条
                                            </Text>
                                            <Pagination
                                                onChange={setPage}
                                                total={Math.ceil(logsData.total / PAGE_SIZE)}
                                                value={page}
                                            />
                                        </Group>
                                    )}
                                </>
                            )}
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel pt="md" value="top-domains">
                        <Paper pos="relative" radius="sm" withBorder>
                            <LoadingOverlay visible={isTopDomainsFetching} />
                            <Table.ScrollContainer minWidth={900}>
                                <Table highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>域名</Table.Th>
                                            <Table.Th>访问次数</Table.Th>
                                            <Table.Th>用户数</Table.Th>
                                            <Table.Th>节点数</Table.Th>
                                            <Table.Th>流量</Table.Th>
                                            <Table.Th>最近访问</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {topDomainsData?.map((record) => (
                                            <Table.Tr key={record.targetHost}>
                                                <Table.Td>
                                                    <Text fw={500}>{record.targetHost}</Text>
                                                </Table.Td>
                                                <Table.Td>{record.hits}</Table.Td>
                                                <Table.Td>{record.uniqueUsers}</Table.Td>
                                                <Table.Td>{record.uniqueNodes}</Table.Td>
                                                <Table.Td>
                                                    {formatBytes(record.totalBytes)}
                                                </Table.Td>
                                                <Table.Td>{formatTime(record.lastSeenAt)}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {!isTopDomainsFetching && !topDomainsData?.length && (
                                            <Table.Tr>
                                                <Table.Td colSpan={6}>
                                                    <Text c="dimmed" py="xl" ta="center">
                                                        暂无域名统计
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel pt="md" value="rule-hits">
                        <Paper pos="relative" radius="sm" withBorder>
                            <LoadingOverlay visible={isRuleHitsFetching} />
                            <Table.ScrollContainer minWidth={980}>
                                <Table highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>规则</Table.Th>
                                            <Table.Th>动作</Table.Th>
                                            <Table.Th>筛选命中</Table.Th>
                                            <Table.Th>累计命中</Table.Th>
                                            <Table.Th>用户 / 节点</Table.Th>
                                            <Table.Th>流量</Table.Th>
                                            <Table.Th>最近命中</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {ruleHitsData?.map((record) => (
                                            <Table.Tr
                                                key={
                                                    record.ruleUuid ?? record.ruleName ?? 'unknown'
                                                }
                                            >
                                                <Table.Td>
                                                    <Text fw={500}>
                                                        {record.ruleName ?? '未命名规则'}
                                                    </Text>
                                                    <Text c="dimmed" maw={280} size="xs" truncate>
                                                        {record.ruleUuid ?? '-'}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge variant="light">
                                                        {record.ruleAction ?? '-'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>{record.hitCount}</Table.Td>
                                                <Table.Td>{record.cumulativeHitCount}</Table.Td>
                                                <Table.Td>
                                                    {record.uniqueUsers} / {record.uniqueNodes}
                                                </Table.Td>
                                                <Table.Td>
                                                    {formatBytes(record.totalBytes)}
                                                </Table.Td>
                                                <Table.Td>{formatTime(record.lastHitAt)}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {!isRuleHitsFetching && !ruleHitsData?.length && (
                                            <Table.Tr>
                                                <Table.Td colSpan={7}>
                                                    <Text c="dimmed" py="xl" ta="center">
                                                        暂无规则命中
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel pt="md" value="alerts">
                        <Stack gap="md">
                            <Paper p="md" radius="sm" withBorder>
                                <Group align="end" wrap="wrap">
                                    <Select
                                        clearable
                                        data={[
                                            { label: '打开', value: 'OPEN' },
                                            { label: '已确认', value: 'ACKED' },
                                            { label: '已解决', value: 'RESOLVED' }
                                        ]}
                                        label="状态"
                                        onChange={(value) => {
                                            setAlertPage(1)
                                            setAlertStatus(value ?? '')
                                        }}
                                        value={alertStatus || null}
                                    />
                                </Group>
                            </Paper>
                            <Paper pos="relative" radius="sm" withBorder>
                                <LoadingOverlay visible={isAlertsFetching} />
                                <Table.ScrollContainer minWidth={1080}>
                                    <Table highlightOnHover verticalSpacing="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>时间</Table.Th>
                                                <Table.Th>类型</Table.Th>
                                                <Table.Th>级别</Table.Th>
                                                <Table.Th>用户</Table.Th>
                                                <Table.Th>节点</Table.Th>
                                                <Table.Th>目标</Table.Th>
                                                <Table.Th>说明</Table.Th>
                                                <Table.Th w={52} />
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {alertsData?.records.map((record) => (
                                                <Table.Tr key={record.id}>
                                                    <Table.Td>
                                                        {formatTime(record.createdAt)}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {alertTypeLabels[record.type]}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            color={
                                                                alertSeverityColors[record.severity]
                                                            }
                                                            variant="light"
                                                        >
                                                            {record.severity}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {record.username ?? record.userId ?? '-'}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {record.nodeName ?? record.nodeUuid ?? '-'}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {record.targetHost ??
                                                            record.targetIp ??
                                                            '-'}
                                                        {record.targetPort
                                                            ? `:${record.targetPort}`
                                                            : ''}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text maw={320} size="sm" truncate>
                                                            {record.message}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Tooltip label="详情">
                                                            <ActionIcon
                                                                aria-label="详情"
                                                                onClick={() =>
                                                                    setDetails({
                                                                        title: '告警详情',
                                                                        value: record
                                                                    })
                                                                }
                                                                variant="subtle"
                                                            >
                                                                <PiEye size={18} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                            {!isAlertsFetching && !alertsData?.records.length && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={8}>
                                                        <Text c="dimmed" py="xl" ta="center">
                                                            暂无告警
                                                        </Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                                {!!alertsData?.total && (
                                    <Group justify="space-between" p="md">
                                        <Text c="dimmed" size="sm">
                                            共 {alertsData.total} 条
                                        </Text>
                                        <Pagination
                                            onChange={setAlertPage}
                                            total={Math.ceil(alertsData.total / PAGE_SIZE)}
                                            value={alertPage}
                                        />
                                    </Group>
                                )}
                            </Paper>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel pt="md" value="settings">
                        <Paper p="md" radius="sm" withBorder>
                            <Stack gap="md">
                                <Group align="end" grow wrap="wrap">
                                    <Select
                                        data={[
                                            { label: '7 天', value: '7' },
                                            { label: '30 天', value: '30' },
                                            { label: '90 天', value: '90' }
                                        ]}
                                        label="日志保留"
                                        onChange={(value) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                retentionDays: value ?? '30'
                                            }))
                                        }
                                        value={settingsDraft.retentionDays}
                                    />
                                    <TextInput
                                        label="域名窗口（分钟）"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                distinctDomainWindowMinutes:
                                                    event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.distinctDomainWindowMinutes}
                                    />
                                    <TextInput
                                        label="域名阈值"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                distinctDomainThreshold: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.distinctDomainThreshold}
                                    />
                                    <TextInput
                                        label="节点突增倍数"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                nodeSpikeMultiplier: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.nodeSpikeMultiplier}
                                    />
                                </Group>

                                <Group align="end" grow wrap="wrap">
                                    <TextInput
                                        label="节点突增最小字节"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                nodeSpikeMinBytes: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.nodeSpikeMinBytes}
                                    />
                                    <TextInput
                                        label="高风险端口"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                highRiskPorts: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.highRiskPorts}
                                    />
                                </Group>

                                <Group wrap="wrap">
                                    <Switch
                                        checked={settingsDraft.isEnabled}
                                        label="启用访问审计"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                isEnabled: event.currentTarget.checked
                                            }))
                                        }
                                    />
                                    <Switch
                                        checked={settingsDraft.hideUsernames}
                                        label="隐藏用户名"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                hideUsernames: event.currentTarget.checked
                                            }))
                                        }
                                    />
                                    <Switch
                                        checked={settingsDraft.aggregateOnly}
                                        label="仅聚合统计"
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                aggregateOnly: event.currentTarget.checked
                                            }))
                                        }
                                    />
                                </Group>

                                <Group align="start" grow wrap="wrap">
                                    <Textarea
                                        autosize
                                        label="黑名单域名"
                                        minRows={4}
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                blacklistedHosts: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.blacklistedHosts}
                                    />
                                    <Textarea
                                        autosize
                                        label="黑名单 IP"
                                        minRows={4}
                                        onChange={(event) =>
                                            setSettingsDraft((current) => ({
                                                ...current,
                                                blacklistedIps: event.currentTarget.value
                                            }))
                                        }
                                        value={settingsDraft.blacklistedIps}
                                    />
                                </Group>

                                <Group justify="space-between" wrap="wrap">
                                    <Group>
                                        <Button
                                            leftSection={<PiBroom size={16} />}
                                            onClick={cleanupByRetention}
                                            variant="default"
                                        >
                                            清理过期日志
                                        </Button>
                                        <Button color="red" onClick={cleanupAll} variant="light">
                                            清空全部
                                        </Button>
                                    </Group>
                                    <Button
                                        loading={updateSettingsMutation.isPending}
                                        onClick={saveSettings}
                                    >
                                        保存设置
                                    </Button>
                                </Group>
                            </Stack>
                        </Paper>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            <Modal
                onClose={() => setDetails(null)}
                opened={details !== null}
                size="lg"
                title={details?.title}
            >
                <Code block>{JSON.stringify(details?.value ?? null, null, 2)}</Code>
            </Modal>
        </Page>
    )
}
