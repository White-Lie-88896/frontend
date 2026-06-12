import {
    ActionIcon,
    Badge,
    Button,
    Collapse,
    Divider,
    FileButton,
    Group,
    NumberInput,
    PasswordInput,
    Select,
    Stack,
    Switch,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import {
    ForwardRefComponent,
    HTMLMotionProps,
    Variants
} from 'motion/react'
import { TbLink, TbQrcode, TbRefresh } from 'react-icons/tb'
import { UseFormReturnType } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useEffect, useRef, useState } from 'react'

import {
    CreateNodeCommand,
    ProxyOutbound
    , UpdateNodeCommand 
} from '@remnawave/backend-contract'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { parseProxyLink } from '@shared/utils/parse-proxy-link.util'
import { scanQrCodeFromImageFile } from '@shared/utils/scan-qr-code.util'
import { useGetProxyOutbounds } from '@shared/api/hooks'
import { SectionCard } from '@shared/ui/section-card'

/** 支持的上游代理协议 */
const PROTOCOL_OPTIONS = [
    { label: 'SOCKS5', value: 'socks5' },
    { label: 'HTTP', value: 'http' },
    { label: 'Shadowsocks (SS)', value: 'shadowsocks' },
    { label: 'VLESS', value: 'vless' },
    { label: 'VMess', value: 'vmess' },
    { label: 'Trojan', value: 'trojan' }
]

/** SS 加密方式 */
const SS_METHOD_OPTIONS = [
    { label: 'aes-128-gcm', value: 'aes-128-gcm' },
    { label: 'aes-256-gcm', value: 'aes-256-gcm' },
    { label: 'chacha20-poly1305', value: 'chacha20-poly1305' },
    { label: 'chacha20-ietf-poly1305', value: 'chacha20-ietf-poly1305' },
    { label: '2022-blake3-aes-128-gcm', value: '2022-blake3-aes-128-gcm' },
    { label: '2022-blake3-aes-256-gcm', value: '2022-blake3-aes-256-gcm' },
    { label: '2022-blake3-chacha20-poly1305', value: '2022-blake3-chacha20-poly1305' }
]

/** VLESS/VMess 传输网络 */
const NETWORK_OPTIONS = [
    { label: 'TCP', value: 'tcp' },
    { label: 'WebSocket', value: 'ws' },
    { label: 'gRPC', value: 'grpc' },
    { label: 'HTTP/2', value: 'h2' },
    { label: 'xHTTP', value: 'xhttp' }
]

/** TLS 安全层 */
const TLS_SECURITY_OPTIONS = [
    { label: 'None', value: 'none' },
    { label: 'TLS', value: 'tls' },
    { label: 'Reality', value: 'reality' }
]

/** VLESS Flow 选项 */
const VLESS_FLOW_OPTIONS = [
    { label: 'None', value: '' },
    { label: 'xtls-rprx-vision', value: 'xtls-rprx-vision' }
]

/** VMess 加密方式 */
const VMESS_SECURITY_OPTIONS = [
    { label: 'auto', value: 'auto' },
    { label: 'aes-128-gcm', value: 'aes-128-gcm' },
    { label: 'chacha20-poly1305', value: 'chacha20-poly1305' },
    { label: 'none', value: 'none' }
]

/** TLS 指纹 */
const FINGERPRINT_OPTIONS = [
    { label: 'chrome', value: 'chrome' },
    { label: 'firefox', value: 'firefox' },
    { label: 'safari', value: 'safari' },
    { label: 'ios', value: 'ios' },
    { label: 'android', value: 'android' },
    { label: 'edge', value: 'edge' },
    { label: 'random', value: 'random' },
    { label: 'randomized', value: 'randomized' }
]

