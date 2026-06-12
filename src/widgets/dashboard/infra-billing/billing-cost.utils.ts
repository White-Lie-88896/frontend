import { GetInfraBillingNodesCommand } from '@remnawave/backend-contract'
import { TFunction } from 'i18next'
import dayjs from 'dayjs'

export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type BillingCurrency = 'USD' | 'CNY' | 'EUR'
export type BillingNode = GetInfraBillingNodesCommand.Response['response']['billingNodes'][number]

export interface BillingCostBreakdown {
    amount: number
    currency: BillingCurrency
}

export interface ProviderRenewalCost {
    count: number
    monthlyCosts: BillingCostBreakdown[]
    providerFaviconLink: null | string
    providerLoginUrl: null | string
    providerName: string
    providerUuid: string
    yearlyCosts: BillingCostBreakdown[]
}

export const BILLING_CYCLE_OPTIONS = (t: TFunction) => [
    {
        label: t('billing-cost.cycle.monthly'),
        value: 'MONTHLY'
    },
    {
        label: t('billing-cost.cycle.yearly'),
        value: 'YEARLY'
    }
]

export const BILLING_CURRENCY_OPTIONS = [
    { label: 'USD', value: 'USD' },
    { label: 'CNY', value: 'CNY' },
    { label: 'EUR', value: 'EUR' }
]

const BILLING_CURRENCY_SYMBOLS: Record<BillingCurrency, string> = {
    USD: '$',
    CNY: '¥',
    EUR: '€'
}

export function getBillingCurrencySymbol(currency: string | undefined) {
    const normalizedCurrency = (currency ?? 'USD') as BillingCurrency
    return BILLING_CURRENCY_SYMBOLS[normalizedCurrency] ?? `${normalizedCurrency} `
}

export function formatBillingCurrency(amount: number, currency: string | undefined) {
    const symbol = getBillingCurrencySymbol(currency)
    return `${symbol}${amount.toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    })}`
}

export function formatBillingCostBreakdown(costs: BillingCostBreakdown[]) {
    if (costs.length === 0) {
        return formatBillingCurrency(0, 'USD')
    }

    return costs.map((cost) => formatBillingCurrency(cost.amount, cost.currency)).join(' / ')
}

export function getBillingCycleLabel(cycle: string | undefined, t: TFunction) {
    if (cycle === 'YEARLY') {
        return t('billing-cost.cycle.yearly')
    }

    return t('billing-cost.cycle.monthly')
}

export function getMonthlyRenewalCost(amount: number, cycle: string | undefined) {
    if (cycle === 'YEARLY') {
        return amount / 12
    }

    return amount
}

export function getYearlyRenewalCost(amount: number, cycle: string | undefined) {
    if (cycle === 'YEARLY') {
        return amount
    }

    return amount * 12
}

export function getNextBillingDate(currentDate: Date, cycle: string | undefined) {
    return dayjs(currentDate).add(1, cycle === 'YEARLY' ? 'year' : 'month')
}

export function getRenewalStatus({
    billingAmount,
    nextBillingAt,
    t
}: {
    billingAmount: number
    nextBillingAt: Date
    t: TFunction
}) {
    if (billingAmount <= 0) {
        return {
            color: 'gray',
            label: t('billing-cost.status.unconfigured')
        }
    }

    const today = dayjs().startOf('day')
    const target = dayjs(nextBillingAt).startOf('day')
    const daysUntil = target.diff(today, 'day')

    if (daysUntil < 0) {
        return {
            color: 'red',
            label: t('billing-cost.status.overdue')
        }
    }

    if (daysUntil <= 7) {
        return {
            color: 'orange',
            label: t('billing-cost.status.due-soon')
        }
    }

    return {
        color: 'teal',
        label: t('billing-cost.status.normal')
    }
}

export function getProviderRenewalCosts(nodes: BillingNode[]): ProviderRenewalCost[] {
    const grouped = new Map<string, ProviderRenewalCost>()

    for (const node of nodes) {
        const current = grouped.get(node.provider.uuid) ?? {
            count: 0,
            monthlyCosts: [],
            providerFaviconLink: node.provider.faviconLink,
            providerLoginUrl: node.provider.loginUrl,
            providerName: node.provider.name,
            providerUuid: node.provider.uuid,
            yearlyCosts: []
        }

        const currency = (node.billingCurrency ?? 'USD') as BillingCurrency
        const currentMonthlyCost = current.monthlyCosts.find((cost) => cost.currency === currency)
        const currentYearlyCost = current.yearlyCosts.find((cost) => cost.currency === currency)

        current.count += 1

        if (currentMonthlyCost) {
            currentMonthlyCost.amount += getMonthlyRenewalCost(node.billingAmount, node.billingCycle)
        } else {
            current.monthlyCosts.push({
                amount: getMonthlyRenewalCost(node.billingAmount, node.billingCycle),
                currency
            })
        }

        if (currentYearlyCost) {
            currentYearlyCost.amount += getYearlyRenewalCost(node.billingAmount, node.billingCycle)
        } else {
            current.yearlyCosts.push({
                amount: getYearlyRenewalCost(node.billingAmount, node.billingCycle),
                currency
            })
        }

        grouped.set(node.provider.uuid, current)
    }

    return Array.from(grouped.values())
        .map((provider) => ({
            ...provider,
            monthlyCosts: provider.monthlyCosts.map((cost) => ({
                ...cost,
                amount: Number(cost.amount.toFixed(2))
            })),
            yearlyCosts: provider.yearlyCosts.map((cost) => ({
                ...cost,
                amount: Number(cost.amount.toFixed(2))
            }))
        }))
        .sort(
            (a, b) =>
                b.yearlyCosts.reduce((sum, cost) => sum + cost.amount, 0) -
                a.yearlyCosts.reduce((sum, cost) => sum + cost.amount, 0)
        )
}
