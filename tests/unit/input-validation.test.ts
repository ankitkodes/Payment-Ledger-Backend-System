import { AccountRegister } from "../../src/modules/account/account.types.js";
import { UserSchema } from "../../src/db/schema.js";
import { UserLogin } from "../../src/modules/user/user.types.js";
import { DepositMoneySchema } from "../../src/modules/transaction/transaction.types.js";
import { ValidationError } from "../../src/errors/validation/ValidationError.js";
import { SendMoney, CreditMoney } from "../../src/modules/transaction/transaction.controller.js";

describe("Input Validation & Regression Tests for NaN Withdrawal Bug", () => {
    describe("Zod Schema Parsing", () => {
        test("AccountRegister validates valid input", () => {
            const valid = AccountRegister.safeParse({ category: "Saving", balance: "2500.00" });
            expect(valid.success).toBe(true);
        });

        test("AccountRegister rejects invalid category", () => {
            const invalid = AccountRegister.safeParse({ category: "CryptoAccount", balance: "5000.00" });
            expect(invalid.success).toBe(false);
        });

        test("UserLogin validates login credentials format", () => {
            const valid = UserLogin.safeParse({ phoneNo: "+919876543210", password: "Password@123" });
            expect(valid.success).toBe(true);
        });

        test("DepositMoneySchema validates required fields", () => {
            const valid = DepositMoneySchema.safeParse({
                transaction_amount: "1000.00",
                sender_account_id: "123e4567-e89b-12d3-a456-426614174000"
            });
            expect(valid.success).toBe(true);
        });

        test("DepositMoneySchema rejects missing sender_account_id", () => {
            const invalid = DepositMoneySchema.safeParse({ transaction_amount: "1000.00" });
            expect(invalid.success).toBe(false);
        });
    });

    describe("Regression: req.body NaN Withdrawal & SendMoney Validation Bug", () => {
        test("CreditMoney controller rejects missing or NaN req.body.amount before business logic", async () => {
            const req = {
                params: { accountNo: "123456789" },
                body: { amount: "not_a_number" }
            } as any;
            const res = {} as any;
            const next = jest.fn();

            await CreditMoney(req, res, next);
            expect(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toContain("Amount must be a positive number");
        });

        test("CreditMoney controller rejects negative req.body.amount", async () => {
            const req = {
                params: { accountNo: "123456789" },
                body: { amount: "-500" }
            } as any;
            const res = {} as any;
            const next = jest.fn();

            await CreditMoney(req, res, next);
            expect(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
        });

        test("CreditMoney controller rejects missing req.body.amount", async () => {
            const req = {
                params: { accountNo: "123456789" },
                body: {}
            } as any;
            const res = {} as any;
            const next = jest.fn();

            await CreditMoney(req, res, next);
            expect(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
        });

        test("SendMoney controller rejects transfer to the same account", async () => {
            const req = {
                params: { senderAccountNo: "123456789", receiverAccountNo: "123456789" },
                body: { amount: "500.00" }
            } as any;
            const res = {} as any;
            const next = jest.fn();

            await SendMoney(req, res, next);
            expect(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toContain("Cannot send money to the same account");
        });
    });
});
