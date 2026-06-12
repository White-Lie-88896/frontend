import { useTranslation } from 'react-i18next'
import { TbCalendarDollar, TbCalendarExclamation } from 'react-icons/tb'
import { MdPayment, MdTrendingUp } from 'react-icons/md'
import { Grid } from '@mantine/core'

import { IMetricCardProps, MetricCardShared } from '@shared/ui/metrics/metric-card'
import { useGetInfraBillingNodes } from '@shared/api/hooks'

import { formatBillingCostBreakdown } from '../billing-cost.utils'

export function StatsWidget() {
    const { data: nodes, isLoading } = useGetInfraBillingNodes()
    const { t } = useTranslation()
    const renewalCosts = nodes?.stats.renewalCostsByCurrency ?? []

    const stats: IMetricCardProps[] = [
        {
            title: t('stats.widget.monthly-renewal-cost'),
            value: formatBillingCostBreakdown(
                renewalCosts.map((cost) => ({
                    amount: cost.monthlyRenewalCost,
                    currency: cost.currency
                }))
            ),
            subtitle: t('stats.widget.normalized-monthly-cost'),
            IconComponent: TbCalendarDollar,
            iconColor: 'pink',
            iconVariant: 'soft'
        },
        {
            title: t('stats.widget.yearly-renewal-cost'),
            value: formatBillingCostBreakdown(
                renewalCosts.map((cost) => ({
                    amount: cost.yearlyRenewalCost,
                    currency: cost.currency
                }))
            ),
            subtitle: t('stats.widget.normalized-yearly-cost'),
            IconComponent: MdTrendingUp,
            iconColor: 'violet',
            iconVariant: 'soft'
        },
        {
            title: t('stats.widget.due-soon'),
            value: nodes?.stats.dueSoonNodesCount ?? 0,
            subtitle: t('stats.widget.within-seven-days'),
            IconComponent: MdPayment,
            iconColor: 'orange',
            iconVariant: 'soft'
        },
        {
            title: t('stats.widget.overdue'),
            value: nodes?.stats.overdueNodesCount ?? 0,
            subtitle: t('stats.widget.needs-attention'),
            IconComponent: TbCalendarExclamation,
            iconColor: 'red',
            iconVariant: 'soft'
        }
    ]

    return (
        <Grid mb="md">
            {stats.map((stat, index) => (
                <Grid.Col key={index} span={{ base: 12, xs: 6, md: 6, sm: 6, lg: 3 }}>
                    <MetricCardShared isLoading={isLoading} key={index} {...stat} />
                </Grid.Col>
            ))}
        </Grid>
    )
}
