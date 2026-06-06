import { CreateUserCommand, RESET_PERIODS, UpdateUserCommand } from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import {
    Input,
    NumberInput,
    Popover,
    Select,
    SimpleGrid,
    Stack,
    Text,
    UnstyledButton
} from '@mantine/core'
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

interface IProps<T extends UserTrafficFormValues> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

export const TrafficLimitsCard = <T extends UserTrafficFormValues>(props: IProps<T>) => {
    const { t } = useTranslation()

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
                            <Stack gap={6}>
                                <Text fw={500} size="sm">
                                    {t('create-user-modal.widget.traffic-reset-day')}
                                </Text>
                                <Text c="dimmed" size="xs">
                                    {t('create-user-modal.widget.traffic-reset-day-description')}
                                </Text>
                                <Popover position="bottom-start" shadow="md" width={300}>
                                    <Popover.Target>
                                        <Input
                                            component="button"
                                            leftSection={<TbCalendarEvent size="16px" />}
                                            pointer
                                            styles={{
                                                input: {
                                                    fontWeight: 400,
                                                    textAlign: 'left'
                                                }
                                            }}
                                            type="button"
                                        >
                                            {t(
                                                'create-user-modal.widget.traffic-reset-day-display',
                                                {
                                                    day: form.values.trafficResetDay ?? 1
                                                }
                                            )}
                                        </Input>
                                    </Popover.Target>
                                    <Popover.Dropdown>
                                        <Text fw={600} mb="sm" size="sm">
                                            {t(
                                                'create-user-modal.widget.traffic-reset-day-picker-title'
                                            )}
                                        </Text>
                                        <SimpleGrid cols={7} spacing={4} verticalSpacing={4}>
                                            {Array.from({ length: 31 }, (_, index) => {
                                                const day = index + 1
                                                const selected =
                                                    day === (form.values.trafficResetDay ?? 1)

                                                return (
                                                    <UnstyledButton
                                                        aria-label={t(
                                                            'create-user-modal.widget.traffic-reset-day-display',
                                                            { day }
                                                        )}
                                                        key={day}
                                                        onClick={() =>
                                                            form.setFieldValue(
                                                                'trafficResetDay',
                                                                day as never
                                                            )
                                                        }
                                                        style={{
                                                            alignItems: 'center',
                                                            aspectRatio: '1',
                                                            background: selected
                                                                ? 'var(--mantine-primary-color-filled)'
                                                                : 'transparent',
                                                            borderRadius:
                                                                'var(--mantine-radius-sm)',
                                                            color: selected
                                                                ? 'var(--mantine-color-white)'
                                                                : 'inherit',
                                                            display: 'flex',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        {day}
                                                    </UnstyledButton>
                                                )
                                            })}
                                        </SimpleGrid>
                                    </Popover.Dropdown>
                                </Popover>
                            </Stack>
                        )}
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
