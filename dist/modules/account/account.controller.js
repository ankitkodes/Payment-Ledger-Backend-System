var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ValidationError } from "../../errors/validation/ValidationError.js";
import { asyncHander } from "../../shared/handler/asyncHandler.js";
import { CreateAccountService, DeleteAccountService, GetAccountDetailsService, GetUserAllAccountService, TransactionHistoryService } from "./account.service.js";
import { AccountRegister } from "./account.types.js";
export const CreateAccount = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const result = AccountRegister.safeParse(req.body);
    if (!result.success) {
        throw new ValidationError("validation failed");
    }
    const data = result.data;
    const response = yield CreateAccountService(data, userId);
    if (!response) {
        return res.status(500).json({ message: "Some problem occured, try again later" });
    }
    return res.status(response.status).json({ message: response.message });
}));
export const GetAccountDetails = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const result = yield GetAccountDetailsService(accountId);
    return res.status(result.status).json({ message: result.message, account: result.account });
}));
export const TransactionHistory = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { accountId } = req.params;
    const cursorId = req.query.cursorid;
    const parsedLimit = Number((_a = req.query.limit) !== null && _a !== void 0 ? _a : 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ message: "Limit must be an integer between 1 and 100" });
    }
    const parseDate = (value, endOfDay = false) => {
        if (!value) {
            return undefined;
        }
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const date = new Date(dateOnly
            ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
            : value);
        if (Number.isNaN(date.getTime())) {
            return undefined;
        }
        return date;
    };
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate, true);
    if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
        return res.status(400).json({ message: "startDate and endDate must be valid ISO dates" });
    }
    if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }
    const limit = parsedLimit;
    const result = yield TransactionHistoryService(accountId, cursorId, limit, startDate, endDate);
    return res.status(result.status).json({
        message: result.message,
        transactions: (_b = result.transactions) !== null && _b !== void 0 ? _b : [],
        hasMore: (_c = result.hasMore) !== null && _c !== void 0 ? _c : false,
        nextCursor: (_d = result.nextCursor) !== null && _d !== void 0 ? _d : null
    });
}));
export const GetUserAllAccount = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const result = yield GetUserAllAccountService(userId);
    return res.status(result.status).json({ message: result.message, account: result.account });
}));
export const DeleteAccount = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const result = yield DeleteAccountService(accountId);
    return res.status(result.status).json({ message: result.message });
}));
