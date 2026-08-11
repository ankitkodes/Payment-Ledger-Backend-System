import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Account } from "../../db/schema.js";
import { GetAccountDetailsRepository } from "../../modules/account/account.repository.js";
import { ForbiddenError } from "../../errors/auth/ForbiddenError.js";
import { AccountNotFoundError } from "../../errors/account/AccountNotFoundError.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";
import { ValidationError } from "../../errors/validation/ValidationError.js";

const db = drizzle(process.env.DATABASE_URL!);

export const authorizeUserAccess = (paramName = "userId") => {
    return (req: any, res: any, next: any) => {
        const authenticatedUser = req.user;
        const requestedUserId = req.params?.[paramName];

        if (!authenticatedUser || !authenticatedUser.id) {
            throw new UnauthorizedError();
        }

        if (!requestedUserId) {
            throw new ValidationError("Missing resource owner id");
        }

        if (authenticatedUser.id !== requestedUserId) {
            throw new ForbiddenError();
        }

        next();
    };
};

export const authorizeAccountAccess = (paramName = "accountId") => {
    return async (req: any, res: any, next: any) => {
        const authenticatedUser = req.user;
        const accountId = req.params?.[paramName];

        if (!authenticatedUser || !authenticatedUser.id) {
            throw new UnauthorizedError();
        }
        if (!accountId) {
            throw new ValidationError("Missing account id");
        }

        const result = await GetAccountDetailsRepository(accountId);

        if (result.status === 404 || !result.account || result.account.length < 1) {
            throw new AccountNotFoundError(accountId);
        }

        if (authenticatedUser.id !== result.account[0].user_id) {
            throw new ForbiddenError();
        }

        next();
    };
};


export const authorizeTransactionAccess = (fieldName = "senderAccountNo", lookupBy: "accountNo" | "accountId" = "accountNo") => {
    return async (req: any, res: any, next: any) => {
        const authenticatedUser = req.user;

        if (!authenticatedUser || !authenticatedUser.id) {
            throw new UnauthorizedError();
        }

        // Check params first (URL path), then fall back to body
        const fieldValue = req.params?.[fieldName] ?? req.body?.[fieldName];

        if (!fieldValue) {
            throw new ValidationError(`Missing required field: ${fieldName}`);
        }

        try {
            let account;

            if (lookupBy === "accountNo") {
                const results = await db.select().from(Account).where(eq(Account.accountNo, Number(fieldValue)));
                account = results[0];
            } else {
                const results = await db.select().from(Account).where(eq(Account.id, String(fieldValue)));
                account = results[0];
            }

            if (!account) {
                throw new AccountNotFoundError(String(fieldValue));
            }

            if (authenticatedUser.id !== account.user_id) {
                throw new ForbiddenError();
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};