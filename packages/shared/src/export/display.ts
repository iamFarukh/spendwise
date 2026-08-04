import type { Account } from "../types/account";
import type { Transaction } from "../types/transaction";
import { getExportGroup } from "./groups";
import { EXPORT_GROUP_LABELS } from "./types";

export type BuildDisplayDescriptionOptions = {
  perspectiveAccountId?: string;
  categoryName?: string;
};

function accountName(
  accountsById: Map<string, Account>,
  accountId: string,
): string {
  return accountsById.get(accountId)?.name ?? accountId;
}

function transferDescription(
  txn: Transaction,
  accountsById: Map<string, Account>,
  perspectiveAccountId: string,
): string | undefined {
  const fromId = txn.fromAccountId;
  const toId = txn.toAccountId;
  if (!fromId || !toId) {
    return undefined;
  }

  if (perspectiveAccountId === fromId) {
    return `Transfer to ${accountName(accountsById, toId)}`;
  }
  if (perspectiveAccountId === toId) {
    return `Transfer from ${accountName(accountsById, fromId)}`;
  }
  return undefined;
}

export function buildDisplayDescription(
  txn: Transaction,
  accountsById: Map<string, Account>,
  options: BuildDisplayDescriptionOptions = {},
): string {
  const merchant = txn.merchant?.trim();
  if (merchant) {
    return merchant;
  }

  const category = options.categoryName?.trim();
  if (category) {
    return category;
  }

  const { perspectiveAccountId } = options;
  if (
    perspectiveAccountId &&
    (txn.type === "TRANSFER" || txn.type === "WITHDRAWAL")
  ) {
    const transfer = transferDescription(
      txn,
      accountsById,
      perspectiveAccountId,
    );
    if (transfer) {
      return transfer;
    }
  }

  return EXPORT_GROUP_LABELS[getExportGroup(txn.type)];
}
