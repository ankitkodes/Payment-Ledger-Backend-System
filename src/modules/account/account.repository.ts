import { drizzle } from "drizzle-orm/node-postgres";
import { Account, Audit_log, Transaction, User } from "../../db/schema.js";
import { AccountRegisterSchema } from "./account.types.js";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../../config/db.js";
import { AccountNotFoundError } from "../../errors/account/AccountNotFoundError.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";
import { ValidationError } from "../../errors/validation/ValidationError.js";


export const CreateAccountRepository = async (data: AccountRegisterSchema, userId: string) => {
    try {
        if (data.category == null) {
            throw new ValidationError("Category is required");
        }

        // Validate user exists before creating account
        const userExists = await db.select({ id: User.id }).from(User).where(eq(User.id, userId));
        if (userExists.length < 1) {
            throw new UnauthorizedError();
        }

        // Check if this user already has an account of the same category
        const isExist = await db.select().from(Account).where(
            and(eq(Account.category, data.category), eq(Account.user_id, userId))
        );
        if (isExist.length > 0) {
            return { message: "Account of this type already exists for this user", status: 302 };
        }

        const [createdAccount] = await db.insert(Account).values({
            category: data.category,
            balance: data.balance,
            user_id: userId
        }).returning({ id: Account.id });

        await db.insert(Audit_log).values({
            user_id: userId,
            entity_id: createdAccount.id,
            action: "Account created",
            entity_type: "Account",
            metadata: {
                category: data.category,
                balance: data.balance,
                userId
            }
        });

        return { message: "Account Created Successfully", status: 200 };
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const GetAccountDetailsRepository = async (accountId: string) => {
    try {
        const accountdetails = await db.select({
            AccountNo: Account.accountNo,
            AccountType: Account.category,
            Balance: Account.balance,
            user_id: Account.user_id
        }).from(Account).where(eq(Account.id, accountId));
        if (accountdetails.length < 1) {
            throw new AccountNotFoundError(accountId);
        }
        return { message: "Account details fetched successfully", status: 200, account: accountdetails };
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const GetTransactionHistoryRepository = async (accountId: string) => {
    try {
        const transactions = await db.select()
            .from(Transaction)
            .where(or(
                eq(Transaction.sender_account_id, accountId),
                eq(Transaction.receiver_account_id, accountId)
            ))
            .orderBy(desc(Transaction.created_at)).limit(10);

        if (transactions.length < 1) {
            return { message: "No transaction history found", status: 404, transactions: [] };
        }

        return { message: "Transaction history fetched successfully", status: 200, transactions };
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const GetUserAllAccountRepository = async (userId: string) => {
    try {
        const accountdetails = await db.select().from(Account).where(eq(Account.user_id, userId));
        return { message: "here your Account details", status: 300, account: accountdetails };
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export const DeleteAccountRepository = async (accountId: string) => {
    try {
        const account = await db.select().from(Account).where(eq(Account.id, accountId));
        if (account.length < 1) {
            throw new AccountNotFoundError(accountId);
        }

        await db.insert(Audit_log).values({
            user_id: account[0].user_id,
            entity_id: account[0].id,
            action: "Account deleted",
            entity_type: "Account",
            metadata: {
                deletedAccount: {
                    id: account[0].id,
                    category: account[0].category,
                    balance: account[0].balance,
                    userId: account[0].user_id,
                }
            }
        });

        await db.delete(Account).where(eq(Account.id, accountId));
        return { message: "Account deleted successfully", status: 200 };
    } catch (err) {
        console.error(err);
        throw err;
    }
};