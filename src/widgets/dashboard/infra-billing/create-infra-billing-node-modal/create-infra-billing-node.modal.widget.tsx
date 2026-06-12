import { CreateInfraBillingNodeCommand } from '@remnawave/backend-contract'
import { zodResolver } from 'mantine-form-zod-resolver'
import { notifications } from '@mantine/notifications'
import { ActionIcon, Button, Group, Modal, MultiSelect, NumberInput, Select, Stack, Tooltip } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { HiCalendar } from 'react-icons/hi'
import { TbPlus, TbServer } from 'react-icons/tb'
import { useForm } from '@mantine/form'
import dayjs from 'dayjs'

import { SelectInfraProviderShared } from '@shared/ui/infra-billing/select-infra-provider/select-infra-provider.shared'
import { SelectBillingNodeShared } from '@shared/ui/infra-billing/select-billing-node/select-billing-node.shared'
import {
    MODALS,
    useModalClose,
    useModalIsOpen,
    useModalsStoreOpenWithData
} from '@entities/dashboard/modal-store'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { QueryKeys, useCreateInfraBillingNode } from '@shared/api/hooks'
import { handleFormErrors } from '@shared/utils/misc'
import { queryClient } from '@shared/api'

import {
    BILLING_CURRENCY_OPTIONS,
    BILLING_CYCLE_OPTIONS,
    BillingCurrency,
    getBillingCurrencySymbol
} from '../billing-cost.utils'

const REMINDER_DAY_OPTIONS = [
    { label: '7 天前', value: '7' },
    { label: '3 天前', value: '3' },
    { label: '到期当天', value: '0' }
]

