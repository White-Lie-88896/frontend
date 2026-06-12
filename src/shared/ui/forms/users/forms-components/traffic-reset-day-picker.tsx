import { Input, Popover, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core'
import { TbCalendarEvent } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'

interface IProps {
    onChange: (day: number) => void
    value?: number
}

export function TrafficResetDayPicker({ onChange, value = 1 }: IProps) {
    const { t } = useTranslation()

    return (
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
                        {t('create-user-modal.widget.traffic-reset-day-display', { day: value })}
                    </Input>
                </Popover.Target>
                <Popover.Dropdown>
                    <Text fw={600} mb="sm" size="sm">
                        {t('create-user-modal.widget.traffic-reset-day-picker-title')}
                    </Text>
                    <SimpleGrid cols={7} spacing={4} verticalSpacing={4}>
                        {Array.from({ length: 31 }, (_, index) => {
                            const day = index + 1
                            const selected = day === value

                            return (
                                <UnstyledButton
                                    aria-label={t(
                                        'create-user-modal.widget.traffic-reset-day-display',
                                        { day }
                                    )}
                                    key={day}
                                    onClick={() => onChange(day)}
                                    style={{
                                        alignItems: 'center',
                                        aspectRatio: '1',
                                        background: selected
                                            ? 'var(--mantine-primary-color-filled)'
                                            : 'transparent',
                                        borderRadius: 'var(--mantine-radius-sm)',
                                        color: selected ? 'var(--mantine-color-white)' : 'inherit',
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
    )
}
