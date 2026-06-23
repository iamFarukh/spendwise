import {useCallback} from 'react';

import {
  SIP_DAY_OF_MONTH_OPTIONS,
  computeInitialRunDate,
  formatSipDayOfMonth,
} from '@pfos/shared';

import {DayWheelPicker, type WheelOption} from './day-wheel-picker';

const MONTH_OPTIONS: WheelOption[] = SIP_DAY_OF_MONTH_OPTIONS.map(o => ({
  value: o.value,
  cardLabel: String(o.value),
}));

type DayOfMonthPickerProps = {
  value: number;
  onChange: (day: number) => void;
  /** Used to compute the "next deduction" preview in the user's zone. */
  timezone?: string;
  /** Caption above the previewed date. */
  nextLabel?: string;
};

/** SIP day-of-month wheel (1–28) built on the shared premium {@link DayWheelPicker}. */
export function DayOfMonthPicker({
  value,
  onChange,
  timezone = 'Asia/Kolkata',
  nextLabel = 'Next deduction will be on',
}: DayOfMonthPickerProps) {
  const computePreview = useCallback(
    (day: number) => computeInitialRunDate('MONTHLY', day, 1, timezone),
    [timezone],
  );

  return (
    <DayWheelPicker
      value={value}
      onChange={onChange}
      options={MONTH_OPTIONS}
      summaryLabel="Every month on the"
      formatValue={formatSipDayOfMonth}
      computePreview={computePreview}
      previewLabel={nextLabel}
      hint="Days 29–31 vary by month, so we use 1–28 for a reliable schedule."
    />
  );
}
