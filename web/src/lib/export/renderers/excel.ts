import {
  EXPORT_GROUP_LABELS,
  type ExportDocument,
  type ExportStatementRow,
} from "@pfos/shared";
import ExcelJS from "exceljs";

import type { ExportRenderer } from "../types";

function buildTransactionHeaders(document: ExportDocument): string[] {
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

function rowToCells(
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

function addTransactionsSheet(
  workbook: ExcelJS.Workbook,
  document: ExportDocument,
): void {
  const sheet = workbook.addWorksheet("Transactions");
  const headers = buildTransactionHeaders(document);
  sheet.addRow(headers);
  for (const row of document.transactions) {
    sheet.addRow(rowToCells(row, document));
  }
  sheet.getRow(1).font = { bold: true };
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  document: ExportDocument,
): void {
  const sheet = workbook.addWorksheet("Summary");
  const { summary } = document;

  sheet.addRow(["Metric", "Value"]);
  sheet.addRow(["Income", summary.income]);
  sheet.addRow(["Expense", summary.expense]);
  sheet.addRow(["Net", summary.net]);
  sheet.addRow(["Transfers", summary.transfers]);
  sheet.addRow(["Investments", summary.investments]);
  sheet.addRow(["Refunds", summary.refunds]);
  sheet.addRow(["Other", summary.other]);
  sheet.addRow(["Transaction count", summary.transactionCount]);

  sheet.addRow([]);
  const categoryHeaderRowNumber = sheet.rowCount + 1;
  sheet.addRow(["Category", "Amount"]);
  for (const row of document.categorySummary) {
    sheet.addRow([row.categoryName, row.amount]);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(categoryHeaderRowNumber).font = { bold: true };
}

function addAccountsSheet(
  workbook: ExcelJS.Workbook,
  document: ExportDocument,
): void {
  const sheet = workbook.addWorksheet("Accounts");
  sheet.addRow([
    "Account",
    "Opening balance",
    "Closing balance",
    "Income",
    "Expense",
  ]);
  for (const account of document.accounts) {
    sheet.addRow([
      account.accountName,
      account.openingBalance,
      account.closingBalance,
      account.income,
      account.expense,
    ]);
  }
  sheet.getRow(1).font = { bold: true };
}

export async function renderExportExcel(
  document: ExportDocument,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  addTransactionsSheet(workbook, document);
  addSummarySheet(workbook, document);
  addAccountsSheet(workbook, document);
  return workbook.xlsx.writeBuffer();
}

export const excelRenderer: ExportRenderer = {
  format: "xlsx",
  canRender(document) {
    return (
      document.metadata.format === "xlsx" &&
      document.transactions.length >= 0
    );
  },
  async render(document) {
    const buffer = await renderExportExcel(document);
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  },
};
