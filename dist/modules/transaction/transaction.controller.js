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
import { CreditMoneyService, DepositMoneyService, SendMoneyService } from "./transaction.service.js";
import { DepositMoneySchema } from "./transaction.types.js";
export const SendMoney = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderAccountNo } = req.params;
    const { receiverAccountNo } = req.params;
    const { amount } = req.body;
    // Input validation — these were completely missing before
    if (!senderAccountNo || !receiverAccountNo) {
        throw new ValidationError("Sender and receiver account numbers are required");
    }
    if (senderAccountNo === receiverAccountNo) {
        throw new ValidationError("Cannot send money to the same account");
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new ValidationError("Amount must be a positive number");
    }
    const result = yield SendMoneyService({ senderAccountNo: Number(senderAccountNo), receiverAccountNo: Number(receiverAccountNo), amount });
    return res.status(result.status).json({ message: result.message });
}));
export const DepositMoney = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const result = DepositMoneySchema.safeParse(data);
    if (!result.success) {
        throw new ValidationError("validation failed");
    }
    const transactionDetails = result.data;
    const response = yield DepositMoneyService(transactionDetails);
    return res.status(response.status).json({ message: response.message });
}));
export const CreditMoney = asyncHander((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountNo } = req.params;
    const { amount } = req.body;
    if (!accountNo || isNaN(Number(accountNo))) {
        throw new ValidationError("Invalid account number");
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new ValidationError("Amount must be a positive number");
    }
    const result = yield CreditMoneyService({ accountNo: Number(accountNo), amount });
    return res.status(result.status).json({ message: result.message });
}));