export interface ProxyChainConfig {
    address: string
    allowInsecure?: boolean
    alterId?: '' | number
    enabled: boolean
    fingerprint?: string
    flow?: string
    grpcServiceName?: string
    method?: string
    network?: string
    password?: string
    port: '' | number
    protocol: 'http' | 'shadowsocks' | 'socks5' | 'trojan' | 'vless' | 'vmess'
    realityPublicKey?: string
    realityShortId?: string
    realitySpiderX?: string
    security?: string
    sni?: string
    tlsSecurity?: string
    username?: string
    uuid?: string
    wsHost?: string
    wsPath?: string
}

const DEFAULT_CONFIG: ProxyChainConfig = {
    enabled: false,
    protocol: 'socks5',
    address: '',
    port: '',
    method: 'aes-128-gcm',
    flow: '',
    alterId: 0,
    security: 'auto',
    network: 'tcp',
    tlsSecurity: 'none'
}

function parseProxyChainConfig(raw: null | Record<string, unknown> | undefined): ProxyChainConfig {
    if (!raw) return { ...DEFAULT_CONFIG }
    return {
        ...DEFAULT_CONFIG,
        ...raw
    } as ProxyChainConfig
}

interface IProps<T extends CreateNodeCommand.Request | UpdateNodeCommand.Request> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    /** 初始值 — 从节点数据加载 */
    initialConfig?: null | Record<string, unknown>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

export const NodeProxyChainCard = <
    T extends CreateNodeCommand.Request | UpdateNodeCommand.Request
