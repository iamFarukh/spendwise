import type { ManualTransactionType, TransactionFormInput } from "./form";
import { buildNewTransaction, validateTransactionForm } from "./form";

export type CreatableTransactionType = ManualTransactionType;
export type CreateTransactionInput = TransactionFormInput;

export const validateCreateTransaction = validateTransactionForm;
export const buildTransactionDocument = buildNewTransaction;
