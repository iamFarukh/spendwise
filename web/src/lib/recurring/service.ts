import {
  advanceRecurringRunDate,
  buildTransactionFromRecurringTemplate,
  computeInitialRunDate,
  firestorePaths,
  toDateStringInTimezone,
  validateTransactionForm,
  type Account,
  type RecurringFrequency,
  type RecurringTemplate,
  type RecurringTransactionType,
} from "@pfos/shared";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

export type RecurringTemplateInput = {
  name: string;
  type: RecurringTransactionType;
  amount: number;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  merchant?: string;
  notes?: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  dayOfWeek: number;
  nextRunDate?: string;
  autoConfirm: boolean;
  active: boolean;
};

export async function createRecurringTemplate(
  uid: string,
  input: RecurringTemplateInput,
  accounts: Account[],
  timezone: string,
): Promise<string> {
  validateRecurringInput(input, accounts);

  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const nextRunDate =
    input.nextRunDate ??
    computeInitialRunDate(
      input.frequency,
      input.dayOfMonth,
      input.dayOfWeek,
      timezone,
    );

  const template: RecurringTemplate = {
    id,
    name: input.name.trim(),
    type: input.type,
    amount: input.amount,
    fromAccountId: input.fromAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
    categoryId: input.categoryId ?? null,
    merchant: input.merchant?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    frequency: input.frequency,
    dayOfMonth: input.dayOfMonth,
    dayOfWeek: input.dayOfWeek,
    nextRunDate,
    lastGeneratedDate: null,
    autoConfirm: input.autoConfirm,
    active: input.active,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, firestorePaths.recurringTemplate(uid, id)), template);
  return id;
}

export async function updateRecurringTemplate(
  uid: string,
  templateId: string,
  input: RecurringTemplateInput,
  accounts: Account[],
): Promise<void> {
  validateRecurringInput(input, accounts);

  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, firestorePaths.recurringTemplate(uid, templateId)), {
    name: input.name.trim(),
    type: input.type,
    amount: input.amount,
    fromAccountId: input.fromAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
    categoryId: input.categoryId ?? null,
    merchant: input.merchant?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    frequency: input.frequency,
    dayOfMonth: input.dayOfMonth,
    dayOfWeek: input.dayOfWeek,
    nextRunDate: input.nextRunDate,
    autoConfirm: input.autoConfirm,
    active: input.active,
    updatedAt: new Date().toISOString(),
  });
}

export async function setRecurringTemplateActive(
  uid: string,
  templateId: string,
  active: boolean,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, firestorePaths.recurringTemplate(uid, templateId)), {
    active,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRecurringTemplate(
  uid: string,
  templateId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(db, firestorePaths.recurringTemplate(uid, templateId)));
}

export async function runDueRecurringTemplates(
  uid: string,
  timezone: string,
): Promise<number> {
  const db = getFirebaseDb();
  if (!db) {
    return 0;
  }

  const today = toDateStringInTimezone(new Date(), timezone);
  const snap = await getDocs(query(collection(db, firestorePaths.recurring(uid))));
  const templates = snap.docs.map((docSnap) => docSnap.data() as RecurringTemplate);

  let generated = 0;

  for (const template of templates) {
    if (!template.active || template.nextRunDate > today) {
      continue;
    }
    if (template.lastGeneratedDate === template.nextRunDate) {
      continue;
    }

    const batch = writeBatch(db);
    // Deterministic id keyed on (template, run date): if two runs race (e.g. a
    // refocus and a second tab firing the runner simultaneously) the second
    // write overwrites the same document instead of creating a duplicate.
    const transactionId = `${template.id}_${template.nextRunDate}`;
    const transaction = {
      ...buildTransactionFromRecurringTemplate(
        uid,
        template,
        template.nextRunDate,
      ),
      id: transactionId,
    };

    batch.set(
      doc(db, firestorePaths.transaction(uid, transactionId)),
      transaction,
    );
    batch.update(doc(db, firestorePaths.recurringTemplate(uid, template.id)), {
      lastGeneratedDate: template.nextRunDate,
      nextRunDate: advanceRecurringRunDate(
        template.nextRunDate,
        template.frequency,
      ),
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    generated += 1;
  }

  return generated;
}

function validateRecurringInput(
  input: RecurringTemplateInput,
  accounts: Account[],
): void {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter a template name.");
  }

  const validationError = validateTransactionForm(
    {
      type: input.type,
      amount: input.amount,
      date: input.nextRunDate ?? "2000-01-01",
      fromAccountId: input.fromAccountId ?? null,
      toAccountId: input.toAccountId ?? null,
      categoryId: input.categoryId ?? null,
      merchant: input.merchant,
      notes: input.notes,
    },
    accounts,
  );

  if (validationError) {
    throw new Error(validationError);
  }
}
