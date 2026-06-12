import {
    ActionIcon,
    Badge,
    Button,
    Checkbox,
    FileButton,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Paper,
    PasswordInput,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    Textarea,
    TextInput,
    Tooltip
} from '@mantine/core'
import { PiLink, PiPencilSimple, PiPlayCircle, PiPlus, PiQrCode, PiTrash } from 'react-icons/pi'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useForm } from '@mantine/form'
import { useRef, useState } from 'react'

import {
    useCreateProxyOutbound,
    useDeleteProxyOutbound,
    useGetProxyOutbounds,
    useGetInternalSquads,
    useGetUsersV2,
    useTestProxyOutbound,
    useUpdateProxyOutbound
} from '@shared/api/hooks'
import { ProxyOutbound, ProxyOutboundConfig } from '@remnawave/backend-contract'
import { parseProxyLink } from '@shared/utils/parse-proxy-link.util'
import { scanQrCodeFromImageFile } from '@shared/utils/scan-qr-code.util'

const protocolOptions = [
    { label: 'SOCKS5', value: 'socks5' },
    { label: 'HTTP', value: 'http' },
    { label: 'Shadowsocks', value: 'shadowsocks' },
    { label: 'VLESS', value: 'vless' },
    { label: 'VMess', value: 'vmess' },
    { label: 'Trojan', value: 'trojan' }
]

const defaultConfig: ProxyOutboundConfig = {
    protocol: 'socks5',
    address: '',
    port: 1080,
    network: 'tcp',
    tlsSecurity: 'none'
}

const getHealthColor = (status: string) => {
    if (status === 'HEALTHY') return 'teal'
    if (status === 'UNHEALTHY') return 'red'
    return 'gray'
}

