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
    Stack,
    Table,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import { PiEye, PiFunnel, PiMagnifyingGlass, PiX } from 'react-icons/pi'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'

import {
    AuditLog,
    AuditLogsQuery,
    useGetAuditLogs
} from '@shared/api/hooks/audit-logs/audit-logs.query.hooks'
import { PageHeaderShared } from '@shared/ui/page-header/page-header.shared'
import { Page } from '@shared/ui'

const PAGE_SIZE = 25

const resultColors: Record<AuditLog['result'], string> = {
    success: 'teal',
    failed: 'red',
    blocked: 'orange',
    warning: 'yellow'
}

interface FilterValues {
    action: string
    actorName: string
    actorType: string
    endTime: string
    ip: string
    resourceType: string
    result: string
    startTime: string
}

const emptyFilters: FilterValues = {
    actorName: '',
    actorType: '',
    action: '',
    resourceType: '',
    result: '',
    ip: '',
    startTime: '',
    endTime: ''
}

export function AuditLogsPage() {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState<FilterValues>(emptyFilters)
    const [appliedFilters, setAppliedFilters] = useState<FilterValues>(emptyFilters)
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

    const query = useMemo<AuditLogsQuery>(
        () => ({
            start: (page - 1) * PAGE_SIZE,
            size: PAGE_SIZE,
            actorName: appliedFilters.actorName || undefined,
            actorType: appliedFilters.actorType || undefined,
            action: appliedFilters.action || undefined,
            resourceType: appliedFilters.resourceType || undefined,
            result: appliedFilters.result || undefined,
            ip: appliedFilters.ip || undefined,
            startTime: appliedFilters.startTime
                ? dayjs(appliedFilters.startTime).toISOString()
                : undefined,
            endTime: appliedFilters.endTime
                ? dayjs(appliedFilters.endTime).toISOString()
                : undefined
        }),
        [appliedFilters, page]
    )

    const { data, isFetching } = useGetAuditLogs({ query })

    const applyFilters = () => {
        setPage(1)
        setAppliedFilters(filters)
    }

    const clearFilters = () => {
        setPage(1)
        setFilters(emptyFilters)
        setAppliedFilters(emptyFilters)
    }

    return (
        <Page title={t('constants.audit-logs')}>
            <Stack gap="md">
                <PageHeaderShared
                    description={t('audit-logs.description')}
                    title={t('constants.audit-logs')}
                />

                <Paper p="md" pos="relative" radius="sm" withBorder>
                    <Stack gap="sm">
                        <Group align="end" grow wrap="wrap">
                            <TextInput
                                label={t('audit-logs.actor')}
                                leftSection={<PiMagnifyingGlass size={16} />}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        actorName: event.currentTarget.value
                                    }))
                                }
                                value={filters.actorName}
                            />
                            <Select
                                clearable
                                data={['admin', 'user', 'node', 'system', 'agent']}
                                label={t('audit-logs.actor-type')}
                                onChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        actorType: value ?? ''
                                    }))
                                }
                                value={filters.actorType || null}
                            />
                            <TextInput
                                label={t('audit-logs.action')}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        action: event.currentTarget.value
                                    }))
                                }
                                value={filters.action}
                            />
                            <TextInput
                                label={t('audit-logs.resource-type')}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        resourceType: event.currentTarget.value
                                    }))
                                }
                                value={filters.resourceType}
                            />
                        </Group>

                        <Group align="end" grow wrap="wrap">
                            <Select
                                clearable
                                data={['success', 'failed', 'blocked', 'warning']}
                                label={t('audit-logs.result')}
                                onChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        result: value ?? ''
                                    }))
                                }
                                value={filters.result || null}
                            />
                            <TextInput
                                label="IP"
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        ip: event.currentTarget.value
                                    }))
                                }
                                value={filters.ip}
                            />
                            <TextInput
                                label={t('audit-logs.start-time')}
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
                                label={t('audit-logs.end-time')}
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
                                {t('audit-logs.clear')}
                            </Button>
                            <Button leftSection={<PiFunnel size={16} />} onClick={applyFilters}>
                                {t('audit-logs.apply')}
                            </Button>
                        </Group>
                    </Stack>
                </Paper>

                <Paper pos="relative" radius="sm" withBorder>
                    <LoadingOverlay visible={isFetching} />
                    <Table.ScrollContainer minWidth={1100}>
                        <Table highlightOnHover verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t('audit-logs.time')}</Table.Th>
                                    <Table.Th>{t('audit-logs.actor')}</Table.Th>
                                    <Table.Th>{t('audit-logs.action')}</Table.Th>
                                    <Table.Th>{t('audit-logs.resource')}</Table.Th>
                                    <Table.Th>IP</Table.Th>
                                    <Table.Th>{t('audit-logs.result')}</Table.Th>
                                    <Table.Th>{t('audit-logs.message')}</Table.Th>
                                    <Table.Th w={52} />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data?.records.map((record) => (
                                    <Table.Tr key={record.id}>
                                        <Table.Td>
                                            <Text size="sm">
                                                {dayjs(record.createdAt).format(
                                                    'YYYY-MM-DD HH:mm:ss'
                                                )}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text fw={500} size="sm">
                                                {record.actorName ?? record.actorType}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                {record.actorType}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Code>{record.action}</Code>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{record.resourceType ?? '-'}</Text>
                                            <Text c="dimmed" maw={220} size="xs" truncate>
                                                {record.resourceId ?? '-'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>{record.ip ?? '-'}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={resultColors[record.result]}
                                                variant="light"
                                            >
                                                {record.result}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text maw={280} size="sm" truncate>
                                                {record.message ?? '-'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Tooltip label={t('audit-logs.details')}>
                                                <ActionIcon
                                                    aria-label={t('audit-logs.details')}
                                                    onClick={() => setSelectedLog(record)}
                                                    variant="subtle"
                                                >
                                                    <PiEye size={18} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {!isFetching && !data?.records.length && (
                                    <Table.Tr>
                                        <Table.Td colSpan={8}>
                                            <Text c="dimmed" py="xl" ta="center">
                                                {t('audit-logs.empty')}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    {!!data?.total && (
                        <Group justify="space-between" p="md">
                            <Text c="dimmed" size="sm">
                                {t('audit-logs.total', { count: data.total })}
                            </Text>
                            <Pagination
                                onChange={setPage}
                                total={Math.ceil(data.total / PAGE_SIZE)}
                                value={page}
                            />
                        </Group>
                    )}
                </Paper>
            </Stack>

            <Modal
                onClose={() => setSelectedLog(null)}
                opened={selectedLog !== null}
                size="lg"
                title={t('audit-logs.details')}
            >
                {selectedLog && (
                    <Stack gap="sm">
                        <Text>
                            <b>{t('audit-logs.action')}:</b> {selectedLog.action}
                        </Text>
                        <Text>
                            <b>{t('audit-logs.actor')}:</b>{' '}
                            {selectedLog.actorName ?? selectedLog.actorType}
                        </Text>
                        <Text>
                            <b>User-Agent:</b> {selectedLog.userAgent ?? '-'}
                        </Text>
                        <Text>
                            <b>{t('audit-logs.resource')}:</b> {selectedLog.resourceType ?? '-'} /{' '}
                            {selectedLog.resourceId ?? '-'}
                        </Text>
                        <Code block>{JSON.stringify(selectedLog.metadata, null, 2) || 'null'}</Code>
                    </Stack>
                )}
            </Modal>
        </Page>
    )
}
