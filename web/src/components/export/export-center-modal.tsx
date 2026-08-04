"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildDefaultFilenameStem,
  EXPORT_GROUP_LABELS,
  ExportValidationError,
  filterExportTransactions,
  resolveExportDateRange,
  sanitizeFilenameStem,
  UNSPECIFIED_PAYMENT_METHOD,
  validateExportRequest,
  type Account,
  type Category,
  type ExportColumnOptions,
  type ExportDatePreset,
  type ExportDocument,
  type ExportFormat,
  type ExportGroup,
  type ExportRequest,
  type ExportSort,
  type Transaction,
} from "@pfos/shared";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Toggle } from "@/components/ui/toggle";
import { ExportProgress } from "@/components/export/export-progress";
import { ExportSuccess } from "@/components/export/export-success";
import { runExport } from "@/lib/export/runner";
import type { ExportPhase } from "@/lib/export/types";
import { cn } from "@/lib/cn";

const ALL_GROUPS: ExportGroup[] = [
  "INCOME",
  "EXPENSES",
  "TRANSFERS",
  "INVESTMENTS",
  "REFUNDS",
  "OTHER",
];

const FORMAT_OPTIONS: {
  format: ExportFormat;
  label: string;
  ext: string;
  recommended?: boolean;
}[] = [
  { format: "pdf", label: "PDF", ext: ".pdf", recommended: true },
  { format: "xlsx", label: "Excel", ext: ".xlsx" },
  { format: "csv", label: "CSV", ext: ".csv" },
  { format: "json", label: "JSON Backup", ext: ".json" },
];

const DATE_PRESETS: { preset: ExportDatePreset; label: string }[] = [
  { preset: "today", label: "Today" },
  { preset: "yesterday", label: "Yesterday" },
  { preset: "this_week", label: "This week" },
  { preset: "last_week", label: "Last week" },
  { preset: "this_month", label: "This month" },
  { preset: "last_month", label: "Last month" },
  { preset: "last_3_months", label: "Last 3 months" },
  { preset: "last_6_months", label: "Last 6 months" },
  { preset: "this_year", label: "This year" },
  { preset: "last_year", label: "Last year" },
  { preset: "all_time", label: "All time" },
  { preset: "custom", label: "Custom" },
];

const SORT_OPTIONS: { sort: ExportSort; label: string }[] = [
  { sort: "newest", label: "Newest first" },
  { sort: "oldest", label: "Oldest first" },
  { sort: "highest_amount", label: "Highest amount" },
  { sort: "lowest_amount", label: "Lowest amount" },
];

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: ".pdf",
  xlsx: ".xlsx",
  csv: ".csv",
  json: ".json",
};

const FORMAT_FOOTER_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
  csv: "CSV",
  json: "JSON",
};

const SOURCE_TITLES: Record<ExportRequest["source"], string> = {
  transactions: "Export transactions",
  reports: "Export report",
  settings: "Export data",
};

type ModalState = "configure" | "generating" | "success" | "error";

export type ExportCenterModalProps = {
  open: boolean;
  onClose: () => void;
  source: ExportRequest["source"];
  presets: Partial<ExportRequest>;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  preparedFor: string;
  timezone: string;
  currency: string;
  locale: string;
};

function activeAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => !a.archived);
}

function pickerCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.system);
}

function collectPaymentMethods(transactions: Transaction[]): string[] {
  const methods = new Set<string>();
  for (const txn of transactions) {
    const raw = txn.paymentMethod?.trim();
    methods.add(raw ? raw : UNSPECIFIED_PAYMENT_METHOD);
  }
  return Array.from(methods).sort((a, b) => {
    if (a === UNSPECIFIED_PAYMENT_METHOD) {
      return 1;
    }
    if (b === UNSPECIFIED_PAYMENT_METHOD) {
      return -1;
    }
    return a.localeCompare(b);
  });
}

