import { ValidationError } from "../../src/errors/validation/ValidationError.js";

// Helper double-entry ledger calculation matching Aurum's business rules
export function calculateTransferLedger(amount: string | number) {
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new ValidationError("Amount must be a positive number");
    }

    // Check integer minor-units or max 2 decimal places precision
    const cents = Math.round(numericAmount * 100);
    if (Math.abs(numericAmount * 100 - cents) > 0.0001) {
        throw new ValidationError("Amount cannot exceed 2 decimal places (minor units)");
    }

    const platformFeeCents = Math.round(cents * 0.03);
    const receiverNetCents = cents - platformFeeCents;

    const platformFee = (platformFeeCents / 100).toFixed(2);
    const receiverNet = (receiverNetCents / 100).toFixed(2);
    const totalDebit = (cents / 100).toFixed(2);

    return {
        senderDebit: totalDebit,
        receiverCredit: receiverNet,
        platformFeeCredit: platformFee,
        totalDebitCents: cents,
        totalCreditCents: receiverNetCents + platformFeeCents,
        balanced: cents === (receiverNetCents + platformFeeCents)
    };
}

describe("Ledger Math & Double-Entry Balancing", () => {
    test("Debit and Credit totals are strictly equal (Double-entry principle)", () => {
        const result = calculateTransferLedger(100.00);
        expect(result.balanced).toBe(true);
        expect(result.totalDebitCents).toBe(result.totalCreditCents);
        expect(result.senderDebit).toBe("100.00");
        expect(result.receiverCredit).toBe("97.00");
        expect(result.platformFeeCredit).toBe("3.00");
    });

    test("Fee calculation rounds accurately to 2 decimal places (minor units)", () => {
        // ₹19.99 transfer: 3% is 0.5997 -> rounds to 0.60 fee, net 19.39
        const result = calculateTransferLedger("19.99");
        expect(result.balanced).toBe(true);
        expect(result.platformFeeCredit).toBe("0.60");
        expect(result.receiverCredit).toBe("19.39");
        expect(result.senderDebit).toBe("19.99");
    });

    test("Rejects negative transfer amounts", () => {
        expect(() => calculateTransferLedger(-50)).toThrow(ValidationError);
        expect(() => calculateTransferLedger("-100.50")).toThrow(ValidationError);
    });

    test("Rejects zero transfer amounts", () => {
        expect(() => calculateTransferLedger(0)).toThrow(ValidationError);
        expect(() => calculateTransferLedger("0.00")).toThrow(ValidationError);
    });

    test("Rejects malformed non-numeric transfer amounts (NaN)", () => {
        expect(() => calculateTransferLedger("abc")).toThrow(ValidationError);
        expect(() => calculateTransferLedger(NaN)).toThrow(ValidationError);
        expect(() => calculateTransferLedger(undefined as any)).toThrow(ValidationError);
    });

    test("Rejects fractional minor units exceeding 2 decimal places", () => {
        expect(() => calculateTransferLedger(10.005)).toThrow(ValidationError);
        expect(() => calculateTransferLedger("100.123")).toThrow(ValidationError);
    });
});
