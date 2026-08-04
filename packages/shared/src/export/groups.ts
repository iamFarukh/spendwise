import type { TransactionType } from "../types/transaction";
import type { ExportGroup } from "./types";

export function getExportGroup(type: TransactionType): ExportGroup {
  switch (type) {
    case "INCOME":
      return "INCOME";
    case "EXPENSE":
    case "LIABILITY_PAYMENT":
      return "EXPENSES";
    case "TRANSFER":
    case "WITHDRAWAL":
      return "TRANSFERS";
    case "INVESTMENT":
      return "INVESTMENTS";
    case "REFUND":
      return "REFUNDS";
    default:
      return "OTHER";
  }
}

export function isTypeInGroups(
  type: TransactionType,
  groups: readonly ExportGroup[],
): boolean {
  return groups.includes(getExportGroup(type));
}
