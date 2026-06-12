import { Avatar, Box, Flex, Group, Stack, Text } from '@mantine/core'
import { DataTable, DataTableColumn } from 'mantine-datatable'
import { TbBuildingBank, TbExternalLink } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import { PiEmpty } from 'react-icons/pi'
import { useMemo } from 'react'

import { DataTableShared } from '@shared/ui/table'
import { useGetInfraBillingNodes } from '@shared/api/hooks'
import { faviconResolver } from '@shared/utils/misc'

import {
    formatBillingCostBreakdown,
    getProviderRenewalCosts,
    ProviderRenewalCost
} from '../billing-cost.utils'

const PAGE_SIZE = 500

export function ProviderRenewalCostsWidget() {
    const { data: infraBillingNodes, isFetching } = useGetInfraBillingNodes()
    const { t } = useTranslation()

    const providers = useMemo(
        () => getProviderRenewalCosts(infraBillingNodes?.billingNodes ?? []),
        [infraBillingNodes?.billingNodes]
    )

    const columns: DataTableColumn<ProviderRenewalCost>[] = [
        {
            accessor: 'providerName',
            title: t('provider-renewal-costs.widget.provider'),
            ellipsis: true,
            render: (provider) => (
                <Flex align="center" gap="sm">
                    <Avatar
                        alt={provider.providerName}
                        color="initials"
                        name={provider.providerName}
                        radius="sm"
                        size={18}
                        src={faviconResolver(provider.providerFaviconLink)}
                    />

                    <Stack gap={0}>
                        <Group gap={4} wrap="nowrap">
                            <Text fw={600} size="sm">
                                {provider.providerName}
                            </Text>
                            {provider.providerLoginUrl && (
                                <TbExternalLink color="var(--mantine-color-gray-5)" size={14} />
                            )}
                        </Group>
                        <Text c="dimmed" size="xs">
                            {t('provider-renewal-costs.widget.nodes-count', {
                                count: provider.count
                            })}
                        </Text>
                    </Stack>
                </Flex>
            )
        },
        {
            accessor: 'monthlyCost',
            title: t('provider-renewal-costs.widget.monthly'),
            textAlign: 'right',
            width: 115,
            render: ({ monthlyCosts }) => (
                <Text fw={600} size="sm">
                    {formatBillingCostBreakdown(monthlyCosts)}
                </Text>
            )
        },
        {
            accessor: 'yearlyCost',
            title: t('provider-renewal-costs.widget.yearly'),
            textAlign: 'right',
            width: 115,
            render: ({ yearlyCosts }) => (
                <Text fw={600} size="sm">
                    {formatBillingCostBreakdown(yearlyCosts)}
                </Text>
            )
        }
    ]

    return (
        <DataTableShared.Container shadow="lg">
            <DataTableShared.Title
                icon={<TbBuildingBank size={24} />}
                title={t('provider-renewal-costs.widget.service-provider-costs')}
            />

            <DataTable
                borderRadius="sm"
                columns={columns}
                emptyState={
                    <Stack align="center" gap="xs">
                        <Box mb={4} p={4}>
                            <PiEmpty size={36} strokeWidth={1.5} />
                        </Box>
                        <Text c="dimmed" size="sm">
                            {t('provider-renewal-costs.widget.no-costs-found')}
                        </Text>
                    </Stack>
                }
                fetching={isFetching}
                height={600}
                idAccessor="providerUuid"
                onCellClick={({ record, column }) => {
                    if (record.providerLoginUrl && column.accessor === 'providerName') {
                        window.open(record.providerLoginUrl, '_blank', 'noopener,noreferrer')
                    }
                }}
                onPageChange={() => {}}
                page={1}
                records={providers}
                recordsPerPage={PAGE_SIZE}
                totalRecords={providers.length}
                withColumnBorders
                withTableBorder={false}
            />
        </DataTableShared.Container>
    )
}
