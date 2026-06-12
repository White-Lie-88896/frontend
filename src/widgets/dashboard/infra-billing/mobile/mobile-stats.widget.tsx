import { Card, Grid, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { MdTrendingUp } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { TbCalendarDollar, TbCalendarExclamation, TbCalendarUp } from 'react-icons/tb'

import { useGetInfraBillingNodes } from '@shared/api/hooks'

import { formatBillingCostBreakdown } from '../billing-cost.utils'

export function MobileStatsWidget() {
    const { data: nodes } = useGetInfraBillingNodes()
    const { t } = useTranslation()
    const renewalCosts = nodes?.stats.renewalCostsByCurrency ?? []

    const stats = [
        {
            icon: TbCalendarDollar,
            color: 'pink',
            value: formatBillingCostBreakdown(
                renewalCosts.map((cost) => ({
                    amount: cost.monthlyRenewalCost,
                    currency: cost.currency
                }))
            ),
            label: t('mobile-stats.widget.monthly-cost')
        },
        {
            icon: MdTrendingUp,
            color: 'violet',
            value: formatBillingCostBreakdown(
                renewalCosts.map((cost) => ({
                    amount: cost.yearlyRenewalCost,
                    currency: cost.currency
                }))
            ),
            label: t('mobile-stats.widget.yearly-cost')
        },
        {
            icon: TbCalendarUp,
            color: 'orange',
            value: nodes?.stats.dueSoonNodesCount ?? 0,
            label: t('mobile-stats.widget.due-soon')
        },
        {
            icon: TbCalendarExclamation,
            color: 'red',
            value: nodes?.stats.overdueNodesCount ?? 0,
            label: t('mobile-stats.widget.overdue')
        }
    ]

    return (
        <Grid gutter="xs" mb="md">
            {stats.map((stat, index) => (
                <Grid.Col key={index} span={6}>
                    <Card padding="sm">
                        <Group gap="xs" wrap="nowrap">
                            <ThemeIcon color={stat.color} radius="md" size="lg" variant="soft">
                                <stat.icon size={18} />
                            </ThemeIcon>
                            <Stack gap={0}>
                                <Text fw={700} size="lg">
                                    {stat.value}
                                </Text>
                                <Text c="dimmed" size="xs">
                                    {stat.label}
                                </Text>
                            </Stack>
                        </Group>
                    </Card>
                </Grid.Col>
            ))}
        </Grid>
    )
}
