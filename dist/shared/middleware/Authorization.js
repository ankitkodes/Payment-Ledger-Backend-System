var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { eq } from "drizzle-orm";
import { Account } from "../../db/schema.js";
import { db } from "../../config/db.js";
import { GetAccountDetailsRepository } from "../../modules/account/account.repository.js";
import { ForbiddenError } from "../../errors/auth/ForbiddenError.js";
import { AccountNotFoundError } from "../../errors/account/AccountNotFoundError.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";
import { ValidationError } from "../../errors/validation/ValidationError.js";
export const authorizeUserAccess = (paramName = "userId") => {
    return (req, res, next) => {
        var _a;
        const authenticatedUser = req.user;
        const requestedUserId = (_a = req.params) === null || _a === void 0 ? void 0 : _a[paramName];
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
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const authenticatedUser = req.user;
        const accountId = (_a = req.params) === null || _a === void 0 ? void 0 : _a[paramName];
        if (!authenticatedUser || !authenticatedUser.id) {
            throw new UnauthorizedError();
        }
        if (!accountId) {
            throw new ValidationError("Missing account id");
        }
        const result = yield GetAccountDetailsRepository(accountId);
        if (result.status === 404 || !result.account || result.account.length < 1) {
            throw new AccountNotFoundError(accountId);
        }
        if (authenticatedUser.id !== result.account[0].user_id) {
            throw new ForbiddenError();
        }
        next();
    });
};
export const authorizeTransactionAccess = (fieldName = "senderAccountNo", lookupBy = "accountNo") => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const authenticatedUser = req.user;
        if (!authenticatedUser || !authenticatedUser.id) {
            throw new UnauthorizedError();
        }
        // Check params first (URL path), then fall back to body
        const fieldValue = (_b = (_a = req.params) === null || _a === void 0 ? void 0 : _a[fieldName]) !== null && _b !== void 0 ? _b : (_c = req.body) === null || _c === void 0 ? void 0 : _c[fieldName];
        if (!fieldValue) {
            throw new ValidationError(`Missing required field: ${fieldName}`);
        }
        try {
            let account;
            if (lookupBy === "accountNo") {
                const results = yield db.select().from(Account).where(eq(Account.accountNo, Number(fieldValue)));
                account = results[0];
            }
            else {
                const results = yield db.select().from(Account).where(eq(Account.id, String(fieldValue)));
                account = results[0];
            }
            if (!account) {
                throw new AccountNotFoundError(String(fieldValue));
            }
            if (authenticatedUser.id !== account.user_id) {
                throw new ForbiddenError();
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
