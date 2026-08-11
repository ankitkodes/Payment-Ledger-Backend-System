import { CheckElegiblityCriteria } from "../../src/shared/utils/Account.js";
import { ValidationError } from "../../src/errors/validation/ValidationError.js";

describe("Account Service & Utility Unit Tests", () => {
    describe("CheckElegiblityCriteria", () => {
        test("Saving account with balance less than 2000 throws ValidationError", () => {
            expect(() => {
                CheckElegiblityCriteria({ category: "Saving", balance: "1500" });
            }).toThrow(ValidationError);
        });

        test("Saving account with balance 2000 or more succeeds", () => {
            expect(() => {
                CheckElegiblityCriteria({ category: "Saving", balance: "2000" });
            }).not.toThrow();
        });

        test("Current account with balance less than 10000 throws ValidationError", () => {
            expect(() => {
                CheckElegiblityCriteria({ category: "Current", balance: "5000" });
            }).toThrow(ValidationError);
        });

        test("Current account with balance 10000 or more succeeds", () => {
            expect(() => {
                CheckElegiblityCriteria({ category: "Current", balance: "10000" });
            }).not.toThrow();
        });

        test("Salary account has no minimum balance requirement", () => {
            expect(() => {
                CheckElegiblityCriteria({ category: "Salary", balance: "0" });
            }).not.toThrow();
        });
    });
});