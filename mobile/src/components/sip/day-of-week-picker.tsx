import {useCallback} from 'react';

import {computeInitialRunDate, type RecurringFrequency} from '@pfos/shared';

import {DayWheelPicker, type WheelOption} from './day-wheel-picker';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEK_OPTIONS: WheelOption[] = WEEKDAY_SHORT.map((label, i) => ({
  value: i,
  cardLabel: label,
}));

type DayOfWeekPickerProps = {
  /** 0–6 (Sun–Sat). */
  value: number;
  onChange: (day: number) => void;
  /** WEEKLY or BIWEEKLY — drives the summary copy and the preview date. */
  frequency?: RecurringFrequency;
  /** Used to compute the "next run" preview in the user's zone. */
  timezone?: string;
  /** Caption above the previewed date. */
  nextLabel?: string;
};

/** SIP day-of-week wheel (Sun–Sat) built on the shared premium {@link DayWheelPicker}. */
export function DayOfWeekPicker({
  value,
  onChange,
  frequency = 'WEEKLY',
  timezone = 'Asia/Kolkata',
  nextLabel = 'Next deduction will be on',
}: DayOfWeekPickerProps) {
  const everyOther = frequency === 'BIWEEKLY';
  const computePreview = useCallback(
    (day: number) => computeInitialRunDate(frequency, 1, day, timezone),
    [frequency, timezone],
  );

  return (
    <DayWheelPicker
      value={value}
      onChange={onChange}
      options={WEEK_OPTIONS}
      summaryLabel={everyOther ? 'Every other week on' : 'Every week on'}
      formatValue={day => WEEKDAY_LONG[day] ?? 'Monday'}
      computePreview={computePreview}
      previewLabel={nextLabel}
    />
  );
}