function paymentMethodLabel(method: string): string {
  return method === UNSPECIFIED_PAYMENT_METHOD ? "Unspecified" : method;
}

function idsFromPreset(
  preset: string[] | "all" | undefined,
  allIds: string[],
): string[] {
  if (preset === "all" || preset === undefined) {
    return [...allIds];
  }
  return preset.filter((id) => allIds.includes(id));
}

function toIdSelection(
  selected: string[],
  allIds: string[],
): string[] | "all" {
  if (selected.length === 0) {
    return [];
  }
  if (selected.length >= allIds.length) {
    return "all";
  }
  return selected;
}

function hasInheritedFilters(
  source: ExportRequest["source"],
  presets: Partial<ExportRequest>,
): boolean {
  if (source === "settings") {
    return false;
  }
  return Object.keys(presets).length > 0;
}

function defaultOptions(
  partial?: Partial<ExportColumnOptions>,
): ExportColumnOptions {
  return {
    runningBalance: partial?.runningBalance ?? true,
    notes: partial?.notes ?? true,
    merchant: partial?.merchant ?? true,
    transactionId: partial?.transactionId ?? false,
    timestamps: partial?.timestamps ?? false,
  };
}

function defaultDatePreset(
  source: ExportRequest["source"],
  presets: Partial<ExportRequest>,
): ExportDatePreset {
  if (presets.datePreset) {
    return presets.datePreset;
  }
  if (source === "settings") {
    return "all_time";
  }
  return "this_month";
}

function defaultFormat(
  source: ExportRequest["source"],
  presets: Partial<ExportRequest>,
): ExportFormat {
  if (presets.format) {
    return presets.format;
  }
  return source === "settings" ? "json" : "pdf";
}

type SearchableListProps = {
  label: string;
  searchPlaceholder: string;
  items: { id: string; label: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function SearchableCheckboxList({
  label,
  searchPlaceholder,
  items,
  selectedIds,
  onChange,
  disabled,
}: SearchableListProps) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAllVisible() {
    const next = new Set(selectedIds);
    for (const item of filtered) {
      next.add(item.id);
    }
    onChange(Array.from(next));
  }

  function clearAllVisible() {
    const visible = new Set(filtered.map((i) => i.id));
    onChange(selectedIds.filter((id) => !visible.has(id)));
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-2 text-[13px] font-bold text-ink-700">{label}</legend>
      {items.length > 5 ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 h-10 w-full rounded-md border border-line bg-canvas px-3 text-[14px] font-semibold text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-400 focus:border-mint-400 focus:shadow-[0_0_0_3px_var(--mint-100)]"
        />
      ) : null}
      <div className="flex gap-2 text-[12px] font-bold">
        <button
          type="button"
          className="text-mint-700 hover:underline"
          onClick={selectAllVisible}
        >
          Select visible
        </button>
        <span className="text-ink-300">·</span>
        <button
          type="button"
          className="text-ink-500 hover:underline"
          onClick={clearAllVisible}
        >
          Clear visible
        </button>
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-line bg-paper p-2 sm:max-h-56">
        {filtered.length === 0 ? (
          <li className="px-2 py-1 text-[13px] text-ink-400">No matches</li>
        ) : (
          filtered.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] font-semibold text-ink-700 hover:bg-tint">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 rounded border-line accent-mint-500"
                />
                {item.label}
              </label>
            </li>
          ))
        )}
      </ul>
    </fieldset>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-500">
      {children}
    </h3>
  );
}

