export type SupportedProxyProtocol =
    | 'http'
    | 'shadowsocks'
    | 'socks5'
    | 'trojan'
    | 'vless'
    | 'vmess'

export interface ParsedProxyLink {
    address: string
    alterId?: number
    fingerprint?: string
    flow?: string
    grpcServiceName?: string
    method?: string
    name?: string
    network?: 'grpc' | 'h2' | 'tcp' | 'ws' | 'xhttp'
    password?: string
    port: number
    protocol: SupportedProxyProtocol
    realityPublicKey?: string
    realityShortId?: string
    realitySpiderX?: string
    security?: string
    sni?: string
    tlsSecurity?: 'none' | 'reality' | 'tls'
    username?: string
    uuid?: string
    wsHost?: string
    wsPath?: string
}

const decodeBase64 = (value: string): string => {
    try {
        let normalized = value.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
        normalized += '='.repeat((4 - normalized.length % 4) % 4)
        return decodeURIComponent(
            Array.from(atob(normalized))
                .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join('')
        )
    } catch {
        return ''
    }
}

const decode = (value: string): string => {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

const parsePort = (value: string, fallback: number): number => {
    const port = Number(value)
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : fallback
}

const parseName = (url: URL): string | undefined => {
    const name = decode(url.hash.replace(/^#/, '')).trim()
    return name || undefined
}

const parseShadowsocks = (link: string): null | ParsedProxyLink => {
    const withoutScheme = link.slice(5)
    const [payload, fragment = ''] = withoutScheme.split('#', 2)
    const name = decode(fragment).trim() || undefined
    const withoutQuery = payload.split('?', 1)[0]

    // Legacy links encode method:password@host:port as one Base64 payload.
    const expanded = withoutQuery.includes('@') ? withoutQuery : decodeBase64(withoutQuery)
    const separator = expanded.lastIndexOf('@')
    if (separator < 0) return null

    let credentials = expanded.slice(0, separator)
    const endpoint = expanded.slice(separator + 1)
    if (!credentials.includes(':')) {
        credentials = decodeBase64(credentials)
    }

    const credentialSeparator = credentials.indexOf(':')
    if (credentialSeparator < 1) return null

    const method = decode(credentials.slice(0, credentialSeparator))
    const password = decode(credentials.slice(credentialSeparator + 1))
    const endpointUrl = new URL(`ss://${endpoint}`)
    if (!endpointUrl.hostname) return null

    return {
        address: endpointUrl.hostname,
        method,
        name,
        password,
        port: parsePort(endpointUrl.port, 8388),
        protocol: 'shadowsocks'
    }
}

const normalizeNetwork = (
    value: null | string
): ParsedProxyLink['network'] => {
    return ['grpc', 'h2', 'tcp', 'ws', 'xhttp'].includes(value ?? '')
        ? value as ParsedProxyLink['network']
        : 'tcp'
}

const normalizeTls = (
    value: null | string
): ParsedProxyLink['tlsSecurity'] => {
    return ['reality', 'tls'].includes(value ?? '')
        ? value as ParsedProxyLink['tlsSecurity']
        : 'none'
}

export const parseProxyLink = (rawLink: string): null | ParsedProxyLink => {
    const link = rawLink.trim()
    if (!link) return null

    try {
        if (link.toLowerCase().startsWith('ss://')) {
            return parseShadowsocks(link)
        }

        if (link.toLowerCase().startsWith('vmess://')) {
            const decoded = decodeBase64(link.slice(8))
            const data = JSON.parse(decoded) as Record<string, unknown>
            const address = typeof data.add === 'string' ? data.add.trim() : ''
            const uuid = typeof data.id === 'string' ? data.id.trim() : ''
            if (!address || !uuid) return null

            return {
                address,
                alterId: Number(data.aid) || 0,
                name: typeof data.ps === 'string' ? data.ps.trim() || undefined : undefined,
                network: normalizeNetwork(typeof data.net === 'string' ? data.net : null),
                port: parsePort(String(data.port ?? ''), 443),
                protocol: 'vmess',
                security: typeof data.scy === 'string' ? data.scy : 'auto',
                sni: typeof data.sni === 'string' ? data.sni : undefined,
                tlsSecurity: normalizeTls(typeof data.tls === 'string' ? data.tls : null),
                uuid,
                wsHost: typeof data.host === 'string' ? data.host : undefined,
                wsPath: typeof data.path === 'string' ? data.path : undefined
            }
        }

        const url = new URL(link)
        const scheme = url.protocol.slice(0, -1).toLowerCase()
        const name = parseName(url)

        if (scheme === 'socks' || scheme === 'socks5' || scheme === 'http' || scheme === 'https') {
            const isSocks = scheme.startsWith('socks')
            let defaultPort = 80
            if (isSocks) defaultPort = 1080
            if (scheme === 'https') defaultPort = 443
            return {
                address: url.hostname,
                name,
                password: url.password ? decode(url.password) : undefined,
                port: parsePort(url.port, defaultPort),
                protocol: isSocks ? 'socks5' : 'http',
                username: url.username ? decode(url.username) : undefined
            }
        }

        if (scheme !== 'vless' && scheme !== 'trojan') return null

        const params = url.searchParams
        const common = {
            address: url.hostname,
            fingerprint: params.get('fp') || undefined,
            grpcServiceName: params.get('serviceName') || params.get('service_name') || undefined,
            name,
            network: normalizeNetwork(params.get('type')),
            port: parsePort(url.port, 443),
            realityPublicKey: params.get('pbk') || params.get('publicKey') || undefined,
            realityShortId: params.get('sid') || params.get('shortId') || undefined,
            realitySpiderX: params.get('spx') || params.get('spiderX') || undefined,
            sni: params.get('sni') || params.get('serverName') || undefined,
            tlsSecurity: normalizeTls(params.get('security')),
            wsHost: params.get('host') || undefined,
            wsPath: params.get('path') || undefined
        }

        if (scheme === 'vless') {
            return {
                ...common,
                flow: params.get('flow') || undefined,
                protocol: 'vless',
                uuid: decode(url.username)
            }
        }

        return {
            ...common,
            password: decode(url.username),
            protocol: 'trojan'
        }
    } catch {
        return null
    }
}
