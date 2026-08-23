import { index, integer, json, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const User = pgTable("users", {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text().notNull(),
    address: text().notNull(),
    phoneNo: varchar({ length: 15 }).notNull().unique(),
    email: text().notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow()
});
export const accountEnum = pgEnum('account_type', ["Saving", "Current", "Salary"]);
export const Account = pgTable("account", {
    id: uuid('id').primaryKey().defaultRandom(),
    category: accountEnum('accountType').default("Current"),
    accountNo: integer("accountNumber").unique()
        .notNull()
        .$defaultFn(() => {
        return Math.floor(Math.random() * 1000000000);
    }),
    balance: numeric('balance', { precision: 15, scale: 2 }).notNull(),
    user_id: uuid('user_id').references(() => User.id).notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow()
});
export const TransactionTypeEnum = pgEnum('transaction_type_enums', ["Credit", "Debit"]);
export const StatusEnum = pgEnum('status', ["Pending", "Success", "Failure"]);
export const Transaction = pgTable("transaction", {
    id: uuid('id').primaryKey().defaultRandom(),
    transaction_amount: numeric('transaction_amount', { precision: 15, scale: 2 }).notNull(),
    sender_account_id: uuid('sender_account_id').references(() => Account.id).notNull(),
    receiver_account_id: uuid('receiver_account_id').references(() => Account.id).notNull(),
    transactionType: TransactionTypeEnum().default("Credit"),
    status: StatusEnum().default("Pending"),
    account_id: uuid('account_id').references(() => Account.id).notNull(),
    created_at: timestamp('created_at').defaultNow()
}, (table) => [
    index('sender_account_id').on(table.sender_account_id.asc()),
    index('receiver_account_id').on(table.receiver_account_id.asc())
]);
export const LedgerSystem = pgTable("ledger_system", {
    id: uuid('id').primaryKey().defaultRandom(),
    account_id: uuid('account_id').references(() => Account.id).notNull(),
    transaction_id: uuid('transaction_id').references(() => Transaction.id).notNull(),
    type: TransactionTypeEnum().default("Credit"),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    timestamp: timestamp('timestamp').defaultNow()
});
export const EntityTypeEnum = pgEnum('entity_type', ["User", "Account", "Transaction"]);
export const Audit_log = pgTable("audit_log", {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => User.id).notNull(),
    entity_id: uuid('updated_entity_id').notNull(),
    action: varchar({ length: 225 }).notNull(),
    entity_type: EntityTypeEnum().default("User"),
    metadata: json().notNull(),
    created_at: timestamp('created_at').defaultNow()
});
export const Idempotency = pgTable("idempotency", {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotency_key: varchar({ length: 255 }).notNull().unique(),
    user_id: uuid('user_id').references(() => User.id).notNull(),
    request_hash: varchar({ length: 255 }).notNull(),
    status: StatusEnum().default("Pending"),
    response_status: integer("response_status").default(200),
    response_body: json().notNull(),
    created_at: timestamp('created_at').defaultNow(),
    expiry_at: timestamp('expiry_at').notNull(),
}, (table) => [
    index('idempotency_key').on(table.idempotency_key.asc()),
    index('user_id').on(table.user_id.asc()),
    index('request_hash').on(table.request_hash.asc()),
]);
// type of all table
export const UserSchema = createInsertSchema(User);
export const AccountSchema = createInsertSchema(Account);
export const TransactionSchema = createInsertSchema(Transaction);