export function ExportCenterModal({
  open,
  onClose,
  source,
  presets,
  transactions,
  accounts,
  categories,
  preparedFor,
  timezone,
  currency,
  locale,
}: ExportCenterModalProps) {
  const titleId = useId();
  const accountList = useMemo(() => activeAccounts(accounts), [accounts]);
  const categoryList = useMemo(() => pickerCategories(categories), [categories]);
  const accountIdsAll = useMemo(
    () => accountList.map((a) => a.id),
    [accountList],
  );
  const categoryIdsAll = useMemo(
    () => categoryList.map((c) => c.id),
    [categoryList],
  );
  const paymentMethodsAll = useMemo(
    () => collectPaymentMethods(transactions),
    [transactions],
  );

  const [modalState, setModalState] = useState<ModalState>("configure");
  const [format, setFormat] = useState<ExportFormat>(() =>
    defaultFormat(source, presets),
  );
  const [datePreset, setDatePreset] = useState<ExportDatePreset>(() =>
    defaultDatePreset(source, presets),
  );
  const [customFrom, setCustomFrom] = useState(
    () => presets.customRange?.from ?? "",
  );
  const [customTo, setCustomTo] = useState(
    () => presets.customRange?.to ?? "",
  );
  const [groups, setGroups] = useState<ExportGroup[]>(
    () => presets.groups ?? [...ALL_GROUPS],
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [verifiedOnly, setVerifiedOnly] = useState(
    () => presets.verifiedOnly ?? false,
  );
  const [options, setOptions] = useState<ExportColumnOptions>(() =>
    defaultOptions(presets.options),
  );
  const [sort, setSort] = useState<ExportSort>(
    () => presets.sort ?? "newest",
  );
  const [filenameStem, setFilenameStem] = useState("");
  const [filenameTouched, setFilenameTouched] = useState(false);
  /** Bumps on each modal open so the default stem gets a fresh timestamp. */
  const [filenameEpoch, setFilenameEpoch] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  const [currentPhase, setCurrentPhase] = useState<ExportPhase>("PREPARING");
  const [completedPhases, setCompletedPhases] = useState<ExportPhase[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStage, setErrorStage] = useState<ExportPhase | null>(null);
  const lastPhaseRef = useRef<ExportPhase>("PREPARING");

  const [successPayload, setSuccessPayload] = useState<{
    document: ExportDocument;
    blob: Blob;
    filename: string;
  } | null>(null);

  const resetForm = useCallback(() => {
    setModalState("configure");
    setFormat(defaultFormat(source, presets));
    setDatePreset(defaultDatePreset(source, presets));
    setCustomFrom(presets.customRange?.from ?? "");
    setCustomTo(presets.customRange?.to ?? "");
    setGroups(presets.groups ?? [...ALL_GROUPS]);
    setSelectedAccountIds(
      idsFromPreset(presets.accountIds, accountIdsAll),
    );
    setSelectedCategoryIds(
      idsFromPreset(presets.categoryIds, categoryIdsAll),
    );
    setSelectedPaymentMethods(
      idsFromPreset(presets.paymentMethods, paymentMethodsAll),
    );
    setVerifiedOnly(presets.verifiedOnly ?? false);
    setOptions(defaultOptions(presets.options));
    setSort(presets.sort ?? "newest");
    setFilenameTouched(false);
    setFilenameEpoch((n) => n + 1);
    setFilenameStem("");
    setValidationMessage(null);
    setErrorMessage(null);
    setErrorStage(null);
    setCurrentPhase("PREPARING");
    setCompletedPhases([]);
    setSuccessPayload(null);
  }, [
    source,
    presets,
    accountIdsAll,
    categoryIdsAll,
    paymentMethodsAll,
  ]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const resolvedRange = useMemo(
    () =>
      resolveExportDateRange(
        datePreset,
        timezone,
        datePreset === "custom"
          ? { from: customFrom, to: customTo }
          : undefined,
      ),
    [datePreset, timezone, customFrom, customTo],
  );

  const autoFilenameStem = useMemo(
    () =>
      sanitizeFilenameStem(
        buildDefaultFilenameStem({
          format,
          source,
          range: resolvedRange,
          generatedAt: new Date(),
        }),
      ),
    // Fresh Date on each modal open (filenameEpoch) and when format/range change.
    [format, source, resolvedRange, filenameEpoch],
  );

  useEffect(() => {
    if (!filenameTouched) {
      setFilenameStem(autoFilenameStem);
    }
  }, [autoFilenameStem, filenameTouched]);

  const exportRequest = useMemo((): ExportRequest => {
    return {
      exportVersion: 1,
      format,
      source,
      datePreset,
      customRange:
        datePreset === "custom"
          ? { from: customFrom, to: customTo }
          : undefined,
      groups,
      accountIds: toIdSelection(selectedAccountIds, accountIdsAll),
      categoryIds: toIdSelection(selectedCategoryIds, categoryIdsAll),
      paymentMethods: toIdSelection(
        selectedPaymentMethods,
        paymentMethodsAll,
      ),
      verifiedOnly,
      options,
      sort,
      filenameStem: sanitizeFilenameStem(filenameStem),
      preparedFor,
      timezone,
      currency,
      locale,
    };
  }, [
    format,
    source,
    datePreset,
    customFrom,
    customTo,
    groups,
    selectedAccountIds,
    accountIdsAll,
    selectedCategoryIds,
    categoryIdsAll,
    selectedPaymentMethods,
    paymentMethodsAll,
    verifiedOnly,
    options,
    sort,
    filenameStem,
    preparedFor,
    timezone,
    currency,
    locale,
  ]);

  const matchCount = useMemo(
    () =>
      filterExportTransactions(transactions, {
        range: resolvedRange,
        groups,
        accountIds: exportRequest.accountIds,
        categoryIds: exportRequest.categoryIds,
        paymentMethods: exportRequest.paymentMethods,
        verifiedOnly,
      }).length,
    [
      transactions,
      resolvedRange,
      groups,
      exportRequest.accountIds,
      exportRequest.categoryIds,
      exportRequest.paymentMethods,
      verifiedOnly,
    ],
  );

  const selectedAccountCount =
    exportRequest.accountIds === "all"
      ? accountList.length
      : exportRequest.accountIds.length;

  const showStatementSortNote = options.runningBalance;

  const inheritedChip = hasInheritedFilters(source, presets);

  const handlePhase = useCallback(
    (phase: ExportPhase) => {
      if (phase !== "ERROR") {
        lastPhaseRef.current = phase;
      }
      setCurrentPhase(phase);
      if (phase === "ERROR" || phase === "DONE") {
        return;
      }
      const order: ExportPhase[] =
        format === "pdf"
          ? [
              "PREPARING",
              "DOCUMENT",
              "CHARTS",
              "RENDERING",
              "DOWNLOADING",
            ]
          : ["PREPARING", "DOCUMENT", "RENDERING", "DOWNLOADING"];
      const idx = order.indexOf(phase);
      if (idx <= 0) {
        setCompletedPhases([]);
        return;
      }
      setCompletedPhases(order.slice(0, idx) as ExportPhase[]);
    },
    [format],
  );

  const runGenerate = useCallback(async () => {
    setValidationMessage(null);
    const validation = validateExportRequest(exportRequest, {
      matchCount,
    });
    if (!validation.ok) {
      setValidationMessage(validation.message);
      return;
    }

    setModalState("generating");
    setErrorMessage(null);
    setErrorStage(null);
    setCompletedPhases([]);
    setCurrentPhase("PREPARING");

    try {
      const result = await runExport({
        request: exportRequest,
        transactions,
        accounts,
        categories,
        onPhase: handlePhase,
      });
      setSuccessPayload(result);
      setModalState("success");
    } catch (err) {
      const message =
        err instanceof ExportValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Export failed. Please try again.";
      setErrorMessage(message);
      setErrorStage(lastPhaseRef.current);
      setModalState("error");
    }
  }, [
    exportRequest,
    matchCount,
    transactions,
    accounts,
    categories,
    handlePhase,
  ]);

  function toggleGroup(group: ExportGroup) {
    setGroups((prev) =>
      prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group],
    );
  }

  function handleClose() {
    if (modalState === "generating") {
      return;
    }
    onClose();
  }

  const matchSummary = `${resolvedRange.start} – ${resolvedRange.end}`;

  const dismissible = modalState !== "generating";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={dismissible}
      labelledBy={titleId}
      size="xl"
      className="flex max-h-[min(92dvh,880px)] flex-col gap-0 overflow-hidden p-0"
    >
      <header className="sticky top-0 z-10 border-b border-line bg-paper px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2
              id={titleId}
              className="text-lg font-bold text-ink-900"
            >
              {SOURCE_TITLES[source]}
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-ink-500">
              {matchCount.toLocaleString(locale)} matching transaction
              {matchCount === 1 ? "" : "s"}
              {selectedAccountCount > 1
                ? ` · Across ${selectedAccountCount} accounts`
                : null}
            </p>
          </div>
          {inheritedChip ? (
            <FilterChip
              label="Page filters applied"
              active
              className="pointer-events-none"
            />
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {modalState === "generating" ? (
          <ExportProgress
            format={format}
            currentPhase={currentPhase}
            completedPhases={completedPhases}
          />
        ) : null}

        {modalState === "success" && successPayload ? (
          <ExportSuccess
            format={format}
            filename={successPayload.filename}
            blob={successPayload.blob}
            transactionCount={successPayload.document.summary.transactionCount}
            matchSummary={matchSummary}
            generatedAt={new Date(successPayload.document.metadata.generatedAt)}
            locale={locale}
            onDownloadAgain={() => {}}
            onGenerateAnother={() => {
              resetForm();
            }}
            onClose={handleClose}
          />
        ) : null}

        {modalState === "error" ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-[15px] font-bold text-expense-strong">
              Export failed
            </p>
            {errorStage ? (
              <p className="text-[13px] text-ink-500">
                Failed during:{" "}
                <span className="font-bold text-ink-700">{errorStage}</span>
              </p>
            ) : null}
            <p className="text-[14px] text-ink-700">{errorMessage}</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => void runGenerate()}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => setModalState("configure")}>
                Back to settings
              </Button>
            </div>
          </div>
        ) : null}

        {modalState === "configure" ? (
          <div className="flex flex-col gap-6">
            <section className="space-y-3">
              <SectionHeading>Format</SectionHeading>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="radiogroup"
                aria-label="Export format"
              >
                {FORMAT_OPTIONS.map((opt) => {
                  const active = format === opt.format;
                  return (
                    <button
                      key={opt.format}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFormat(opt.format)}
                      className={cn(
                        "relative rounded-lg border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-mint-500 bg-mint-100 text-ink-900"
                          : "border-line bg-paper text-ink-600 hover:border-mint-200 hover:bg-tint",
                      )}
                    >
                      {opt.recommended ? (
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-mint-700">
                          Recommended
                        </span>
                      ) : null}
                      <span className="block text-[14px] font-bold">
                        {opt.label}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        {opt.ext}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading>Date range</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map(({ preset, label }) => (
                  <FilterChip
                    key={preset}
                    label={label}
                    active={datePreset === preset}
                    onClick={() => setDatePreset(preset)}
                  />
                ))}
              </div>
              {datePreset === "custom" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="From"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                  <Input
                    label="To"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              ) : null}
            </section>

            <section className="space-y-3">
              <SectionHeading>What to export</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {ALL_GROUPS.map((group) => {
                  const chip = (
                    <FilterChip
                      label={EXPORT_GROUP_LABELS[group]}
                      active={groups.includes(group)}
                      onClick={() => toggleGroup(group)}
                    />
                  );
                  if (group === "OTHER") {
                    return (
                      <span
                        key={group}
                        title="Opening balances, adjustments, loans, and redemptions"
                      >
                        {chip}
                      </span>
                    );
                  }
                  return <span key={group}>{chip}</span>;
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SearchableCheckboxList
                label="Accounts"
                searchPlaceholder="Search accounts"
                items={accountList.map((a) => ({ id: a.id, label: a.name }))}
                selectedIds={selectedAccountIds}
                onChange={setSelectedAccountIds}
              />

              <SearchableCheckboxList
                label="Categories"
                searchPlaceholder="Search categories"
                items={categoryList.map((c) => ({ id: c.id, label: c.name }))}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
              />
            </div>

            <SearchableCheckboxList
              label="Payment methods"
              searchPlaceholder="Search payment methods"
              items={paymentMethodsAll.map((m) => ({
                id: m,
                label: paymentMethodLabel(m),
              }))}
              selectedIds={selectedPaymentMethods}
              onChange={setSelectedPaymentMethods}
            />

            <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-canvas px-4 py-3">
              <div>
                <p className="text-[14px] font-bold text-ink-800">
                  Verified only
                </p>
                <p className="text-[12px] text-ink-500">
                  Exclude pending transactions
                </p>
              </div>
              <Toggle
                label="Verified only"
                checked={verifiedOnly}
                onChange={setVerifiedOnly}
              />
            </div>

            <section className="space-y-4">
              <SectionHeading>Additional options</SectionHeading>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-line bg-paper p-4">
                <p className="text-[12px] font-bold uppercase text-ink-400">
                  Transaction details
                </p>
                {(
                  [
                    ["runningBalance", "Running balance"],
                    ["notes", "Notes"],
                    ["merchant", "Merchant / description"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-[13px] font-semibold text-ink-700"
                  >
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) =>
                        setOptions((o) => ({ ...o, [key]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-mint-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="space-y-3 rounded-lg border border-line bg-paper p-4">
                <p className="text-[12px] font-bold uppercase text-ink-400">
                  Metadata
                </p>
                {(
                  [
                    ["transactionId", "Transaction ID"],
                    ["timestamps", "Created & updated timestamps"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-[13px] font-semibold text-ink-700"
                  >
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) =>
                        setOptions((o) => ({ ...o, [key]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-mint-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading>Sort</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(({ sort: s, label }) => (
                  <FilterChip
                    key={s}
                    label={label}
                    active={sort === s}
                    onClick={() => setSort(s)}
                  />
                ))}
              </div>
              {showStatementSortNote ? (
                <p className="text-[12px] font-medium text-ink-500">
                  {selectedAccountCount > 1
                    ? "With running balance across multiple accounts, rows are sorted by account, then date, for accurate per-account balances."
                    : "With running balance enabled, rows stay in date order so balances stay accurate."}
                </p>
              ) : null}
            </section>

            <section className="space-y-2">
              <SectionHeading>File name</SectionHeading>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="File name"
                    placeholder="report_YYYYMMDD_HHmmss"
                    hint="Prefills a unique name. Edit anytime before download."
                    value={filenameStem}
                    onChange={(e) => {
                      setFilenameTouched(true);
                      setFilenameStem(e.target.value);
                    }}
                  />
                </div>
                <span className="mb-[7px] shrink-0 pb-3 text-[14px] font-bold text-ink-500">
                  {FORMAT_EXTENSIONS[format]}
                </span>
              </div>
            </section>

            {matchCount > 2000 ? (
              <p className="rounded-md border border-line bg-tint px-3 py-2 text-[13px] text-ink-600">
                Large export ({matchCount.toLocaleString(locale)} transactions).
                Generation may take a moment.
              </p>
            ) : null}

            {validationMessage ? (
              <p className="text-[13px] font-bold text-expense-strong" role="alert">
                {validationMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {modalState === "configure" ? (
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-6 py-4">
          <p className="text-[13px] font-bold text-ink-600">
            {FORMAT_FOOTER_LABELS[format]} · {matchCount.toLocaleString(locale)}{" "}
            transaction{matchCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={matchCount === 0}
              onClick={() => void runGenerate()}
            >
              Download
            </Button>
          </div>
        </footer>
      ) : null}
    </Modal>
  );
}
