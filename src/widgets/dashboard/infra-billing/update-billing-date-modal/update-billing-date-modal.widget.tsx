import {
    Button,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Select,
    Stack,
    TextInput
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@mantine/dates'
import { useEffect, useState } from 'react'
import { TbCalendar } from 'react-icons/tb'
import dayjs from 'dayjs'

import { MODALS, useModalClose, useModalState } from '@entities/dashboard/modal-store'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { QueryKeys, useUpdateInfraBillingNode } from '@shared/api/hooks'
import { queryClient } from '@shared/api'

import {
    BILLING_CURRENCY_OPTIONS,
    BILLING_CYCLE_OPTIONS,
    BillingCurrency,
    BillingCycle,
    getBillingCurrencySymbol
} from '../billing-cost.utils'
import styles from './UpdateModal.module.css'

const REMINDER_DAY_OPTIONS = [
    { label: '7 天前', value: '7' },
    { label: '3 天前', value: '3' },
    { label: '到期当天', value: '0' }
]

export function UpdateBillingDateModalWidget() {
    const { isOpen, internalState: billingNode } = useModalState(MODALS.UPDATE_BILLING_DATE_MODAL)
    const close = useModalClose(MODALS.UPDATE_BILLING_DATE_MODAL)

    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [billingAmount, setBillingAmount] = useState(0)
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY')
    const [billingCurrency, setBillingCurrency] = useState<BillingCurrency>('USD')
    const [reminderDays, setReminderDays] = useState<number[]>([7, 3, 0])
    const { t } = useTranslation()

    const { mutate: updateNode, isPending: isLoading } = useUpdateInfraBillingNode({
        mutationFns: {
            onSuccess: (data) => {
                queryClient.setQueryData(QueryKeys.infraBilling.getInfraBillingNodes.queryKey, data)

                if (billingNode && billingNode.callback) {
                    billingNode.callback()
                }

                close()
                setSelectedDate(null)
                setBillingAmount(0)
                setBillingCycle('MONTHLY')
                setBillingCurrency('USD')
                setReminderDays([7, 3, 0])
            },
            onError: () => {}
        }
    })

    useEffect(() => {
        if (billingNode && isOpen) {
            if (billingNode.uuids.length === 1 && billingNode.nextBillingAt) {
                setSelectedDate(new Date(billingNode.nextBillingAt))
                setBillingAmount(billingNode.billingAmount ?? 0)
                setBillingCycle(billingNode.billingCycle ?? 'MONTHLY')
                setBillingCurrency(billingNode.billingCurrency ?? 'USD')
                setReminderDays(billingNode.reminderDays ?? [7, 3, 0])
            } else {
                setSelectedDate(new Date())
                setBillingAmount(0)
                setBillingCycle('MONTHLY')
                setBillingCurrency('USD')
                setReminderDays([7, 3, 0])
            }
        }
    }, [billingNode, isOpen])

    const handleSave = () => {
        if (!billingNode || !selectedDate) return

        updateNode({
            variables: {
                ...(billingNode.uuids.length === 1
                    ? {
                          billingAmount,
                          billingCycle,
                          billingCurrency,
                          reminderDays
                      }
                    : {}),
                uuids: billingNode.uuids,
                // @ts-expect-error - TODO: fix ZOD schema
                nextBillingAt: selectedDate ? dayjs(selectedDate).toISOString() : undefined
            }
        })
    }

    const handleClose = () => {
        close()

        setTimeout(() => {
            setSelectedDate(null)
            setBillingAmount(0)
            setBillingCycle('MONTHLY')
            setBillingCurrency('USD')
            setReminderDays([7, 3, 0])
        }, 300)
    }

    const handleDateChange = (value: null | string) => {
        setSelectedDate(value ? new Date(value) : null)
    }

    return (
        <Modal
            centered
            onClose={handleClose}
            opened={isOpen}
            size="auto"
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbCalendar}
                    iconVariant="soft"
                    title={t('update-billing-date-modal.widget.update-billing-date')}
                />
            }
        >
            <Stack gap="md">
                {billingNode && (
                    <Stack align="center" gap={0} justify="center">
                        {billingNode.uuids.length === 1 && billingNode.nextBillingAt && (
                            <TextInput
                                label={t('update-billing-date-modal.widget.current-date')}
                                mb="xs"
                                readOnly
                                value={dayjs(new Date(billingNode.nextBillingAt)).format(
                                    'D MMMM YYYY'
                                )}
                                w="100%"
                            />
                        )}

                        <TextInput
                            label={t('update-billing-date-modal.widget.new-date')}
                            mb="xs"
                            readOnly
                            value={dayjs(selectedDate).format('D MMMM YYYY')}
                            w="100%"
                        />
                        <DatePicker
                            classNames={styles}
                            defaultDate={selectedDate ?? undefined}
                            maxDate={dayjs().add(10, 'years').toDate()}
                            onChange={handleDateChange}
                            presets={[
                                {
                                    label: t('update-billing-date-modal.widget.today'),
                                    value: dayjs().toISOString()
                                },
                                {
                                    label: t('update-billing-date-modal.widget.tomorrow'),
                                    value: dayjs().add(1, 'day').toISOString()
                                },
                                {
                                    label: t('update-billing-date-modal.widget.next-month'),
                                    value: dayjs(selectedDate ?? dayjs())
                                        .add(1, 'month')
                                        .toISOString()
                                }
                            ]}
                            value={selectedDate}
                        />

                        {billingNode.uuids.length === 1 && (
                            <Stack gap="xs" mt="sm" w="100%">
                                <NumberInput
                                    decimalScale={2}
                                    fixedDecimalScale
                                    label={t(
                                        'update-billing-date-modal.widget.billing-amount'
                                    )}
                                    min={0}
                                    onChange={(value) => {
                                        setBillingAmount(Number(value) || 0)
                                    }}
                                    prefix={getBillingCurrencySymbol(billingCurrency)}
                                    thousandSeparator=","
                                    value={billingAmount}
                                />

                                <Select
                                    allowDeselect={false}
                                    data={BILLING_CYCLE_OPTIONS(t)}
                                    label={t('update-billing-date-modal.widget.billing-cycle')}
                                    onChange={(value) => {
                                        setBillingCycle((value ?? 'MONTHLY') as BillingCycle)
                                    }}
                                    value={billingCycle}
                                />

                                <Select
                                    allowDeselect={false}
                                    data={BILLING_CURRENCY_OPTIONS}
                                    label="币种"
                                    onChange={(value) => {
                                        setBillingCurrency((value ?? 'USD') as BillingCurrency)
                                    }}
                                    value={billingCurrency}
                                />

                                <MultiSelect
                                    clearable
                                    data={REMINDER_DAY_OPTIONS}
                                    description="CRM 通知会按这里选择的时间发送到已启用的 Telegram/Webhook。"
                                    label="续费提醒"
                                    onChange={(value) => {
                                        setReminderDays(value.map((item) => Number(item)))
                                    }}
                                    value={reminderDays.map(String)}
                                />
                            </Stack>
                        )}
                    </Stack>
                )}

                <Group justify="flex-end" mt="lg">
                    <Button disabled={isLoading} onClick={handleClose} variant="default">
                        {t('common.cancel')}
                    </Button>
                    <Button
                        disabled={!selectedDate || !billingNode}
                        loading={isLoading}
                        onClick={handleSave}
                    >
                        {t('update-billing-date-modal.widget.update-renewal')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
