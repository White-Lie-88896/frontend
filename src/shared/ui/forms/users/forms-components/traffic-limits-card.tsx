import { CreateUserCommand, RESET_PERIODS, UpdateUserCommand } from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { NumberInput, Select, Stack, Text } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { UseFormReturnType } from '@mantine/form'
import { PiClockDuotone } from 'react-icons/pi'
import { useTranslation } from 'react-i18next'
import { TbCalendarEvent, TbChartLine } from 'react-icons/tb'

import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { resetDataStrategy } from '@shared/constants/forms'
import { SectionCard } from '@shared/ui/section-card'

type UserTrafficFormValues = (CreateUserCommand.Request | UpdateUserCommand.Request) & {
    trafficResetDay?: number
}

const RESET_DAY_CALENDAR_YEAR = 2024
const RESET_DAY_CALENDAR_MONTH = 0

const getResetDayCalendarValue = (day: number | undefined) => {
    return new Date(RESET_DAY_CALENDAR_YEAR, RESET_DAY_CALENDAR_MONTH, day ?? 1)
}

interface IProps<T extends UserTrafficFormValues> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

export const TrafficLimitsCard = <T extends UserTrafficFormValues>(props: IProps<T>) => {
    const { i18n, t } = useTranslation()

    const { cardVariants, motionWrapper, form } = props

    const MotionWrapper = motionWrapper

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="violet"
                        IconComponent={TbChartLine}
                        iconSize={20}
                        iconVariant="soft"
                        title={t('traffic-limits-card.traffic-and-limits')}
                        titleOrder={5}
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <Stack gap="md">
                        <NumberInput
                            allowDecimal={false}
                            allowNegative={false}
                            decimalScale={0}
                            description={t('create-user-modal.widget.data-limit-description')}
                            key={form.key('trafficLimitBytes')}
                            label={t('create-user-modal.widget.data-limit')}
                            leftSection={
                                <Text
                                    display="flex"
                                    size="0.75rem"
                                    style={{ justifyContent: 'center' }}
                                    ta="center"
                                    w={26}
                                >
                                    GB
                                </Text>
                            }
                            thousandSeparator=","
                            {...form.getInputProps('trafficLimitBytes')}
                            styles={{
                                label: { fontWeight: 500 }
                            }}
                        />

                        <Select
                            allowDeselect={false}
                            comboboxProps={{
                                transitionProps: { transition: 'fade', duration: 200 }
                            }}
                            data={resetDataStrategy(t)}
                            defaultValue={form.values.trafficLimitStrategy}
                            description={t(
                                'create-user-modal.widget.traffic-reset-strategy-description'
                            )}
                            key={form.key('trafficLimitStrategy')}
                            label={t('create-user-modal.widget.traffic-reset-strategy')}
                            leftSection={<PiClockDuotone size="16px" />}
                            placeholder={t('create-user-modal.widget.pick-value')}
                            {...form.getInputProps('trafficLimitStrategy')}
                            styles={{
                                label: { fontWeight: 500 }
                            }}
                        />

                        {form.values.trafficLimitStrategy === RESET_PERIODS.MONTH && (
                            <DatePickerInput
                                clearable={false}
                                description={t(
                                    'create-user-modal.widget.traffic-reset-day-description'
                                )}
                                dropdownType="popover"
                                firstDayOfWeek={1}
                                highlightToday={false}
                                key={form.key('trafficResetDay')}
                                label={t('create-user-modal.widget.traffic-reset-day')}
                                leftSection={<TbCalendarEvent size="16px" />}
                                locale={i18n.language}
                                maxDate={new Date(RESET_DAY_CALENDAR_YEAR, 0, 31)}
                                minDate={new Date(RESET_DAY_CALENDAR_YEAR, 0, 1)}
                                onChange={(date) => {
                                    if (date) {
                                        form.setFieldValue(
                                            'trafficResetDay',
                                            new Date(date).getDate() as never
                                        )
                                    }
                                }}
                                value={getResetDayCalendarValue(form.values.trafficResetDay)}
                                valueFormat={t(
                                    'create-user-modal.widget.traffic-reset-day-value-format'
                                )}
                                styles={{
                                    label: { fontWeight: 500 }
                                }}
                            />
                        )}
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
