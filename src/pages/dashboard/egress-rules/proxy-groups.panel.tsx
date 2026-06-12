import {
    ActionIcon,
    Badge,
    Button,
    Group,
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
    Tooltip
} from '@mantine/core'
import { PiArrowsSplit, PiPencilSimple, PiPlus, PiTrash } from 'react-icons/pi'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useForm } from '@mantine/form'
import { useState } from 'react'

import {
    useCreateProxyGroup,
    useDeleteProxyGroup,
    useGetProxyGroups,
    useGetProxyOutbounds,
    useUpdateProxyGroup
} from '@shared/api/hooks'
import { ProxyGroup } from '@remnawave/backend-contract'

export function ProxyGroupsPanel() {
    const { data, refetch } = useGetProxyGroups()
    const { data: outboundsData } = useGetProxyOutbounds()
    const createMutation = useCreateProxyGroup()
    const updateMutation = useUpdateProxyGroup()
    const deleteMutation = useDeleteProxyGroup()
    const [opened, setOpened] = useState(false)
    const [editing, setEditing] = useState<null | ProxyGroup>(null)

    const outbounds = (outboundsData ?? []).filter((outbound) => outbound.isEnabled)
    const outboundOptions = outbounds.map((outbound) => ({
        label: `${outbound.name} · ${outbound.healthStatus}`,
        value: outbound.uuid
    }))
    const groups = (data ?? []) as ProxyGroup[]
    const form = useForm({
        initialValues: {
            name: '',
            description: '',
            mode: 'FAILOVER' as 'FAILOVER' | 'RANDOM',
            outboundUuids: [] as string[],
            isEnabled: true
        },
        validate: {
            name: (value) => value.trim() ? null : 'Name is required',
            outboundUuids: (value) => value.length ? null : 'Select at least one outbound'
        }
    })

    const openCreate = () => {
        setEditing(null)
        form.reset()
        setOpened(true)
    }
    const openEdit = (group: ProxyGroup) => {
        setEditing(group)
        form.setValues({
            name: group.name,
            description: group.description ?? '',
            mode: group.mode,
            outboundUuids: group.outboundUuids,
            isEnabled: group.isEnabled
        })
        setOpened(true)
    }
    const submit = form.onSubmit(async (values) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    variables: { uuid: editing.uuid, ...values }
                })
            } else {
                await createMutation.mutateAsync({ variables: values })
            }
            setOpened(false)
            await refetch()
            notifications.show({
                color: 'teal',
                message: 'Proxy group saved.',
                title: 'Success'
            })
        } catch {
            notifications.show({
                color: 'red',
                message: 'Unable to save proxy group.',
                title: 'Error'
            })
        }
    })

    const remove = (group: ProxyGroup) => modals.openConfirmModal({
        centered: true,
        children: `Delete proxy group "${group.name}"?`,
        confirmProps: { color: 'red' },
        labels: { cancel: 'Cancel', confirm: 'Delete' },
        onConfirm: async () => {
            await deleteMutation.mutateAsync({ route: { uuid: group.uuid } })
            await refetch()
        },
        title: 'Delete proxy group'
    })

    return (
        <Paper p="md" radius="sm" withBorder>
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <PiArrowsSplit size={22} />
                    <div>
                        <Text fw={600}>Proxy groups</Text>
                        <Text c="dimmed" size="xs">
                            Ordered failover or random balancing across proxy outbounds.
                        </Text>
                    </div>
                </Group>
                <Button leftSection={<PiPlus />} onClick={openCreate} size="xs">
                    New group
                </Button>
            </Group>

            <Table highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Mode</Table.Th>
                        <Table.Th>Members</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th />
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {groups.map((group) => (
                        <Table.Tr key={group.uuid}>
                            <Table.Td>
                                <Text fw={500} size="sm">{group.name}</Text>
                                {group.description && (
                                    <Text c="dimmed" size="xs">{group.description}</Text>
                                )}
                            </Table.Td>
                            <Table.Td><Badge variant="light">{group.mode}</Badge></Table.Td>
                            <Table.Td>{group.outboundUuids.length}</Table.Td>
                            <Table.Td>
                                <Badge color={group.isEnabled ? 'teal' : 'gray'} variant="light">
                                    {group.isEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <Group gap={4} justify="flex-end">
                                    <Tooltip label="Edit">
                                        <ActionIcon
                                            onClick={() => openEdit(group)}
                                            variant="subtle"
                                        >
                                            <PiPencilSimple />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Delete">
                                        <ActionIcon
                                            color="red"
                                            onClick={() => remove(group)}
                                            variant="subtle"
                                        >
                                            <PiTrash />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            <Modal
                centered
                onClose={() => setOpened(false)}
                opened={opened}
                title={editing ? 'Edit proxy group' : 'New proxy group'}
            >
                <form onSubmit={submit}>
                    <Stack>
                        <TextInput label="Name" required {...form.getInputProps('name')} />
                        <Textarea label="Description" {...form.getInputProps('description')} />
                        <Select
                            data={[
                                {
                                    label: 'Failover · first healthy member',
                                    value: 'FAILOVER'
                                },
                                {
                                    label: 'Random · Xray load balancing',
                                    value: 'RANDOM'
                                }
                            ]}
                            label="Mode"
                            {...form.getInputProps('mode')}
                        />
                        <MultiSelect
                            data={outboundOptions}
                            description={
                                form.values.mode === 'FAILOVER'
                                    ? 'Selection order is the failover priority.'
                                    : 'Traffic is distributed across all selected members.'
                            }
                            label="Members"
                            required
                            searchable
                            {...form.getInputProps('outboundUuids')}
                        />
                        <Switch
                            label="Enabled"
                            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
                        />
                        <Button
                            loading={createMutation.isPending || updateMutation.isPending}
                            type="submit"
                        >
                            Save
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Paper>
    )
}
