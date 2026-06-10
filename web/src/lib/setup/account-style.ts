import type { AccountClass, AccountKind } from "@pfos/shared";

export function accountChipStyle(accountClass: AccountClass, kind: AccountKind) {
  if (accountClass === "LIABILITY" || kind === "CREDIT_CARD") {
    return { bg: "var(--expense-bg)", color: "var(--expense)" };
  }
  if (accountClass === "TRACKING" || kind === "INVESTMENT") {
    return { bg: "var(--transfer-bg)", color: "var(--transfer)" };
  }
  if (kind === "CASH" || kind === "WALLET") {
    return { bg: "var(--invest-bg)", color: "var(--invest)" };
  }
  return { bg: "var(--mint-100)", color: "var(--mint-700)" };
}
