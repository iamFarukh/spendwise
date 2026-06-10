import { Tag } from "@/components/ui/tag";

type SettingsProfileCardProps = {
  displayName: string;
  email: string;
  initial: string;
  entryCount: number;
  accountCount: number;
  categoryCount: number;
};

export function SettingsProfileCard({
  displayName,
  email,
  initial,
  entryCount,
  accountCount,
  categoryCount,
}: SettingsProfileCardProps) {
  return (
    <section className="rounded-lg border border-line bg-paper p-5 text-center">
      <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-mint-bright to-mint-600 font-display text-[28px] font-bold text-white">
        {initial}
      </span>
      <b className="block text-[17px] font-bold leading-snug text-ink-900">
        {displayName}
      </b>
      <small className="mt-0.5 block text-sm font-semibold text-ink-500">
        {email}
      </small>
      <Tag variant="income" dot className="mt-2.5">
        Synced · web
      </Tag>

      <div className="mt-5 flex justify-center gap-5 border-t border-line-soft pt-4">
        <ProfileStat value={entryCount} label="entries" />
        <ProfileStat value={accountCount} label="accounts" />
        <ProfileStat value={categoryCount} label="categories" />
      </div>
    </section>
  );
}

function ProfileStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <b className="tnum block font-display text-xl font-bold text-ink-900">
        {value}
      </b>
      <small className="text-xs font-semibold text-ink-500">{label}</small>
    </div>
  );
}
