import { ValidationError } from "../../errors/validation/ValidationError.js";
import { asyncHander } from "../../shared/handler/asyncHandler.js";
import { CreditMoneyService, DepositMoneyService, SendMoneyService } from "./transaction.service.js";
import { DepositMoneySchema } from "./transaction.types.js";


export const SendMoney = asyncHander(async (req: { body: { amount: string }; params: { senderAccountNo: string, receiverAccountNo: string } }, res: any) => {

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

    const result = await SendMoneyService({ senderAccountNo: Number(senderAccountNo), receiverAccountNo: Number(receiverAccountNo), amount });
    return res.status(result.status).json({ message: result.message });

})
export const DepositMoney = asyncHander(async (req: { body: string; }, res: any) => {

    const data = req.body;
    const result = DepositMoneySchema.safeParse(data);
    if (!result.success) {
        throw new ValidationError("validation failed");
    }
    const transactionDetails = result.data;
    const response = await DepositMoneyService(transactionDetails);
    return res.status(response.status).json({ message: response.message });

})


export const CreditMoney = asyncHander(async (req: { body: { amount: string }; params: { accountNo: string } }, res: any) => {

    const { accountNo } = req.params;
    const { amount } = req.body;

    if (!accountNo || isNaN(Number(accountNo))) {
        throw new ValidationError("Invalid account number");
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new ValidationError("Amount must be a positive number");
    }

    const result = await CreditMoneyService({ accountNo: Number(accountNo), amount });
    return res.status(result.status).json({ message: result.message });

});
