import {useCallback, useMemo} from 'react';

import {
  SUBSCRIPTION_DAY_OF_MONTH_OPTIONS,
  computeInitialRenewalDate,
  formatRenewalDayOfMonth,
  getBillingCycleLabel,
  type SubscriptionBillingCycle,
} from '@pfos/shared';

import {
  DayWheelPicker,
  type WheelOption,
} from '@/components/sip/day-wheel-picker';

const MONTH_OPTIONS: WheelOption[] = SUBSCRIPTION_DAY_OF_MONTH_OPTIONS.map(o => ({
  value: o.value,
  cardLabel: String(o.value),
}));

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

type RenewalDatePickerProps = {
  billingCycle: SubscriptionBillingCycle;
  /** Day-of-month (1–28) for non-weekly cycles; weekday (0–6) for weekly. */
  value: number;
  onChange: (value: number) => void;
  timezone?: string;
};

/**
 * Renewal-day picker for subscriptions — the same premium wheel used by SIP,
 * but the "next renewal" preview respects the chosen billing cycle. Weekly
 * cycles pick a weekday; all other cycles pick a 1–28 day-of-month.
 */
export function RenewalDatePicker({
  billingCycle,
  value,
  onChange,
  timezone = 'Asia/Kolkata',
}: RenewalDatePickerProps) {
  const isWeekly = billingCycle === 'WEEKLY';

  const computePreview = useCallback(
    (val: number) => computeInitialRenewalDate(billingCycle, val, timezone),
    [billingCycle, timezone],
  );

  const summaryLabel = useMemo(() => {
    if (isWeekly) {
      return 'Every week on';
    }
    return `${getBillingCycleLabel(billingCycle)}, renews on the`;
  }, [billingCycle, isWeekly]);

  if (isWeekly) {
    return (
      <DayWheelPicker
        value={value}
        onChange={onChange}
        options={WEEK_OPTIONS}
        summaryLabel={summaryLabel}
        formatValue={day => WEEKDAY_LONG[day] ?? 'Monday'}
        computePreview={computePreview}
        previewLabel="Next renewal will be on"
      />
    );
  }

  return (
    <DayWheelPicker
      value={value}
      onChange={onChange}
      options={MONTH_OPTIONS}
      summaryLabel={summaryLabel}
      formatValue={formatRenewalDayOfMonth}
      computePreview={computePreview}
      previewLabel="Next renewal will be on"
      hint="Days 29–31 vary by month, so we use 1–28 for a reliable schedule."
    />
  );
}
