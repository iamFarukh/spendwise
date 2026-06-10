import type { AccountKind } from "@pfos/shared";

import {
  IconBank,
  IconCard,
  IconCash,
  IconPig,
  IconWallet,
} from "@/components/icons";

export function AccountKindIcon({ kind }: { kind: AccountKind }) {
  switch (kind) {
    case "BANK":
      return <IconBank />;
    case "CASH":
      return <IconCash />;
    case "WALLET":
      return <IconWallet />;
    case "CREDIT_CARD":
      return <IconCard />;
    case "INVESTMENT":
      return <IconPig />;
    default:
      return <IconBank />;
  }
}