export function CreateInfraBillingNodeModalWidget() {
    const isOpen = useModalIsOpen(MODALS.CREATE_INFRA_BILLING_NODE_MODAL)
    const close = useModalClose(MODALS.CREATE_INFRA_BILLING_NODE_MODAL)
    const openModalWithData = useModalsStoreOpenWithData()

    const { t, i18n } = useTranslation()

    const form = useForm<CreateInfraBillingNodeCommand.Request>({
        name: 'create-infra-billing-node-form',
        mode: 'uncontrolled',
        validate: zodResolver(
            CreateInfraBillingNodeCommand.RequestSchema.omit({
                providerUuid: true,
                nextBillingAt: true,
                nodeUuid: true
            })
        ),
        initialValues: {
            billingAmount: 0,
            billingCycle: 'MONTHLY',
            billingCurrency: 'USD',
            reminderDays: [7, 3, 0],
            nodeUuid: '',
            providerUuid: '',
            nextBillingAt: new Date()
        }
    })

    const { mutate: createInfraBillingNode, isPending: isCreateInfraBillingNodePending } =
        useCreateInfraBillingNode({
            mutationFns: {
                onSuccess: (data) => {
                    queryClient.setQueryData(
                        QueryKeys.infraBilling.getInfraBillingNodes.queryKey,
                        data
                    )

                    form.reset()

                    close()
                },
                onError: (error) => {
                    handleFormErrors(form, error)
                }
            }
        })

    const handleSubmit = form.onSubmit(async (values) => {
        if (!values.providerUuid || !values.nodeUuid) {
            notifications.show({
                title: t('create-infra-billing-node.modal.widget.error'),
                message: t(
                    'create-infra-billing-node.modal.widget.please-select-a-provider-and-billing-node'
                ),
                color: 'red'
            })

            return
        }
        createInfraBillingNode({
            variables: {
                billingAmount: values.billingAmount ?? 0,
                billingCycle: values.billingCycle ?? 'MONTHLY',
                billingCurrency: values.billingCurrency ?? 'USD',
                reminderDays: values.reminderDays ?? [7, 3, 0],
                providerUuid: values.providerUuid,
                nodeUuid: values.nodeUuid,
                // @ts-expect-error - TODO: fix ZOD schema
                nextBillingAt: values.nextBillingAt
                    ? dayjs(values.nextBillingAt).startOf('day').toISOString()
                    : undefined
            }
        })
    })

    const handleCreateProvider = () => {
        openModalWithData(MODALS.CREATE_INFRA_PROVIDER_DRAWER, {
            onCreated: (provider) => {
                queryClient.refetchQueries({
                    queryKey: QueryKeys.infraBilling.getInfraProviders.queryKey
                })
                form.setValues({
                    providerUuid: provider.uuid
                })
                form.setTouched({
                    providerUuid: true
                })
                form.setDirty({
                    providerUuid: true
                })
            }
        })
    }

    return (
        <Modal
            centered
            keepMounted={false}
            onClose={() => {
                form.reset()
                close()
            }}
            opened={isOpen}
            overlayProps={{ backgroundOpacity: 0.6, blur: 0 }}
            padding="lg"
            size="md"
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbServer}
                    iconVariant="soft"
                    title={t('create-infra-billing-node.modal.widget.billing-node')}
                />
            }
        >
            <form onSubmit={handleSubmit}>
                <Stack>
                    <Stack gap="md">
                        <SelectBillingNodeShared
                            selectedBillingNodeUuid={form.getValues().nodeUuid}
                            setSelectedBillingNodeUuid={(nodeUuid) => {
                                form.setValues({
                                    nodeUuid: nodeUuid ?? undefined
                                })
                                form.setTouched({
                                    nodeUuid: true
                                })
                                form.setDirty({
                                    nodeUuid: true
                                })
                            }}
                        />
                    </Stack>

                    <Stack gap="md">
                        <Group align="flex-end" gap="xs" wrap="nowrap">
                            <Stack flex={1}>
                                <SelectInfraProviderShared
                                    selectedInfraProviderUuid={form.getValues().providerUuid}
                                    setSelectedInfraProviderUuid={(providerUuid) => {
                                        form.setValues({
                                            providerUuid: providerUuid ?? undefined
                                        })
                                        form.setTouched({
                                            providerUuid: true
                                        })
                                        form.setDirty({
                                            providerUuid: true
                                        })
                                    }}
                                />
                            </Stack>

                            <Tooltip label="新建网络提供商" withArrow>
                                <ActionIcon
                                    color="teal"
                                    onClick={handleCreateProvider}
                                    size="input-md"
                                    variant="soft"
                                >
                                    <TbPlus size={22} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Stack>

                    <NumberInput
                        decimalScale={2}
                        fixedDecimalScale
                        key={form.key('billingAmount')}
                        label={t('create-infra-billing-node.modal.widget.billing-amount')}
                        min={0}
                        prefix={getBillingCurrencySymbol(form.getValues().billingCurrency)}
                        thousandSeparator=","
                        {...form.getInputProps('billingAmount')}
                    />

                    <Select
                        allowDeselect={false}
                        data={BILLING_CYCLE_OPTIONS(t)}
                        key={form.key('billingCycle')}
                        label={t('create-infra-billing-node.modal.widget.billing-cycle')}
                        {...form.getInputProps('billingCycle')}
                    />

                    <Select
                        allowDeselect={false}
                        data={BILLING_CURRENCY_OPTIONS}
                        key={form.key('billingCurrency')}
                        label="币种"
                        onChange={(value) => {
                            form.setFieldValue(
                                'billingCurrency',
                                (value ?? 'USD') as BillingCurrency
                            )
                        }}
                        value={form.getValues().billingCurrency}
                    />

                    <MultiSelect
                        clearable
                        data={REMINDER_DAY_OPTIONS}
                        description="CRM 通知会按这里选择的时间发送到已启用的 Telegram/Webhook。"
                        label="续费提醒"
                        onChange={(value) => {
                            form.setFieldValue(
                                'reminderDays',
                                value.map((item) => Number(item))
                            )
                        }}
                        value={(form.getValues().reminderDays ?? [7, 3, 0]).map(String)}
                    />

                    <DatePickerInput
                        data-autofocus
                        key={form.key('nextBillingAt')}
                        label={t('create-infra-billing-node.modal.widget.next-billing-at')}
                        locale={i18n.language}
                        required
                        valueFormat="D MMMM, YYYY"
                        {...form.getInputProps('nextBillingAt')}
                        description={t(
                            'create-infra-billing-node.modal.widget.next-billing-at-description'
                        )}
                        highlightToday
                        leftSection={<HiCalendar size="16px" />}
                        minDate={dayjs().subtract(1, 'day').toDate()}
                    />

                    <Button loading={isCreateInfraBillingNodePending} type="submit">
                        {t('common.create')}
                    </Button>
                </Stack>
            </form>
        </Modal>
    )
}
