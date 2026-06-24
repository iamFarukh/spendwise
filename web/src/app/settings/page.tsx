"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DEFAULT_USER_SETTINGS, type UserSettings } from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import {
  IconCheck,
  IconDownload,
  IconGlobe,
  IconRepeat,
  IconShield,
  IconTrend,
} from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { SettingsInlineSelect } from "@/components/settings/settings-inline-select";
import { SettingsProfileCard } from "@/components/settings/settings-profile-card";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsDangerZone } from "@/components/settings/settings-danger-zone";
import { SettingsSecurityCard } from "@/components/settings/settings-security-card";
import { SettingsSyncCard } from "@/components/settings/settings-sync-card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useAccounts } from "@/hooks/use-accounts";
import { useAllCategories } from "@/hooks/use-all-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  downloadLedgerJson,
  downloadTransactionsCsv,
} from "@/lib/reports/export";
import { CURRENCIES, TIMEZONES } from "@/lib/setup/constants";
import { formatBackupTimestamp } from "@/lib/settings/display";
import { backupLedger } from "@/lib/settings/backup";
import { updateUserSettings } from "@/lib/settings/service";
import { APP_VERSION } from "@/constants/app";

type SettingsDraft = Pick<
  UserSettings,
  | "baseCurrency"
  | "timezone"
  | "primaryAccountId"
  | "includeTrackingInNetWorth"
  | "roundAmounts"
  | "loansEnabled"
>;

function toDraft(settings: UserSettings): SettingsDraft {
  return {
    baseCurrency: settings.baseCurrency,
    timezone: settings.timezone,
    primaryAccountId: settings.primaryAccountId,
    includeTrackingInNetWorth: settings.includeTrackingInNetWorth,
    roundAmounts: settings.roundAmounts,
    loansEnabled: settings.loansEnabled,
  };
}

