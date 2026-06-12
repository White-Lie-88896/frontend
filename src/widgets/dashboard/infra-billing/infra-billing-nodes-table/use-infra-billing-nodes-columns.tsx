import {
    ActionIcon,
    ActionIconGroup,
    Avatar,
    Badge,
    Center,
    Flex,
    Group,
    Stack,
    Text,
    Tooltip
} from '@mantine/core'
import { GetInfraBillingNodesCommand } from '@remnawave/backend-contract'
import { HiCalendar, HiOfficeBuilding, HiServer } from 'react-icons/hi'
import { TbCheckbox, TbClick, TbCurrencyDollar, TbExternalLink, TbPencil } from 'react-icons/tb'
import { DataTableColumn } from 'mantine-datatable'
import ReactCountryFlag from 'react-country-flag'
import { TFunction } from 'i18next'

import { faviconResolver } from '@shared/utils/misc'

import {
    formatBillingCurrency,
    getBillingCycleLabel,
    getRenewalStatus
} from '../billing-cost.utils'
import { InfraBillingNodesTableNextBillingAtCell } from './next-billing-at-cell'
import { InfraProvidersColumnTitle } from './column-title'

export function getInfraBillingNodesColumns(
    handleQuickUpdateNextBillingAt: (uuid: string, currentDate: Date) => void,
    handleOpenEditBillingNode: (
        node: GetInfraBillingNodesCommand.Response['response']['billingNodes'][number]
    ) => void,
    isQuickUpdatePending: (uuid: string) => boolean,
    t: TFunction
): DataTableColumn<
    // handleOpenModal: (row: GetInfraBillingHistoryRecordsCommand.Response['response']['records'][number]) => void,
    GetInfraBillingNodesCommand.Response['response']['billingNodes'][number]
>[] {
    return [
        {
            accessor: 'node',
            ellipsis: true,
            title: (
                <InfraProvidersColumnTitle
                    icon={HiServer}
                    title={t('use-infra-billing-nodes-columns.node')}
                />
            ),
            width: 280,
            render: ({ node }) => (
                <Flex align="center" gap="xs">
                    {node.countryCode && node.countryCode !== 'XX' && (
                        <ReactCountryFlag
                            countryCode={node.countryCode}
                            style={{
                                fontSize: '1.5em',
                                borderRadius: '2px'
                            }}
                        />
                    )}
                    <Text fw={600} size="sm">
                        {node.name}
                    </Text>
                </Flex>
            )
        },
        {
            accessor: 'provider.name',
            ellipsis: true,
            title: (
                <InfraProvidersColumnTitle
                    icon={HiOfficeBuilding}
                    title={t('use-infra-billing-nodes-columns.hoster-name')}
                />
            ),
            width: 190,
            render: ({ provider }) => (
                <Flex
                    align="center"
                    gap="sm"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    style={{
                        cursor: 'pointer'
                    }}
                    title={`Click to open ${provider.loginUrl || ''}`}
                >
                    <Avatar
                        alt={provider.name}
                        color="initials"
                        name={provider.name}
                        onLoad={(event) => {
                            const img = event.target as HTMLImageElement
                            if (img.naturalWidth <= 16 && img.naturalHeight <= 16) {
                                img.src = ''
                            }
                        }}
                        radius="sm"
                        size={18}
                        src={faviconResolver(provider.faviconLink)}
                    />
                    <Text fw={500} size="sm">
                        {provider.name}
                    </Text>
                    <TbExternalLink
                        color="var(--mantine-color-gray-5)"
                        size={14}
                        style={{ flexShrink: 0 }}
                    />
                </Flex>
            )
        },
        {
            accessor: 'billingAmount',
            ellipsis: true,
            title: (
                <InfraProvidersColumnTitle
                    icon={TbCurrencyDollar}
                    justify="flex-end"
                    title={t('use-infra-billing-nodes-columns.cost')}
                />
            ),
            width: 130,
            textAlign: 'right',
            render: ({ billingAmount, billingCurrency, billingCycle }) => (
                <Stack align="flex-end" gap={0}>
                    <Text fw={700} size="sm">
                        {billingAmount > 0
                            ? formatBillingCurrency(billingAmount, billingCurrency)
                            : '-'}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {getBillingCycleLabel(billingCycle, t)}
                    </Text>
                </Stack>
            )
        },
        {
            accessor: 'nextBillingAt',
            ellipsis: true,
            title: (
                <InfraProvidersColumnTitle
                    icon={HiCalendar}
                    justify="flex-end"
                    title={t('use-infra-billing-nodes-columns.next-billing-at')}
                />
            ),
            width: 200,
            render: ({ nextBillingAt }) => (
                <InfraBillingNodesTableNextBillingAtCell nextBillingAt={nextBillingAt} t={t} />
            )
        },
        {
            accessor: 'renewalStatus',
            ellipsis: true,
            title: t('use-infra-billing-nodes-columns.status'),
            width: 120,
            textAlign: 'center',
            render: ({ billingAmount, nextBillingAt }) => {
                const status = getRenewalStatus({ billingAmount, nextBillingAt, t })

                return (
                    <Badge color={status.color} radius="sm" variant="soft">
                        {status.label}
                    </Badge>
                )
            }
        },
        {
            accessor: 'actions',
            title: (
                <Center>
                    <TbClick size={16} />
                </Center>
            ),
            width: 88,
            resizable: false,
            textAlign: 'center',
            render: (row) => (
                <Group justify="center" wrap="nowrap">
                    <ActionIconGroup>
                        <Tooltip label={t('use-infra-billing-nodes-columns.edit-renewal')} withArrow>
                            <ActionIcon
                                color="blue"
                                onClick={() => handleOpenEditBillingNode(row)}
                                size="md"
                                variant="outline"
                            >
                                <TbPencil size={16} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip
                            label={t('use-infra-billing-nodes-columns.quick-update-to-next-cycle')}
                            withArrow
                        >
                            <ActionIcon
                                color="teal"
                                loading={isQuickUpdatePending(row.uuid)}
                                onClick={() =>
                                    handleQuickUpdateNextBillingAt(row.uuid, row.nextBillingAt)
                                }
                                size="md"
                                variant="outline"
                            >
                                <TbCheckbox size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </ActionIconGroup>
                </Group>
            )
        }
    ]
}
