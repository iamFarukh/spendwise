import type { RecurringForecast } from "@pfos/shared";

import { formatMoney } from "@/lib/format/currency";
import { formatNextRunDate } from "@/lib/recurring/display";

type RecurringSummaryProps = {
  forecast: RecurringForecast;
  currency: string;
  timezone: string;
};

export function RecurringSummary({
  forecast,
  currency,
  timezone,
}: RecurringSummaryProps) {
  const inOut =
    forecast.income > 0 || forecast.outflow > 0
      ? `${formatMoney(forecast.income, currency)} in · ${formatMoney(forecast.outflow, currency)} out`
      : formatMoney(0, currency);

  const nextLabel = forecast.nextTemplate
    ? `${forecast.nextTemplate.name} — ${formatNextRunDate(forecast.nextRunDate ?? forecast.nextTemplate.nextRunDate, timezone).replace(/,?\s*\d{4}$/, "")}`
    : "None scheduled";

  const reviewLabel =
    forecast.reviewCount === 0
      ? "All auto-verified"
      : `${forecast.reviewCount} ${forecast.reviewCount === 1 ? "template" : "templates"} (review amount)`;

  return (
    <div className="recur-summary mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
      <SummaryCell label="Auto-posting next 30 days" value={inOut} />
      <SummaryCell label="Next to run" value={nextLabel} />
      <SummaryCell
        label="Needs your review"
        value={reviewLabel}
        positive={forecast.reviewCount > 0}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rs-cell rounded-lg border border-line bg-paper px-5 py-4">
      <span className="text-[13px] font-semibold text-ink-500">{label}</span>
      <b
        className={`mt-1 block font-display text-[19px] font-bold whitespace-nowrap ${positive ? "text-income" : "text-ink-900"}`}
      >
        {value}
      </b>
    </div>
  );
}