>(
    props: IProps<T>
) => {
    const { cardVariants, form, motionWrapper, initialConfig } = props
    const MotionWrapper = motionWrapper

    const [config, setConfig] = useState<ProxyChainConfig>(() =>
        parseProxyChainConfig(initialConfig as null | Record<string, unknown>)
    )

    const [importUrl, setImportUrl] = useState('')
    const [isScanningQr, setIsScanningQr] = useState(false)
    const resetQrFileRef = useRef<() => void>(null)
    const { data: libraryData } = useGetProxyOutbounds()
    const libraryNodes = (libraryData ?? []) as ProxyOutbound[]

    /** 每当 config 改变时，同步更新 form 中的 proxyChainConfig 字段 */
    useEffect(() => {
        const sanitized: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(config)) {
            if (v !== '' && v !== undefined) {
                sanitized[k] = v
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(form as any).setFieldValue('proxyChainConfig', sanitized)
    }, [config])

    const update = (partial: Partial<ProxyChainConfig>) => {
        setConfig((prev) => ({ ...prev, ...partial }))
    }

    const fillFromProxyLink = (rawLink: string, notify = false) => {
        const parsed = parseProxyLink(rawLink)
        if (!parsed) return false

        update({
            ...parsed,
            enabled: true
        })
        setImportUrl('')

        if (notify) {
            notifications.show({
                color: 'teal',
                message: 'Upstream proxy information filled from QR code.',
                title: 'Imported'
            })
        }

        return true
    }

    const importQrImage = async (file: File | null) => {
        if (!file) return

        setIsScanningQr(true)
        try {
            const link = await scanQrCodeFromImageFile(file)
            if (!fillFromProxyLink(link, true)) {
                setImportUrl(link)
                notifications.show({
                    color: 'red',
                    message: 'The QR code was decoded, but it is not a supported proxy link.',
                    title: 'Import failed'
                })
            }
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

    const proto = config.protocol
    const showSocksHttpAuth = proto === 'socks5' || proto === 'http'
    const showSS = proto === 'shadowsocks'
    const showUUID = proto === 'vless' || proto === 'vmess'
    const showFlow = proto === 'vless'
    const showAlterId = proto === 'vmess'
    const showVMessSecurity = proto === 'vmess'
    const showTrojanPassword = proto === 'trojan'
    const showTransport = proto === 'vless' || proto === 'vmess' || proto === 'trojan'
    const showTlsOptions =
        showTransport && config.tlsSecurity && config.tlsSecurity !== 'none'

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <Group justify="space-between">
                        <Group gap="xs">
                            <BaseOverlayHeader
                                iconColor="violet"
                                IconComponent={TbLink}
                                iconVariant="soft"
                                title="链式代理 (Proxy Chain)"
                                titleOrder={5}
                            />
                        </Group>
                        <Group gap="sm">
                            {config.enabled && (
                                <Badge color="violet" size="sm" variant="light">
                                    已启用
                                </Badge>
                            )}
                            <Tooltip label="重置为默认">
                                <ActionIcon
                                    color="gray"
                                    onClick={() => setConfig({ ...DEFAULT_CONFIG })}
                                    size="sm"
                                    variant="subtle"
                                >
                                    <TbRefresh size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>
                </SectionCard.Section>

                <SectionCard.Section>
                    <Stack gap="md">
                        {/* 启用开关 */}
                        <Switch
                            checked={config.enabled}
                            description="启用后，此节点的出站流量将通过上游代理转发"
                            label="启用上游代理"
                            onChange={(e) => update({ enabled: e.currentTarget.checked })}
                            styles={{ label: { fontWeight: 500 } }}
                        />

                        <Collapse in={config.enabled}>
                            <Stack gap="md">
                                <Divider label="上游代理配置" labelPosition="left" />

                                <Select
                                    clearable
                                    data={libraryNodes.map((node) => ({
                                        label: `${node.name} (${node.config.protocol})`,
                                        value: node.uuid
                                    }))}
                                    label="从远程节点库选择"
                                    onChange={(uuid) => {
                                        const selected = libraryNodes.find(
                                            (node) => node.uuid === uuid
                                        )
                                        if (selected) {
                                            update({
                                                ...selected.config,
                                                enabled: true
                                            })
                                        }
                                    }}
                                    placeholder="选择手动节点或订阅节点"
                                    searchable
                                />

                                <Group align="flex-end" gap="xs">
                                    <TextInput
                                        label="快速导入上游代理链接"
                                        onChange={(e) => {
                                            const val = e.currentTarget.value
                                            setImportUrl(val)
                                            fillFromProxyLink(val)
                                        }}
                                        placeholder="支持粘贴 ss://, vmess://, vless://, trojan://, socks5://, http:// 链接..."
                                        style={{ flex: '1 1 260px' }}
                                        value={importUrl}
                                    />
                                    <FileButton
                                        accept="image/*"
                                        onChange={importQrImage}
                                        resetRef={resetQrFileRef}
                                    >
                                        {(props) => (
                                            <Button
                                                leftSection={<TbQrcode size={16} />}
                                                loading={isScanningQr}
                                                type="button"
                                                variant="light"
                                                {...props}
                                            >
                                                扫描二维码
                                            </Button>
                                        )}
                                    </FileButton>
                                </Group>

                                {/* 协议选择 */}
                                <Select
                                    data={PROTOCOL_OPTIONS}
                                    label="协议"
                                    onChange={(v) =>
                                        update({ protocol: (v as ProxyChainConfig['protocol']) ?? 'socks5' })
                                    }
                                    required
                                    styles={{ label: { fontWeight: 500 } }}
                                    value={config.protocol}
                                />

                                {/* 地址 + 端口 */}
                                <Group gap="xs" grow justify="space-between" w="100%">
                                    <TextInput
                                        label="代理地址"
                                        onChange={(e) => update({ address: e.currentTarget.value })}
                                        placeholder="1.2.3.4 或 example.com"
                                        required
                                        styles={{
                                            label: { fontWeight: 500 },
                                            root: { flex: '1 1 70%' }
                                        }}
                                        value={config.address}
                                    />
                                    <NumberInput
                                        allowDecimal={false}
                                        allowNegative={false}
                                        clampBehavior="strict"
                                        decimalScale={0}
                                        hideControls
                                        label="端口"
                                        max={65535}
                                        min={1}
                                        onChange={(v) => update({ port: v as '' | number })}
                                        placeholder="1080"
                                        required
                                        styles={{
                                            label: { fontWeight: 500 },
                                            root: { flex: '1 1 25%' }
                                        }}
                                        value={config.port}
                                    />
                                </Group>

                                {/* SOCKS5 / HTTP 认证 */}
                                {showSocksHttpAuth && (
                                    <>
                                        <Text c="dimmed" size="xs">
                                            用户名和密码可选（无认证时留空）
                                        </Text>
                                        <Group gap="xs" grow>
                                            <TextInput
                                                label="用户名（可选）"
                                                onChange={(e) =>
                                                    update({ username: e.currentTarget.value })
                                                }
                                                placeholder="username"
                                                styles={{ label: { fontWeight: 500 } }}
                                                value={config.username ?? ''}
                                            />
                                            <PasswordInput
                                                label="密码（可选）"
                                                onChange={(e) =>
                                                    update({ password: e.currentTarget.value })
                                                }
                                                placeholder="password"
                                                styles={{ label: { fontWeight: 500 } }}
                                                value={config.password ?? ''}
                                            />
                                        </Group>
                                    </>
                                )}

                                {/* Shadowsocks */}
                                {showSS && (
                                    <>
                                        <Select
                                            data={SS_METHOD_OPTIONS}
                                            label="加密方式 (Method)"
                                            onChange={(v) => update({ method: v ?? 'aes-128-gcm' })}
                                            required
                                            styles={{ label: { fontWeight: 500 } }}
                                            value={config.method ?? 'aes-128-gcm'}
                                        />
                                        <PasswordInput
                                            label="密码"
                                            onChange={(e) =>
                                                update({ password: e.currentTarget.value })
                                            }
                                            placeholder="shadowsocks password"
                                            required
                                            styles={{ label: { fontWeight: 500 } }}
                                            value={config.password ?? ''}
                                        />
                                    </>
                                )}

                                {/* VLESS / VMess UUID */}
                                {showUUID && (
                                    <TextInput
                                        label="UUID"
                                        onChange={(e) => update({ uuid: e.currentTarget.value })}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        required
                                        styles={{ label: { fontWeight: 500 } }}
                                        value={config.uuid ?? ''}
                                    />
                                )}

                                {/* VLESS Flow */}
                                {showFlow && (
                                    <Select
                                        data={VLESS_FLOW_OPTIONS}
                                        label="Flow"
                                        onChange={(v) => update({ flow: v ?? '' })}
                                        styles={{ label: { fontWeight: 500 } }}
                                        value={config.flow ?? ''}
                                    />
                                )}

                                {/* VMess alterId */}
                                {showAlterId && (
                                    <NumberInput
                                        allowDecimal={false}
                                        allowNegative={false}
                                        decimalScale={0}
                                        hideControls
                                        label="AlterId"
                                        min={0}
                                        onChange={(v) => update({ alterId: v as '' | number })}
                                        styles={{ label: { fontWeight: 500 } }}
                                        value={config.alterId ?? 0}
                                    />
                                )}

                                {/* VMess security (cipher) */}
                                {showVMessSecurity && (
                                    <Select
                                        data={VMESS_SECURITY_OPTIONS}
                                        label="加密方式 (Security)"
                                        onChange={(v) => update({ security: v ?? 'auto' })}
                                        styles={{ label: { fontWeight: 500 } }}
                                        value={config.security ?? 'auto'}
                                    />
                                )}

                                {/* Trojan 密码 */}
                                {showTrojanPassword && (
                                    <PasswordInput
                                        label="Trojan 密码"
                                        onChange={(e) =>
                                            update({ password: e.currentTarget.value })
                                        }
                                        placeholder="trojan password"
                                        required
                                        styles={{ label: { fontWeight: 500 } }}
                                        value={config.password ?? ''}
                                    />
                                )}

                                {/* 传输层 (仅 VLESS/VMess/Trojan) */}
                                {showTransport && (
                                    <>
                                        <Divider label="传输层设置" labelPosition="left" />

                                        <Group gap="xs" grow>
                                            <Select
                                                data={NETWORK_OPTIONS}
                                                label="传输网络"
                                                onChange={(v) => update({ network: v ?? 'tcp' })}
                                                styles={{ label: { fontWeight: 500 } }}
                                                value={config.network ?? 'tcp'}
                                            />
                                            <Select
                                                data={TLS_SECURITY_OPTIONS}
                                                label="TLS"
                                                onChange={(v) =>
                                                    update({ tlsSecurity: v ?? 'none' })
                                                }
                                                styles={{ label: { fontWeight: 500 } }}
                                                value={config.tlsSecurity ?? 'none'}
                                            />
                                        </Group>

                                        {/* WebSocket 设置 */}
                                        {config.network === 'ws' && (
                                            <Group gap="xs" grow>
                                                <TextInput
                                                    label="WS Path"
                                                    onChange={(e) =>
                                                        update({ wsPath: e.currentTarget.value })
                                                    }
                                                    placeholder="/"
                                                    styles={{ label: { fontWeight: 500 } }}
                                                    value={config.wsPath ?? '/'}
                                                />
                                                <TextInput
                                                    label="WS Host"
                                                    onChange={(e) =>
                                                        update({ wsHost: e.currentTarget.value })
                                                    }
                                                    placeholder="example.com"
                                                    styles={{ label: { fontWeight: 500 } }}
                                                    value={config.wsHost ?? ''}
                                                />
                                            </Group>
                                        )}

                                        {/* gRPC 设置 */}
                                        {config.network === 'grpc' && (
                                            <TextInput
                                                label="gRPC Service Name"
                                                onChange={(e) =>
                                                    update({
                                                        grpcServiceName: e.currentTarget.value
                                                    })
                                                }
                                                placeholder="grpc_service"
                                                styles={{ label: { fontWeight: 500 } }}
                                                value={config.grpcServiceName ?? ''}
                                            />
                                        )}

                                        {/* TLS/Reality 设置 */}
                                        {showTlsOptions && (
                                            <>
                                                <Group gap="xs" grow>
                                                    <TextInput
                                                        label="SNI"
                                                        onChange={(e) =>
                                                            update({ sni: e.currentTarget.value })
                                                        }
                                                        placeholder="example.com"
                                                        styles={{ label: { fontWeight: 500 } }}
                                                        value={config.sni ?? ''}
                                                    />
                                                    <Select
                                                        clearable
                                                        data={FINGERPRINT_OPTIONS}
                                                        label="指纹 (Fingerprint)"
                                                        onChange={(v) =>
                                                            update({
                                                                fingerprint: v ?? undefined
                                                            })
                                                        }
                                                        styles={{ label: { fontWeight: 500 } }}
                                                        value={config.fingerprint ?? ''}
                                                    />
                                                </Group>

                                                {config.tlsSecurity === 'reality' && (
                                                    <>
                                                        <TextInput
                                                            label="Reality Public Key"
                                                            onChange={(e) =>
                                                                update({
                                                                    realityPublicKey:
                                                                        e.currentTarget.value
                                                                })
                                                            }
                                                            placeholder="Public key"
                                                            required
                                                            styles={{
                                                                label: { fontWeight: 500 }
                                                            }}
                                                            value={config.realityPublicKey ?? ''}
                                                        />
                                                        <Group gap="xs" grow>
                                                            <TextInput
                                                                label="Reality Short ID"
                                                                onChange={(e) =>
                                                                    update({
                                                                        realityShortId:
                                                                            e.currentTarget.value
                                                                    })
                                                                }
                                                                placeholder="Short ID"
                                                                styles={{
                                                                    label: { fontWeight: 500 }
                                                                }}
                                                                value={
                                                                    config.realityShortId ?? ''
                                                                }
                                                            />
                                                            <TextInput
                                                                label="Reality Spider X"
                                                                onChange={(e) =>
                                                                    update({
                                                                        realitySpiderX:
                                                                            e.currentTarget.value
                                                                    })
                                                                }
                                                                placeholder="/"
                                                                styles={{
                                                                    label: { fontWeight: 500 }
                                                                }}
                                                                value={
                                                                    config.realitySpiderX ?? ''
                                                                }
                                                            />
                                                        </Group>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Collapse>
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
