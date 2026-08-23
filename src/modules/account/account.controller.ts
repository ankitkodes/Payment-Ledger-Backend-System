import { ValidationError } from "../../errors/validation/ValidationError.js";
import { asyncHander } from "../../shared/handler/asyncHandler.js";
import { CreateAccountService, DeleteAccountService, GetAccountDetailsService, GetUserAllAccountService, TransactionHistoryService } from "./account.service.js";
import { AccountRegister, AccountRegisterSchema } from "./account.types.js"

export const CreateAccount = asyncHander(async (req: { body: AccountRegisterSchema; params: { userId: string } }, res: any) => {

    const { userId } = req.params;
    const result = AccountRegister.safeParse(req.body);
    if (!result.success) {
        throw new ValidationError("validation failed");
    }
    const data = result.data;
    const response = await CreateAccountService(data, userId);
    if (!response) {
        return res.status(500).json({ message: "Some problem occured, try again later" })
    }
    return res.status(response.status).json({ message: response.message })

});


export const GetAccountDetails = asyncHander(async (req: { params: { accountId: string } }, res: any) => {

    const { accountId } = req.params;
    const result = await GetAccountDetailsService(accountId);
    return res.status(result.status).json({ message: result.message, account: result.account });

});

export const TransactionHistory = asyncHander(async (req: { params: { accountId: string }; query: { cursorid?: string; limit?: string } }, res: any) => {

    const { accountId } = req.params;
    const cursorId = req.query.cursorid;
    const parsedLimit = Number(req.query.limit ?? 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ message: "Limit must be an integer between 1 and 100" });
    }

    const limit = parsedLimit;
    const result = await TransactionHistoryService(accountId, cursorId, limit);
    return res.status(result.status).json({
        message: result.message,
        transactions: result.transactions ?? [],
        hasMore: result.hasMore ?? false,
        nextCursor: result.nextCursor ?? null
    })

})

export const GetUserAllAccount = asyncHander(async (req: { params: { userId: string } }, res: any) => {

    const { userId } = req.params;
    const result = await GetUserAllAccountService(userId);
    return res.status(result.status).json({ message: result.message, account: result.account });

});

export const DeleteAccount = asyncHander(async (req: { params: { accountId: string } }, res: any) => {

    const { accountId } = req.params;
    const result = await DeleteAccountService(accountId);
    return res.status(result.status).json({ message: result.message });

})