export function ProxyOutboundsPanel() {
    const { data, refetch } = useGetProxyOutbounds()
    const createMutation = useCreateProxyOutbound()
    const updateMutation = useUpdateProxyOutbound()
    const deleteMutation = useDeleteProxyOutbound()
    const testMutation = useTestProxyOutbound()
    const { data: usersResponse } = useGetUsersV2({ query: { start: 0, size: 1000 } })
    const { data: squadsResponse } = useGetInternalSquads()
    const [opened, setOpened] = useState(false)
    const [editing, setEditing] = useState<null | ProxyOutbound>(null)
    const [importLink, setImportLink] = useState('')
    const [isScanningQr, setIsScanningQr] = useState(false)
    const [selected, setSelected] = useState<string[]>([])
    const [bulkOpened, setBulkOpened] = useState(false)
    const resetQrFileRef = useRef<() => void>(null)
    const bulkForm = useForm({
        initialValues: {
            distributionMode: 'NONE' as 'INHERIT' | 'NONE' | 'ALL' | 'SELECTED',
            targetUserIds: [] as string[],
            targetSquadUuids: [] as string[]
        }
    })

    const form = useForm({
        initialValues: {
            name: '',
            description: '',
            isEnabled: true,
            distributionMode: 'INHERIT' as 'INHERIT' | 'NONE' | 'ALL' | 'SELECTED',
            targetUserIds: [] as string[],
            targetSquadUuids: [] as string[],
            config: { ...defaultConfig }
        },
        validate: {
            name: (value) => (value.trim() ? null : 'Name is required'),
            config: {
                address: (value) => (value.trim() ? null : 'Address is required'),
                port: (value) => (value >= 1 && value <= 65535 ? null : 'Invalid port')
            }
        }
    })

    const outbounds = (data ?? []) as ProxyOutbound[]
    const remoteOutbounds = outbounds.filter((outbound) => outbound.subscriptionUuid)
    const allRemoteSelected =
        remoteOutbounds.length > 0 &&
        remoteOutbounds.every((outbound) => selected.includes(outbound.uuid))
    const { protocol } = form.values.config
    const usesCredentials = protocol === 'socks5' || protocol === 'http'
    const usesUuid = protocol === 'vless' || protocol === 'vmess'
    const usesPassword = protocol === 'trojan' || protocol === 'shadowsocks'
    const usesTransport = ['trojan', 'vless', 'vmess'].includes(protocol)

    const openCreate = () => {
        setEditing(null)
        setImportLink('')
        form.setValues({
            name: '',
            description: '',
            isEnabled: true,
            distributionMode: 'INHERIT',
            targetUserIds: [],
            targetSquadUuids: [],
            config: { ...defaultConfig }
        })
        setOpened(true)
    }

    const openEdit = (outbound: ProxyOutbound) => {
        setEditing(outbound)
        setImportLink('')
        form.setValues({
            name: outbound.name,
            description: outbound.description ?? '',
            isEnabled: outbound.isEnabled,
            distributionMode: outbound.distributionMode,
            targetUserIds: outbound.targetUserIds.map(String),
            targetSquadUuids: outbound.targetSquadUuids,
            config: { ...defaultConfig, ...outbound.config }
        })
        setOpened(true)
    }

    const fillFromProxyLink = (rawLink: string, message = 'Proxy information filled from link.') => {
        const parsed = parseProxyLink(rawLink)
        if (!parsed) {
            notifications.show({
                color: 'red',
                message: 'Unsupported or invalid proxy link.',
                title: 'Import failed'
            })
            return false
        }

        const { name, ...config } = parsed
        setImportLink(rawLink)
        form.setValues({
            ...form.values,
            name: form.values.name.trim() || name || '',
            config: {
                ...defaultConfig,
                ...config
            }
        })
        notifications.show({
            color: 'teal',
            message,
            title: 'Imported'
        })
        return true
    }

    const importProxyLink = () => {
        fillFromProxyLink(importLink)
    }

    const importQrImage = async (file: File | null) => {
        if (!file) return

        setIsScanningQr(true)
        try {
            const link = await scanQrCodeFromImageFile(file)
            fillFromProxyLink(link, 'Proxy information filled from QR code.')
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error instanceof Error ? error.message : 'Unable to scan QR code.',
                title: 'QR scan failed'
            })
        } finally {
            setIsScanningQr(false)
            resetQrFileRef.current?.()
        }
    }

    const submit = form.onSubmit(async (values) => {
        const payload = {
            name: values.name.trim(),
            description: values.description.trim() || null,
            isEnabled: values.isEnabled,
            distributionMode: values.distributionMode,
            targetUserIds: values.targetUserIds.map(Number),
            targetSquadUuids: values.targetSquadUuids,
            config: values.config
        }
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    variables: { uuid: editing.uuid, ...payload }
                })
            } else {
                await createMutation.mutateAsync({ variables: payload })
            }
            setOpened(false)
            await refetch()
            notifications.show({
                color: 'teal',
                message: 'Proxy outbound saved.',
                title: 'Success'
            })
        } catch {
            notifications.show({
                color: 'red',
                message: 'Failed to save proxy outbound.',
                title: 'Error'
            })
        }
    })

    const remove = (outbound: ProxyOutbound) =>
        modals.openConfirmModal({
            centered: true,
            children:
                'Rules using this outbound will keep their configuration but lose the outbound binding.',
            confirmProps: { color: 'red' },
            labels: { cancel: 'Cancel', confirm: 'Delete' },
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync({ route: { uuid: outbound.uuid } })
                    await refetch()
                } catch {
                    notifications.show({
                        color: 'red',
                        message: 'Failed to delete proxy outbound.',
                        title: 'Error'
                    })
                }
            },
            title: `Delete ${outbound.name}?`
        })

    const testOutbound = async (outbound: ProxyOutbound) => {
        try {
            const result = await testMutation.mutateAsync({
                variables: { uuid: outbound.uuid }
            })
            notifications.show({
                color: result.success ? 'teal' : 'red',
                message: result.success
                    ? `${result.message} ${result.latencyMs ?? 0} ms`
                    : result.message,
                title: result.success ? 'Connection succeeded' : 'Connection failed'
            })
        } catch {
            notifications.show({
                color: 'red',
                message: 'Unable to test this proxy outbound.',
                title: 'Connection test failed'
            })
        }
    }

    const applyBulkDistribution = bulkForm.onSubmit(async (values) => {
        const targets = remoteOutbounds.filter((outbound) => selected.includes(outbound.uuid))
        await Promise.all(
            targets.map((outbound) =>
                updateMutation.mutateAsync({
                    variables: {
                        uuid: outbound.uuid,
                        distributionMode: values.distributionMode,
                        targetUserIds: values.targetUserIds.map(Number),
                        targetSquadUuids: values.targetSquadUuids
                    }
                })
            )
        )
        setBulkOpened(false)
        setSelected([])
        await refetch()
        notifications.show({
            color: 'teal',
            message: `Updated distribution for ${targets.length} nodes.`
        })
    })

    return (
        <>
            <Paper maw="100%" p="md" radius="sm" style={{ overflow: 'hidden' }} withBorder>
                <Group align="flex-start" justify="space-between" mb="md" wrap="wrap">
                    <div style={{ minWidth: 0 }}>
                        <Text fw={600}>Proxy Outbounds</Text>
                        <Text c="dimmed" size="sm">
                            Reusable upstream proxies for rule-based routing.
                        </Text>
                    </div>
                    <Group>
                        <Button
                            disabled={selected.length === 0}
                            onClick={() => setBulkOpened(true)}
                            variant="light"
                        >
                            Set distribution ({selected.length})
                        </Button>
                        <Button leftSection={<PiPlus size={16} />} onClick={openCreate}>
                            Add outbound
                        </Button>
                    </Group>
                </Group>

                <Table.ScrollContainer minWidth={720}>
                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th w={44}>
                                    <Checkbox
                                        checked={allRemoteSelected}
                                        indeterminate={selected.length > 0 && !allRemoteSelected}
                                        onChange={(event) =>
                                            setSelected(
                                                event.currentTarget.checked
                                                    ? remoteOutbounds.map((item) => item.uuid)
                                                    : []
                                            )
                                        }
                                    />
                                </Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Protocol</Table.Th>
                                <Table.Th>Endpoint</Table.Th>
                                <Table.Th w={150}>Status</Table.Th>
                                <Table.Th w={132} />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {outbounds.map((outbound) => (
                                <Table.Tr key={outbound.uuid}>
                                    <Table.Td>
                                        {outbound.subscriptionUuid && (
                                            <Checkbox
                                                checked={selected.includes(outbound.uuid)}
                                                onChange={(event) =>
                                                    setSelected((current) =>
                                                        event.currentTarget.checked
                                                            ? [...current, outbound.uuid]
                                                            : current.filter(
                                                                  (uuid) => uuid !== outbound.uuid
                                                              )
                                                    )
                                                }
                                            />
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={500} size="sm">
                                            {outbound.name}
                                        </Text>
                                        {outbound.description && (
                                            <Text c="dimmed" size="xs">
                                                {outbound.description}
                                            </Text>
                                        )}
                                        {outbound.subscriptionUuid && (
                                            <Badge mt={4} size="xs" variant="outline">
                                                {outbound.distributionMode === 'INHERIT'
                                                    ? 'Distribution: inherited'
                                                    : outbound.distributionMode === 'NONE'
                                                      ? 'Distribution: off'
                                                      : outbound.distributionMode === 'ALL'
                                                        ? 'Distribution: all users'
                                                        : `Distribution: ${outbound.targetUserIds.length} users / ${outbound.targetSquadUuids.length} groups`}
                                            </Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light">{outbound.config.protocol}</Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text ff="monospace" size="sm">
                                            {outbound.config.address}:{outbound.config.port}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: 150 }}>
                                        <Stack align="flex-start" gap={3}>
                                            <Badge
                                                color={outbound.isEnabled ? 'teal' : 'gray'}
                                                variant="light"
                                            >
                                                {outbound.isEnabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                            <Badge
                                                color={getHealthColor(outbound.healthStatus)}
                                                variant="dot"
                                            >
                                                {outbound.healthStatus === 'HEALTHY'
                                                    ? `${outbound.lastLatencyMs ?? 0} ms`
                                                    : outbound.healthStatus}
                                            </Badge>
                                            {outbound.lastHealthCheckAt && (
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                    style={{ whiteSpace: 'nowrap' }}
                                                >
                                                    {new Date(
                                                        outbound.lastHealthCheckAt
                                                    ).toLocaleString()}
                                                </Text>
                                            )}
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                        <Group gap={4} justify="flex-end" wrap="nowrap">
                                            <Tooltip label="Test connection">
                                                <ActionIcon
                                                    loading={testMutation.isPending}
                                                    onClick={() => testOutbound(outbound)}
                                                    variant="subtle"
                                                >
                                                    <PiPlayCircle size={17} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Edit">
                                                <ActionIcon
                                                    onClick={() => openEdit(outbound)}
                                                    variant="subtle"
                                                >
                                                    <PiPencilSimple size={17} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Delete">
                                                <ActionIcon
                                                    color="red"
                                                    onClick={() => remove(outbound)}
                                                    variant="subtle"
                                                >
                                                    <PiTrash size={17} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {outbounds.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text c="dimmed" py="lg" ta="center">
                                            No proxy outbounds configured.
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            <Modal
                onClose={() => setOpened(false)}
                opened={opened}
                size="lg"
                title={editing ? 'Edit proxy outbound' : 'New proxy outbound'}
            >
                <form onSubmit={submit}>
                    <Stack gap="md">
                        <Textarea
                            autosize
                            label="Import proxy link"
                            maxRows={4}
                            minRows={2}
                            onChange={(event) => setImportLink(event.currentTarget.value)}
                            placeholder="Paste ss://, vless://, vmess://, trojan://, socks5:// or http:// link"
                            value={importLink}
                        />
                        <Group>
                            <Button
                                disabled={!importLink.trim()}
                                leftSection={<PiLink size={16} />}
                                onClick={importProxyLink}
                                type="button"
                                variant="light"
                            >
                                Parse and fill
                            </Button>
                            <FileButton
                                accept="image/*"
                                onChange={importQrImage}
                                resetRef={resetQrFileRef}
                            >
                                {(props) => (
                                    <Button
                                        leftSection={<PiQrCode size={16} />}
                                        loading={isScanningQr}
                                        type="button"
                                        variant="light"
                                        {...props}
                                    >
                                        Scan QR image
                                    </Button>
                                )}
                            </FileButton>
                        </Group>
                        <TextInput label="Name" required {...form.getInputProps('name')} />
                        <Textarea label="Description" {...form.getInputProps('description')} />
                        <Select
                            data={protocolOptions}
                            label="Protocol"
                            required
                            {...form.getInputProps('config.protocol')}
                        />
                        <Group grow>
                            <TextInput
                                label="Address"
                                required
                                {...form.getInputProps('config.address')}
                            />
                            <NumberInput
                                label="Port"
                                max={65535}
                                min={1}
                                required
                                {...form.getInputProps('config.port')}
                            />
                        </Group>

                        {usesCredentials && (
                            <Group grow>
                                <TextInput
                                    label="Username"
                                    {...form.getInputProps('config.username')}
                                />
                                <PasswordInput
                                    label="Password"
                                    {...form.getInputProps('config.password')}
                                />
                            </Group>
                        )}
                        {usesUuid && (
                            <TextInput
                                label="UUID"
                                required
                                {...form.getInputProps('config.uuid')}
                            />
                        )}
                        {usesPassword && (
                            <PasswordInput
                                label="Password"
                                required
                                {...form.getInputProps('config.password')}
                            />
                        )}
                        {protocol === 'shadowsocks' && (
                            <TextInput
                                label="Encryption method"
                                placeholder="aes-128-gcm"
                                {...form.getInputProps('config.method')}
                            />
                        )}
                        {protocol === 'vless' && (
                            <TextInput label="Flow" {...form.getInputProps('config.flow')} />
                        )}
                        {protocol === 'vmess' && (
                            <Group grow>
                                <NumberInput
                                    label="Alter ID"
                                    min={0}
                                    {...form.getInputProps('config.alterId')}
                                />
                                <TextInput
                                    label="Security"
                                    {...form.getInputProps('config.security')}
                                />
                            </Group>
                        )}
                        {usesTransport && (
                            <>
                                <Group grow>
                                    <Select
                                        data={['tcp', 'ws', 'grpc', 'h2', 'xhttp']}
                                        label="Transport"
                                        {...form.getInputProps('config.network')}
                                    />
                                    <Select
                                        data={['none', 'tls', 'reality']}
                                        label="TLS security"
                                        {...form.getInputProps('config.tlsSecurity')}
                                    />
                                </Group>
                                {form.values.config.tlsSecurity !== 'none' && (
                                    <Group grow>
                                        <TextInput
                                            label="SNI"
                                            {...form.getInputProps('config.sni')}
                                        />
                                        <TextInput
                                            label="Fingerprint"
                                            placeholder="chrome"
                                            {...form.getInputProps('config.fingerprint')}
                                        />
                                    </Group>
                                )}
                                {form.values.config.tlsSecurity === 'reality' && (
                                    <>
                                        <TextInput
                                            label="Reality public key"
                                            required
                                            {...form.getInputProps('config.realityPublicKey')}
                                        />
                                        <Group grow>
                                            <TextInput
                                                label="Reality short ID"
                                                {...form.getInputProps('config.realityShortId')}
                                            />
                                            <TextInput
                                                label="Reality SpiderX"
                                                placeholder="/"
                                                {...form.getInputProps('config.realitySpiderX')}
                                            />
                                        </Group>
                                    </>
                                )}
                                {form.values.config.network === 'ws' && (
                                    <Group grow>
                                        <TextInput
                                            label="WebSocket path"
                                            {...form.getInputProps('config.wsPath')}
                                        />
                                        <TextInput
                                            label="WebSocket host"
                                            {...form.getInputProps('config.wsHost')}
                                        />
                                    </Group>
                                )}
                                {form.values.config.network === 'grpc' && (
                                    <TextInput
                                        label="gRPC service name"
                                        {...form.getInputProps('config.grpcServiceName')}
                                    />
                                )}
                            </>
                        )}
                        <Switch
                            checked={form.values.isEnabled}
                            label="Enabled"
                            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
                        />
                        {editing?.subscriptionUuid && (
                            <>
                                <Select
                                    data={[
                                        { label: 'Inherit subscription setting', value: 'INHERIT' },
                                        { label: 'Do not distribute this node', value: 'NONE' },
                                        { label: 'Distribute to all users', value: 'ALL' },
                                        {
                                            label: 'Distribute to selected users/groups',
                                            value: 'SELECTED'
                                        }
                                    ]}
                                    label="Node distribution"
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
                                            data={(squadsResponse?.internalSquads ?? []).map(
                                                (squad) => ({
                                                    value: squad.uuid,
                                                    label: squad.name
                                                })
                                            )}
                                            label="Internal groups"
                                            searchable
                                            {...form.getInputProps('targetSquadUuids')}
                                        />
                                    </>
                                )}
                            </>
                        )}
                        <Group justify="flex-end">
                            <Button onClick={() => setOpened(false)} variant="default">
                                Cancel
                            </Button>
                            <Button
                                loading={createMutation.isPending || updateMutation.isPending}
                                type="submit"
                            >
                                Save
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
            <Modal
                centered
                onClose={() => setBulkOpened(false)}
                opened={bulkOpened}
                title={`Set distribution for ${selected.length} nodes`}
            >
                <form onSubmit={applyBulkDistribution}>
                    <Stack>
                        <Select
                            data={[
                                { label: 'Inherit subscription setting', value: 'INHERIT' },
                                { label: 'Do not distribute', value: 'NONE' },
                                { label: 'Distribute to all users', value: 'ALL' },
                                { label: 'Selected users/groups', value: 'SELECTED' }
                            ]}
                            label="Distribution"
                            {...bulkForm.getInputProps('distributionMode')}
                        />
                        {bulkForm.values.distributionMode === 'SELECTED' && (
                            <>
                                <MultiSelect
                                    data={(usersResponse?.users ?? []).map((user) => ({
                                        value: String(user.id),
                                        label: user.username
                                    }))}
                                    label="Users"
                                    searchable
                                    {...bulkForm.getInputProps('targetUserIds')}
                                />
                                <MultiSelect
                                    data={(squadsResponse?.internalSquads ?? []).map((squad) => ({
                                        value: squad.uuid,
                                        label: squad.name
                                    }))}
                                    label="Internal groups"
                                    searchable
                                    {...bulkForm.getInputProps('targetSquadUuids')}
                                />
                            </>
                        )}
                        <Button loading={updateMutation.isPending} type="submit">
                            Apply
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </>
    )
}
