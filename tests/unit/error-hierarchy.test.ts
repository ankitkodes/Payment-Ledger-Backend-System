import { AppError } from "../../src/errors/base/AppError.js";
import { ValidationError } from "../../src/errors/validation/ValidationError.js";
import { UnauthorizedError } from "../../src/errors/auth/UnauthorizedError.js";
import { InvalidTokenError } from "../../src/errors/auth/InvalidTokenError.js";
import { ForbiddenError } from "../../src/errors/auth/ForbiddenError.js";
import { AccountNotFoundError } from "../../src/errors/account/AccountNotFoundError.js";
import { InsufficientBalanceError } from "../../src/errors/account/InsufficientBalanceError.js";
import { asyncHander } from "../../src/shared/handler/asyncHandler.js";
import { globalErrorHanlder } from "../../src/shared/middleware/globalErrorHandler.js";
import { notFoundHandler } from "../../src/shared/middleware/notFoundHandler.js";

describe("AppError Hierarchy & Handler Unit Tests", () => {
    describe("Error Hierarchy Status Codes & Shapes", () => {
        test("AppError instantiates with correct operational flags", () => {
            const err = new AppError("Base error", 400);
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(AppError);
            expect(err.StatusCode).toBe(400);
            expect(err.isOpertional).toBe(true);
        });

        test("ValidationError produces 400 status and includes error list", () => {
            const err = new ValidationError("Invalid field", ["field1 is required"]);
            expect(err.StatusCode).toBe(400);
            expect(err.errors).toEqual(["field1 is required"]);
        });

        test("UnauthorizedError produces 401 status", () => {
            const err = new UnauthorizedError();
            expect(err.StatusCode).toBe(401);
            expect(err.message).toBe("Authentication required");
        });

        test("InvalidTokenError produces 401 status", () => {
            const err = new InvalidTokenError();
            expect(err.StatusCode).toBe(401);
            expect(err.message).toBe("invalid token");
        });

        test("ForbiddenError produces 403 status", () => {
            const err = new ForbiddenError();
            expect(err.StatusCode).toBe(403);
            expect(err.message).toContain("permission");
        });

        test("AccountNotFoundError produces 400 status with account no", () => {
            const err = new AccountNotFoundError("999888777");
            expect(err.StatusCode).toBe(400);
            expect(err.message).toContain("999888777");
        });

        test("InsufficientBalanceError produces 400 status", () => {
            const err = new InsufficientBalanceError();
            expect(err.StatusCode).toBe(400);
            expect(err.message).toBe("insufficient balance");
        });
    });

    describe("asyncHandler Wrapper", () => {
        test("Passes successful async response through", async () => {
            const mockController = async (req: any, res: any) => {
                res.status(200).json({ success: true });
            };
            const wrapped = asyncHander(mockController);

            const req = {} as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as any;
            const next = jest.fn();

            await wrapped(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(next).not.toHaveBeenCalled();
        });

        test("Catches async throw and forwards error to next()", async () => {
            const mockController = async () => {
                throw new InsufficientBalanceError();
            };
            const wrapped = asyncHander(mockController);

            const req = {} as any;
            const res = {} as any;
            const next = jest.fn();

            await wrapped(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(InsufficientBalanceError);
        });
    });

    describe("Global Error & Not Found Handlers", () => {
        test("globalErrorHanlder formats AppError with status code and message", async () => {
            const err = new ValidationError("Missing params");
            const req = {} as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as any;
            const next = jest.fn();

            await globalErrorHanlder(err, req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Missing params" });
        });

        test("globalErrorHanlder formats generic unhandled error as 500", async () => {
            const err = new Error("Database crashed");
            const req = {} as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as any;
            const next = jest.fn();

            const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
            await globalErrorHanlder(err, req, res, next);
            consoleSpy.mockRestore();

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "An internal server error has occurred" });
        });

        test("notFoundHandler passes AppError(404) to next()", async () => {
            const req = { originalUrl: "/api/unknown" } as any;
            const res = {} as any;
            const next = jest.fn();

            await notFoundHandler(req, res, next);
            expect(next).toHaveBeenCalled();
            const err = next.mock.calls[0][0];
            expect(err).toBeInstanceOf(AppError);
            expect(err.StatusCode).toBe(404);
            expect(err.message).toContain("/api/unknown");
        });
    });
});
