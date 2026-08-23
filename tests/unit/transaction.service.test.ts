import { SendMoneyService } from "../../src/modules/transaction/transaction.service.js";

describe("Transaction Service Unit Tests", () => {
    test("SendMoneyService throws error or returns error response when accounts are missing", async () => {
        await expect(SendMoneyService({
            senderAccountNo: 99999,
            receiverAccountNo: 88888,
            amount: "100.00"
        })).rejects.toThrow();
    });
});
