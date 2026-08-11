import { DepositMoneyService, CreditMoneyService } from "../../src/modules/transaction/transaction.service.js";
import { ValidationError } from "../../src/errors/validation/ValidationError.js";

describe("Transaction Service Unit Tests", () => {
    describe("DepositMoneyService Minimum Threshold", () => {
        test("Rejects deposit amount less than 500 with ValidationError", async () => {
            await expect(DepositMoneyService({
                transaction_amount: "499.99",
                sender_account_id: "some-account-id"
            })).rejects.toThrow(ValidationError);
        });

        test("Accepts deposit amount >= 500 (validation check)", async () => {
            // Mocking repository so unit test doesn't touch DB
            const mockRepo = jest.spyOn(require("../../src/modules/transaction/transaction.repository.js"), "DepositMoneyRepository")
                .mockResolvedValueOnce({ message: "Deposit completed", status: 200 });

            const result = await DepositMoneyService({
                transaction_amount: "500.00",
                sender_account_id: "some-account-id"
            });
            expect(result.status).toBe(200);
            mockRepo.mockRestore();
        });
    });

    describe("CreditMoneyService (Withdrawal) Minimum Threshold", () => {
        test("Rejects withdrawal amount less than 500 with ValidationError", async () => {
            await expect(CreditMoneyService({
                accountNo: 123456789,
                amount: "250.00"
            })).rejects.toThrow(ValidationError);
        });

        test("Accepts withdrawal amount >= 500 (validation check)", async () => {
            const mockRepo = jest.spyOn(require("../../src/modules/transaction/transaction.repository.js"), "CreditMoneyRepository")
                .mockResolvedValueOnce({ message: "Withdrawal completed", status: 200 });

            const result = await CreditMoneyService({
                accountNo: 123456789,
                amount: "500.00"
            });
            expect(result.status).toBe(200);
            mockRepo.mockRestore();
        });
    });
});
