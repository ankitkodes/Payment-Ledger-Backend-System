import { drizzle } from "drizzle-orm/node-postgres";
import { CreditMoneySchema, DepositMoneyType, SendMoneySchema } from "./transaction.types.js"
import { Account, Audit_log, LedgerSystem, Transaction } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { InsufficientBalanceError } from "../../errors/account/InsufficientBalanceError.js";
import { AccountNotFoundError } from "../../errors/account/AccountNotFoundError.js";
import { ValidationError } from "../../errors/validation/ValidationError.js";

export const SendMoneyRespository = async ({ senderAccountNo, receiverAccountNo, amount }: SendMoneySchema) => {
    try {
        const platform_account_id = process.env.PLATFORM_ACCOUNTNO;
        if (!platform_account_id) {
            return { message: "missing platform account details", status: 403 };
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new ValidationError("Amount must be a positive number");
        }

        return await db.transaction(async (tsx) => {
            // Row-level locking (SELECT FOR UPDATE) on sender account row inside transaction
            const senderResults = await tsx
                .select()
                .from(Account)
                .where(eq(Account.accountNo, Number(senderAccountNo)))
                .for('update');

            if (senderResults.length < 1) {
                throw new AccountNotFoundError(String(senderAccountNo));
            }
            const sender = senderResults[0];

            // Row-level locking (SELECT FOR UPDATE) on receiver account row inside transaction
            const receiverResults = await tsx
                .select()
                .from(Account)
                .where(eq(Account.accountNo, Number(receiverAccountNo)))
                .for('update');

            if (receiverResults.length < 1) {
                throw new AccountNotFoundError(String(receiverAccountNo));
            }
            const receiver = receiverResults[0];

            const senderBalance = Number(sender.balance);
            if (senderBalance < numericAmount) {
                throw new InsufficientBalanceError();
            }

            // Decimal minor-unit rounding for 3% platform fee
            const platform_charges = Math.round(numericAmount * 3) / 100;
            const totalamount = Math.round((numericAmount - platform_charges) * 100) / 100;

            const [transferMoney] = await tsx.insert(Transaction)
                .values({
                    transaction_amount: totalamount.toFixed(2),
                    sender_account_id: sender.id,
                    receiver_account_id: receiver.id,
                    transactionType: "Credit",
                    status: "Success",
                    account_id: sender.id,
                })
                .returning({ id: Transaction.id });

            await tsx.insert(Audit_log).values({
                user_id: sender.user_id,
                entity_id: transferMoney.id,
                action: "Money transferred",
                entity_type: "Transaction",
                metadata: {
                    transactionId: transferMoney.id,
                    senderAccountId: sender.id,
                    receiverAccountId: receiver.id,
                    amount,
                    netAmount: totalamount.toFixed(2),
                    platformCharges: platform_charges.toFixed(2)
                }
            });

            // Double-entry debit for sender (full transfer amount)
            await tsx.insert(LedgerSystem).values({
                account_id: sender.id,
                transaction_id: transferMoney.id,
                type: "Debit",
                amount: numericAmount.toFixed(2)
            });

            // Double-entry credit for receiver (net transfer amount)
            await tsx.insert(LedgerSystem).values({
                account_id: receiver.id,
                transaction_id: transferMoney.id,
                type: "Credit",
                amount: totalamount.toFixed(2)
            });

            // Double-entry credit for platform fee
            await tsx.insert(LedgerSystem).values({
                account_id: platform_account_id,
                transaction_id: transferMoney.id,
                type: "Credit",
                amount: platform_charges.toFixed(2)
            });

            const newReceiverBalance = (Number(receiver.balance) + totalamount).toFixed(2);
            const newSenderBalance = (Number(sender.balance) - numericAmount).toFixed(2);

            await tsx.update(Account).set({ balance: newReceiverBalance }).where(eq(Account.id, receiver.id));
            await tsx.update(Account).set({ balance: newSenderBalance }).where(eq(Account.id, sender.id));

            return { message: "Money transferred successfully", status: 200 };
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const DepositMoneyRepository = async (data: DepositMoneyType) => {
    try {
        const numericAmount = Number(data.transaction_amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new ValidationError("Amount must be a positive number");
        }

        return await db.transaction(async (tsx) => {
            const isAccount = await tsx
                .select()
                .from(Account)
                .where(eq(Account.id, data.sender_account_id))
                .for('update');

            if (isAccount.length < 1) {
                throw new AccountNotFoundError(data.sender_account_id);
            }

            const currentBalance = Number(isAccount[0].balance);
            const totalamount = (currentBalance + numericAmount).toFixed(2);

            const [depositTransaction] = await tsx.insert(Transaction).values({
                transaction_amount: numericAmount.toFixed(2),
                receiver_account_id: data.sender_account_id,
                transactionType: "Credit",
                status: "Success",
                account_id: data.sender_account_id,
                sender_account_id: data.sender_account_id
            }).returning({ id: Transaction.id });

            await tsx.insert(Audit_log).values({
                user_id: isAccount[0].user_id,
                entity_id: depositTransaction.id,
                action: "Deposit completed",
                entity_type: "Transaction",
                metadata: {
                    transactionId: depositTransaction.id,
                    accountId: data.sender_account_id,
                    amount: data.transaction_amount,
                    newBalance: totalamount
                }
            });

            await tsx.insert(LedgerSystem).values({
                account_id: data.sender_account_id,
                transaction_id: depositTransaction.id,
                type: "Credit",
                amount: numericAmount.toFixed(2)
            });

            await tsx.update(Account).set({
                balance: totalamount
            }).where(eq(Account.id, data.sender_account_id));

            return { message: "Deposit completed successfully", status: 200, transaction: depositTransaction };
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const CreditMoneyRepository = async ({ accountNo, amount }: CreditMoneySchema) => {
    try {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new ValidationError("Amount must be a positive number");
        }

        return await db.transaction(async (tsx) => {
            const isAccount = await tsx
                .select()
                .from(Account)
                .where(eq(Account.accountNo, accountNo))
                .for('update');

            if (isAccount.length < 1) {
                throw new AccountNotFoundError(String(accountNo));
            }

            const currentBalance = Number(isAccount[0].balance);
            if (currentBalance < numericAmount) {
                throw new InsufficientBalanceError();
            }

            const remainingBalance = (currentBalance - numericAmount).toFixed(2);

            const [withdrawTransaction] = await tsx.insert(Transaction).values({
                transaction_amount: numericAmount.toFixed(2),
                sender_account_id: isAccount[0].id,
                receiver_account_id: isAccount[0].id,
                transactionType: "Debit",
                status: "Success",
                account_id: isAccount[0].id
            }).returning({ id: Transaction.id });

            await tsx.insert(Audit_log).values({
                user_id: isAccount[0].user_id,
                entity_id: withdrawTransaction.id,
                action: "Withdrawal completed",
                entity_type: "Transaction",
                metadata: {
                    transactionId: withdrawTransaction.id,
                    accountId: isAccount[0].id,
                    amount,
                    remainingBalance
                }
            });

            await tsx.insert(LedgerSystem).values({
                account_id: isAccount[0].id,
                transaction_id: withdrawTransaction.id,
                type: "Debit",
                amount: numericAmount.toFixed(2)
            });

            await tsx.update(Account).set({
                balance: remainingBalance
            }).where(eq(Account.id, isAccount[0].id));

            return { message: "Withdrawal completed successfully", status: 200 };
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
};