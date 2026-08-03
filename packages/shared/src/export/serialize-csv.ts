import { EXPORT_GROUP_LABELS } from "./types";
import type { ExportDocument, ExportStatementRow } from "./types";

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvHeaders(document: ExportDocument): string[] {
  const { options } = document.filters;
  const headers = [
    "Date",
    "Time",
    "Type",
    "Category",
    "Account",
    "Payment",
  ];
  if (options.merchant) {
    headers.push("Merchant");
  }
  headers.push("Description", "Amount");
  if (options.runningBalance) {
    headers.push("Balance");
  }
  if (options.notes) {
    headers.push("Notes");
  }
  if (options.transactionId) {
    headers.push("Transaction ID");
  }
  if (options.timestamps) {
    headers.push("Created", "Updated");
  }
  return headers;
}

function rowToCsvCells(
  row: ExportStatementRow,
  document: ExportDocument,
): (string | number)[] {
  const { options } = document.filters;
  const cells: (string | number)[] = [
    row.date,
    row.time,
    EXPORT_GROUP_LABELS[row.typeGroup],
    row.categoryName,
    row.accountName,
    row.paymentMethod,
  ];
  if (options.merchant) {
    cells.push(row.merchant);
  }
  cells.push(row.displayDescription, row.signedAmount);
  if (options.runningBalance) {
    cells.push(row.runningBalance ?? "");
  }
  if (options.notes) {
    cells.push(row.notes);
  }
  if (options.transactionId) {
    cells.push(row.transactionId);
  }
  if (options.timestamps) {
    cells.push(row.createdAt, row.updatedAt);
  }
  return cells;
}

export function documentToCsvString(document: ExportDocument): string {
  const headers = buildCsvHeaders(document);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...document.transactions.map((row) =>
      rowToCsvCells(row, document).map(escapeCsvCell).join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}