function draftsEqual(a: SettingsDraft, b: SettingsDraft): boolean {
  return (
    a.baseCurrency === b.baseCurrency &&
    a.timezone === b.timezone &&
    a.primaryAccountId === b.primaryAccountId &&
    a.includeTrackingInNetWorth === b.includeTrackingInNetWorth &&
    a.roundAmounts === b.roundAmounts &&
    a.loansEnabled === b.loansEnabled
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <SettingsContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useAllCategories();
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.archived),
    [accounts],
  );

  const savedDraft = useMemo(
    () => (settings ? toDraft(settings) : null),
    [settings],
  );

  useEffect(() => {
    if (!settings) {
      return;
    }
    const next = toDraft(settings);
    setDraft((current) => {
      if (!current) {
        return next;
      }
      if (savedDraft && !draftsEqual(current, savedDraft)) {
        return current;
      }
      return next;
    });
  }, [savedDraft, settings]);

  const dirty =
    draft && savedDraft ? !draftsEqual(draft, savedDraft) : false;

  const currencyOptions = CURRENCIES.map((currency) => ({
    value: currency.code,
    label: currency.label,
    description: currency.description,
  }));

  const timezoneOptions = TIMEZONES.map((timezone) => ({
    value: timezone.value,
    label: timezone.label,
    description: timezone.description,
  }));

  const primaryAccountOptions = activeAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.class.toLowerCase(),
  }));

  const selectedPrimaryAccount = activeAccounts.find(
    (account) => account.id === draft?.primaryAccountId,
  );

  const transactionCount = transactions.length;
  const entryCount = transactions.filter((txn) => txn.type !== "OPENING").length;
  const accountCount = activeAccounts.length;
  const categoryCount = categories.filter((category) => !category.system).length;

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();
  const timezone = settings?.timezone ?? DEFAULT_USER_SETTINGS.timezone;

  const loading =
    settingsLoading ||
    accountsLoading ||
    categoriesLoading ||
    transactionsLoading ||
    !draft;

  async function handleSave() {
    if (!user || !draft) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateUserSettings(user.uid, draft, accounts);
    } catch (err) {
      setSaveError(getFirestoreErrorMessage(err, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    if (!user || !settings) {
      return;
    }

    setBackingUp(true);
    setBackupMessage(null);

    try {
      downloadLedgerJson({
        transactions,
        accounts,
        categories,
        settings,
      });
      const result = await backupLedger({
        uid: user.uid,
        transactions,
        accounts,
        categories,
        settings,
      });
      setBackupMessage(
        result.storagePath
          ? "Backup saved to Firebase Storage and your downloads."
          : "Backup saved to your downloads. Cloud upload needs Storage configured.",
      );
    } catch (err) {
      setBackupMessage(
        getFirestoreErrorMessage(err, "Could not complete backup."),
      );
    } finally {
      setBackingUp(false);
    }
  }

  if (loading) {
    return (
      <AppLoading title="Settings" variant="settings" showSearch={false} />
    );
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Manage your ledger preferences"
      showSearch={false}
      headerActions={
        <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
          <IconCheck />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          {saveError ? (
            <div
              className="rounded-xl border border-expense/30 bg-expense-bg px-5 py-4 text-sm font-semibold text-expense"
              role="alert"
            >
              {saveError}
            </div>
          ) : null}

          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
              <IconTrend className="text-invest" />
              SIP Management
            </h2>
            <SettingsRow
              title="Investment plans"
              description="Mutual funds, stocks, gold, RDs and recurring deposits"
              last
            >
              <Link href="/sip">
                <Button variant="ghost">Manage SIPs</Button>
              </Link>
            </SettingsRow>
          </section>

          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
              <IconRepeat className="text-mint-600" />
              Subscription Management
            </h2>
            <SettingsRow
              title="Recurring subscriptions"
              description="Track ChatGPT, Netflix, Spotify, Google One, Adobe, Cursor and other recurring subscriptions."
              last
            >
              <Link href="/subscriptions">
                <Button variant="ghost">Manage subscriptions</Button>
              </Link>
            </SettingsRow>
          </section>

          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
              <IconGlobe className="text-mint-600" />
              Preferences
            </h2>

            <SettingsRow
              title="Base currency"
              description="All amounts shown and stored in this currency"
            >
              <SettingsInlineSelect
                ariaLabel="Base currency"
                value={draft.baseCurrency}
                onChange={(baseCurrency) =>
                  setDraft((current) =>
                    current ? { ...current, baseCurrency } : current,
                  )
                }
                options={currencyOptions}
              />
            </SettingsRow>

            <SettingsRow
              title="Timezone"
              description="Defines daily and monthly report boundaries"
            >
              <SettingsInlineSelect
                ariaLabel="Timezone"
                value={draft.timezone}
                onChange={(timezone) =>
                  setDraft((current) =>
                    current ? { ...current, timezone } : current,
                  )
                }
                options={timezoneOptions}
              />
            </SettingsRow>

            <SettingsRow
              title="Primary account"
              description="Default for quick-add expenses and income"
            >
              <SettingsInlineSelect
                ariaLabel="Primary account"
                value={draft.primaryAccountId ?? ""}
                onChange={(value) =>
                  setDraft((current) =>
                    current
                      ? { ...current, primaryAccountId: value || null }
                      : current,
                  )
                }
                options={primaryAccountOptions}
                disabled={primaryAccountOptions.length === 0}
                leading={
                  selectedPrimaryAccount ? (
                    <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-mint-100 font-display text-[11px] font-extrabold text-mint-700">
                      {selectedPrimaryAccount.name.charAt(0).toUpperCase()}
                    </span>
                  ) : null
                }
              />
            </SettingsRow>

            <SettingsRow
              title="Include investments in net worth"
              description="Tracking accounts count toward your total"
            >
              <Toggle
                label="Include investments in net worth"
                checked={draft.includeTrackingInNetWorth}
                onChange={(includeTrackingInNetWorth) =>
                  setDraft((current) =>
                    current ? { ...current, includeTrackingInNetWorth } : current,
                  )
                }
              />
            </SettingsRow>

            <SettingsRow
              title="Round to whole units"
              description="Hide fractional digits in all displays"
              last
            >
              <Toggle
                label="Round to whole units"
                checked={draft.roundAmounts}
                onChange={(roundAmounts) =>
                  setDraft((current) =>
                    current ? { ...current, roundAmounts } : current,
                  )
                }
              />
            </SettingsRow>
          </section>

          {user ? (
            <SettingsSyncCard
              email={email}
              transactionCount={transactionCount}
              accountCount={accountCount}
              categoryCount={categoryCount}
              transactionsError={transactionsError}
              setupComplete={settings?.setupComplete ?? false}
            />
          ) : null}

          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
              <IconDownload className="text-mint-600" />
              Data &amp; backup
            </h2>

            <SettingsRow
              title="Export data"
              description="Download your full ledger as CSV or JSON"
            >
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() =>
                    downloadTransactionsCsv(transactions, accounts, categories)
                  }
                >
                  CSV
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() =>
                    downloadLedgerJson({
                      transactions,
                      accounts,
                      categories,
                      settings: settings ?? null,
                    })
                  }
                >
                  JSON
                </Button>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Backup data"
              description={`Cloud copy plus local download. Last backup — ${formatBackupTimestamp(settings?.lastBackupAt, timezone)}`}
              last
            >
              <Button
                variant="soft"
                onClick={() => void handleBackup()}
                disabled={backingUp}
              >
                {backingUp ? "Backing up…" : "Back up now"}
              </Button>
            </SettingsRow>

            {backupMessage ? (
              <p className="mt-3 text-sm font-semibold text-mint-700">
                {backupMessage}
              </p>
            ) : null}
          </section>

          <SettingsDangerZone />

          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
              <IconShield className="text-mint-600" />
              Legal
            </h2>
            <SettingsRow
              title="Privacy Policy"
              description="How we collect, use, and protect your data"
            >
              <Link href="/privacy">
                <Button variant="ghost">View policy</Button>
              </Link>
            </SettingsRow>
            <SettingsRow
              title="Account deletion"
              description="How to delete your account and associated data"
              last
            >
              <Link href="/account-deletion">
                <Button variant="ghost">View details</Button>
              </Link>
            </SettingsRow>
            <p className="mt-3 text-center text-xs font-semibold text-ink-400">
              App v{APP_VERSION}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-0 xl:self-start">
          <SettingsProfileCard
            displayName={displayName}
            email={email}
            initial={initial}
            entryCount={entryCount}
            accountCount={accountCount}
            categoryCount={categoryCount}
          />
          <SettingsSecurityCard />
        </aside>
      </div>
    </AppShell>
  );
}
