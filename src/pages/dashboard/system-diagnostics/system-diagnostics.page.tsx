import {
    Badge,
    Button,
    Code,
    Group,
    LoadingOverlay,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Text,
    ThemeIcon
} from '@mantine/core'
import { PiArrowsClockwise, PiChartLine, PiDatabase, PiPulse, PiShieldCheck } from 'react-icons/pi'
import { type ReactNode } from 'react'
import dayjs from 'dayjs'

import { PageHeaderShared } from '@shared/ui/page-header/page-header.shared'
import { prettyBytesUtil } from '@shared/utils/bytes'
import { useGetDiagnostics } from '@shared/api/hooks'
import { Page } from '@shared/ui'

const statusColors = {
    OK: 'teal',
    WARN: 'yellow',
    FAIL: 'red'
} as const

function formatTime(value: null | number | string | undefined) {
    if (!value) return '-'
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

function formatBytes(value: string) {
    return prettyBytesUtil(value, true) ?? '0'
}

function shortSha(value: string) {
    if (!value || value === 'unknown') return value || '-'
    return value.slice(0, 8)
}

function StatTile({
    label,
    value,
    hint,
    icon
}: {
    hint?: string
    icon: ReactNode
    label: string
    value: string
}) {
    return (
        <Paper p="md" radius="sm" withBorder>
            <Group gap="sm" wrap="nowrap">
                <ThemeIcon radius="sm" size="lg" variant="light">
                    {icon}
                </ThemeIcon>
                <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text c="dimmed" size="xs">
                        {label}
                    </Text>
                    <Text fw={700} size="lg">
                        {value}
                    </Text>
                    {hint && (
                        <Text c="dimmed" lineClamp={1} size="xs">
                            {hint}
                        </Text>
                    )}
                </Stack>
            </Group>
        </Paper>
    )
}

export function SystemDiagnosticsPage() {
    const { data, isFetching, refetch } = useGetDiagnostics()

    return (
        <Page title="System Diagnostics">
            <Stack gap="md">
                <PageHeaderShared
                    actions={
                        <Button
                            leftSection={<PiArrowsClockwise size={16} />}
                            loading={isFetching}
                            onClick={() => refetch()}
                            variant="default"
                        >
                            Refresh
                        </Button>
                    }
                    description="Read-only operational summary for runtime health, auditing, egress rules and billing."
                    title="System Diagnostics"
                    wrapActions
                />

                <Paper p="md" pos="relative" radius="sm" withBorder>
                    <LoadingOverlay visible={isFetching && !data} />
                    <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                            <StatTile
                                hint={`${data?.database.activeUsers ?? 0} active users`}
                                icon={<PiDatabase size={18} />}
                                label="Users"
                                value={String(data?.database.users ?? 0)}
                            />
                            <StatTile
                                hint={`${data?.database.connectedNodes ?? 0} connected`}
                                icon={<PiPulse size={18} />}
                                label="Enabled nodes"
                                value={String(data?.database.enabledNodes ?? 0)}
                            />
                            <StatTile
                                hint={`${data?.runtime.apiInstances ?? 0} API / ${data?.runtime.schedulerInstances ?? 0} scheduler / ${data?.runtime.processorInstances ?? 0} processor`}
                                icon={<PiChartLine size={18} />}
                                label="Runtime instances"
                                value={String(data?.runtime.instances ?? 0)}
                            />
                            <StatTile
                                hint={`${data?.audit.criticalAlerts ?? 0} critical`}
                                icon={<PiShieldCheck size={18} />}
                                label="Open alerts"
                                value={String(data?.audit.openAlerts ?? 0)}
                            />
                        </SimpleGrid>

                        <Table.ScrollContainer minWidth={760}>
                            <Table highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Check</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Message</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {data?.checks.map((check) => (
                                        <Table.Tr key={check.key}>
                                            <Table.Td>
                                                <Text fw={500}>{check.label}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    color={statusColors[check.status]}
                                                    variant="light"
                                                >
                                                    {check.status}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{check.message}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                    {!isFetching && !data?.checks.length && (
                                        <Table.Tr>
                                            <Table.Td colSpan={3}>
                                                <Text c="dimmed" py="lg" ta="center">
                                                    No diagnostic checks returned.
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, lg: 2 }}>
                    <Paper p="md" radius="sm" withBorder>
                        <Stack gap="sm">
                            <Text fw={600}>Version</Text>
                            <Group gap="xs" wrap="wrap">
                                <Badge variant="light">v{data?.version.app ?? '-'}</Badge>
                                <Code>
                                    backend {shortSha(data?.version.backendCommitSha ?? '')}
                                </Code>
                                <Code>
                                    frontend {shortSha(data?.version.frontendCommitSha ?? '')}
                                </Code>
                                <Code>{data?.version.branch ?? '-'}</Code>
                            </Group>
                            <Text c="dimmed" size="sm">
                                Build {data?.version.buildNumber ?? '-'} at{' '}
                                {data?.version.buildTime ?? '-'}
                            </Text>
                            <Text c="dimmed" size="xs">
                                Generated at {formatTime(data?.generatedAt)}
                            </Text>
                        </Stack>
                    </Paper>

                    <Paper p="md" radius="sm" withBorder>
                        <Stack gap="sm">
                            <Text fw={600}>Audit data</Text>
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                <StatTile
                                    icon={<PiDatabase size={18} />}
                                    label="Audit logs"
                                    value={String(data?.database.auditLogs ?? 0)}
                                />
                                <StatTile
                                    hint={`Last: ${formatTime(data?.database.lastProxyAccessLogAt)}`}
                                    icon={<PiChartLine size={18} />}
                                    label="Access logs"
                                    value={String(data?.database.proxyAccessLogs ?? 0)}
                                />
                            </SimpleGrid>
                            <Group gap="xs" wrap="wrap">
                                <Badge
                                    color={data?.audit.isEnabled ? 'teal' : 'yellow'}
                                    variant="light"
                                >
                                    Audit {data?.audit.isEnabled ? 'enabled' : 'disabled'}
                                </Badge>
                                <Badge variant="light">
                                    Retention {data?.audit.retentionDays ?? 30} days
                                </Badge>
                                <Badge
                                    color={data?.audit.aggregateOnly ? 'yellow' : 'gray'}
                                    variant="light"
                                >
                                    Aggregate only: {data?.audit.aggregateOnly ? 'on' : 'off'}
                                </Badge>
                                <Badge
                                    color={data?.audit.hideUsernames ? 'yellow' : 'gray'}
                                    variant="light"
                                >
                                    Hide usernames: {data?.audit.hideUsernames ? 'on' : 'off'}
                                </Badge>
                            </Group>
                        </Stack>
                    </Paper>

                    <Paper p="md" radius="sm" withBorder>
                        <Stack gap="sm">
                            <Text fw={600}>Egress rules</Text>
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <StatTile
                                    label="Rules"
                                    hint={`${data?.egress.enabledRules ?? 0} enabled`}
                                    icon={<PiShieldCheck size={18} />}
                                    value={String(data?.egress.rules ?? 0)}
                                />
                                <StatTile
                                    label="Outbounds"
                                    hint={`${data?.egress.unhealthyProxyOutbounds ?? 0} unhealthy / ${data?.egress.unknownProxyOutbounds ?? 0} unknown`}
                                    icon={<PiPulse size={18} />}
                                    value={String(data?.egress.proxyOutbounds ?? 0)}
                                />
                                <StatTile
                                    label="Rule hits"
                                    icon={<PiChartLine size={18} />}
                                    value={data?.egress.ruleHitCount ?? '0'}
                                />
                            </SimpleGrid>
                            <Group gap="xs" wrap="wrap">
                                <Badge variant="light">
                                    Subscriptions {data?.egress.proxySubscriptions ?? 0}
                                </Badge>
                                <Badge
                                    color={
                                        data?.egress.failedProxySubscriptions ? 'yellow' : 'teal'
                                    }
                                    variant="light"
                                >
                                    Failed sync {data?.egress.failedProxySubscriptions ?? 0}
                                </Badge>
                                <Badge variant="light">
                                    Traffic {formatBytes(data?.egress.ruleTrafficBytes ?? '0')}
                                </Badge>
                                <Badge variant="light">
                                    Last sync {formatTime(data?.egress.lastSubscriptionSyncAt)}
                                </Badge>
                            </Group>
                        </Stack>
                    </Paper>

                    <Paper p="md" radius="sm" withBorder>
                        <Stack gap="sm">
                            <Text fw={600}>Billing</Text>
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <StatTile
                                    icon={<PiDatabase size={18} />}
                                    label="Tracked"
                                    value={String(data?.billing.trackedNodes ?? 0)}
                                />
                                <StatTile
                                    icon={<PiPulse size={18} />}
                                    label="Due soon"
                                    value={String(data?.billing.dueSoonNodes ?? 0)}
                                />
                                <StatTile
                                    icon={<PiShieldCheck size={18} />}
                                    label="Overdue"
                                    value={String(data?.billing.overdueNodes ?? 0)}
                                />
                            </SimpleGrid>
                            <Text c="dimmed" size="xs">
                                Due soon means renewal within the next 7 days.
                            </Text>
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Stack>
        </Page>
    )
}
