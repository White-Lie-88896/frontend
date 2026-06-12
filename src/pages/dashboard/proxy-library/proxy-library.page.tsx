import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import { PiArrowsClockwise, PiPencil, PiPlus, PiTrash } from 'react-icons/pi'
import { notifications } from '@mantine/notifications'
import { useForm } from '@mantine/form'
import { useState } from 'react'

import {
    useCreateProxySubscription,
    useDeleteProxySubscription,
    useGetProxyOutbounds,
    useGetProxySubscriptions,
    useGetInternalSquads,
    useGetUsersV2,
    useSyncProxySubscription,
    useUpdateProxySubscription
} from '@shared/api/hooks'
import { PageHeaderShared } from '@shared/ui/page-header/page-header.shared'
import { ProxySubscription } from '@remnawave/backend-contract'
import { Page } from '@shared/ui'

import { ProxyOutboundsPanel } from '../egress-rules/proxy-outbounds.panel'

export function ProxyLibraryPage() {
    const { data, refetch, isFetching } = useGetProxySubscriptions()
    const { data: outbounds } = useGetProxyOutbounds()
    const createMutation = useCreateProxySubscription()
    const syncMutation = useSyncProxySubscription()
    const updateMutation = useUpdateProxySubscription()
    const deleteMutation = useDeleteProxySubscription()
    const [opened, setOpened] = useState(false)
    const [editing, setEditing] = useState<ProxySubscription | null>(null)
    const { data: usersResponse } = useGetUsersV2({ query: { start: 0, size: 1000 } })
    const { data: squadsResponse } = useGetInternalSquads()
    const form = useForm({
        initialValues: {
            name: '',
            url: '',
            isEnabled: true,
            updateIntervalMin: 360,
            distributionMode: 'NONE' as 'NONE' | 'ALL' | 'SELECTED',
            targetUserIds: [] as string[],
            targetSquadUuids: [] as string[]
        },
        validate: {
            name: (value) => (value.trim() ? null : 'Name is required'),
            url: (value) => (/^https?:\/\//i.test(value) ? null : 'HTTP(S) URL is required')
        }
    })
    const subscriptions = (data ?? []) as ProxySubscription[]
    const statusColor = (status: ProxySubscription['lastSyncStatus']) => {
        if (status === 'SUCCESS') return 'teal'
        if (status === 'FAILED') return 'red'
        return 'gray'
    }

    const create = form.onSubmit(async (values) => {
        const payload = {
            ...values,
            targetUserIds: values.targetUserIds.map(Number)
        }
        if (editing) {
            await updateMutation.mutateAsync({
                route: { uuid: editing.uuid },
                variables: payload
            })
        } else {
            await createMutation.mutateAsync({ variables: payload })
        }
        setOpened(false)
        setEditing(null)
        form.reset()
        await refetch()
        notifications.show({ color: 'teal', message: 'Subscription saved and synchronized.' })
    })

    const openCreate = () => {
        setEditing(null)
        form.reset()
        setOpened(true)
    }

    const openEdit = (subscription: ProxySubscription) => {
        setEditing(subscription)
        form.setValues({
            name: subscription.name,
            url: subscription.url,
            isEnabled: subscription.isEnabled,
            updateIntervalMin: subscription.updateIntervalMin,
            distributionMode: subscription.distributionMode,
            targetUserIds: subscription.targetUserIds.map(String),
            targetSquadUuids: subscription.targetSquadUuids
        })
        setOpened(true)
    }

    const sync = async (uuid: string) => {
        const result = await syncMutation.mutateAsync({ route: { uuid } })
        await refetch()
        notifications.show({
            color: result.lastSyncStatus === 'SUCCESS' ? 'teal' : 'red',
            message: result.lastSyncMessage ?? 'Synchronization finished.'
        })
    }

    const remove = async (uuid: string) => {
        await deleteMutation.mutateAsync({ route: { uuid } })
        await refetch()
    }

    return (
        <Page title="Remote Node Library">
            <Stack gap="lg">
                <PageHeaderShared
                    description="Manage manual proxy nodes and synchronized subscription sources independently."
                    title="Remote Node Library"
                />
                <Paper maw="100%" p="md" radius="sm" style={{ overflow: 'hidden' }} withBorder>
                    <Group align="flex-start" justify="space-between" mb="md" wrap="wrap">
                        <div style={{ minWidth: 0 }}>
                            <Text fw={600}>Subscriptions</Text>
                            <Text c="dimmed" size="sm">
                                Base64, Clash/Mihomo YAML and common proxy URI subscriptions.
                            </Text>
                        </div>
                        <Button leftSection={<PiPlus />} onClick={openCreate}>
                            Add subscription
                        </Button>
                    </Group>
                    <Table.ScrollContainer minWidth={680}>
                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Nodes</Table.Th>
                                    <Table.Th>Last sync</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th w={100} />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {subscriptions.map((subscription) => (
                                    <Table.Tr key={subscription.uuid}>
                                        <Table.Td>
                                            <Text fw={500}>{subscription.name}</Text>
                                            <Text c="dimmed" lineClamp={1} size="xs">
                                                {subscription.url}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>{subscription.nodeCount}</Table.Td>
                                        <Table.Td>
                                            {subscription.lastSyncAt
                                                ? new Date(subscription.lastSyncAt).toLocaleString()
                                                : 'Never'}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={statusColor(subscription.lastSyncStatus)}
                                                variant="light"
                                            >
                                                {subscription.lastSyncStatus}
                                            </Badge>
                                            <Text c="dimmed" size="xs">
                                                {subscription.distributionMode === 'ALL'
                                                    ? 'All users'
                                                    : subscription.distributionMode === 'SELECTED'
                                                      ? `${subscription.targetUserIds.length} users, ${subscription.targetSquadUuids.length} groups`
                                                      : 'Not distributed'}
                                            </Text>
                                            {subscription.lastSyncMessage && (
                                                <Text c="dimmed" lineClamp={1} size="xs">
                                                    {subscription.lastSyncMessage}
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4} justify="flex-end">
                                                <Tooltip label="Synchronize">
                                                    <ActionIcon
                                                        loading={syncMutation.isPending}
                                                        onClick={() => sync(subscription.uuid)}
                                                        variant="subtle"
                                                    >
                                                        <PiArrowsClockwise />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Edit distribution">
                                                    <ActionIcon
                                                        onClick={() => openEdit(subscription)}
                                                        variant="subtle"
                                                    >
                                                        <PiPencil />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Delete subscription and imported nodes">
                                                    <ActionIcon
                                                        color="red"
                                                        onClick={() => remove(subscription.uuid)}
                                                        variant="subtle"
                                                    >
                                                        <PiTrash />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {!isFetching && subscriptions.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
                                            <Text c="dimmed" py="lg" ta="center">
                                                No subscriptions configured.
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>
                <ProxyOutboundsPanel />
                <Text c="dimmed" size="xs">
                    Total library nodes: {(outbounds ?? []).length}
                </Text>
            </Stack>

            <Modal
                centered
                onClose={() => {
                    setOpened(false)
                    setEditing(null)
                }}
                opened={opened}
                title={editing ? 'Edit subscription' : 'Add subscription'}
            >
                <form onSubmit={create}>
                    <Stack>
                        <TextInput label="Name" required {...form.getInputProps('name')} />
                        <TextInput
                            label="Subscription URL"
                            placeholder="https://example.com/subscription"
                            required
                            {...form.getInputProps('url')}
                        />
                        <NumberInput
                            label="Update interval (minutes)"
                            min={15}
                            {...form.getInputProps('updateIntervalMin')}
                        />
                        <Switch
                            label="Enabled"
                            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
                        />
                        <Select
                            data={[
                                { label: 'Do not distribute', value: 'NONE' },
                                { label: 'All users', value: 'ALL' },
                                { label: 'Selected', value: 'SELECTED' }
                            ]}
                            label="Distribute nodes to"
                            {...form.getInputProps('distributionMode')}
                        />
                        {form.values.distributionMode === 'SELECTED' && (
                            <>
                                <MultiSelect
                                    data={(usersResponse?.users ?? []).map((user) => ({
                                        value: String(user.id),
                                        label: user.username
                                    }))}
                                    label="Users"
                                    searchable
                                    {...form.getInputProps('targetUserIds')}
                                />
                                <MultiSelect
                                    data={(squadsResponse?.internalSquads ?? []).map((squad) => ({
                                        value: squad.uuid,
                                        label: squad.name
                                    }))}
                                    label="Internal groups"
                                    searchable
                                    {...form.getInputProps('targetSquadUuids')}
                                />
                            </>
                        )}
                        <Text c="dimmed" size="xs">
                            Only synchronized VLESS, Trojan and Shadowsocks nodes are distributed.
                            The upstream subscription URL is never exposed.
                        </Text>
                        <Button
                            loading={createMutation.isPending || updateMutation.isPending}
                            type="submit"
                        >
                            {editing ? 'Save changes' : 'Save and synchronize'}
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Page>
    )
}
