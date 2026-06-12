import { Badge, Box, Tooltip } from '@mantine/core'
import { useMemo } from 'react'

import classes from './build-version-badge.module.css'

const getRuntimeAssetHash = () => {
    if (typeof document === 'undefined') return null

    const scriptUrls = Array.from(document.scripts).map((script) => script.src)
    const stylesheetUrls = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    ).map((link) => link.href)

    for (const url of [...scriptUrls, ...stylesheetUrls]) {
        const match = url.match(/\/assets\/[^/]+-([A-Za-z0-9_-]{6,})\.(?:js|css)(?:\?|$)/)
        if (match?.[1]) return match[1]
    }

    return null
}

export function BuildVersionBadge() {
    const runtimeHash = useMemo(() => getRuntimeAssetHash(), [])
    const buildHash = runtimeHash ?? __BUILD_HASH__
    const visibleVersion = `v${__APP_VERSION__}`

    return (
        <Box className={classes.root}>
            <Tooltip
                label={`Frontend ${visibleVersion} / build ${buildHash} / ${__BUILD_TIME__}`}
                withArrow
            >
                <Badge className={classes.badge} color="gray" size="sm" variant="light">
                    {visibleVersion} / {buildHash}
                </Badge>
            </Tooltip>
        </Box>
    )
}
