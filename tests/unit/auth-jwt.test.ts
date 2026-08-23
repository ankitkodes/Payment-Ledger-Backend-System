import jwt from "jsonwebtoken";
import { authenticate } from "../../src/shared/middleware/Authentication.js";
import { UnauthorizedError } from "../../src/errors/auth/UnauthorizedError.js";
import { InvalidTokenError } from "../../src/errors/auth/InvalidTokenError.js";

describe("JWT & Authentication Middleware Unit Tests", () => {
    const originalEnv = process.env.AUTH_SECRET;

    beforeEach(() => {
        process.env.AUTH_SECRET = "test-secret-key-12345";
    });

    afterAll(() => {
        process.env.AUTH_SECRET = originalEnv;
    });

    test("Successfully authenticates valid JWT token and sets req.user", () => {
        const payload = { id: "user-123", phoneNo: "+919876543210" };
        const token = jwt.sign(payload, process.env.AUTH_SECRET!);

        const req: any = {
            headers: {
                authorization: `Bearer ${token}`
            }
        };
        const res: any = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(); // called with no error
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe("user-123");
    });

    test("Rejects missing Authorization header with UnauthorizedError", () => {
        const req: any = { headers: {} };
        const res: any = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(UnauthorizedError);
    });

    test("Rejects Authorization header without Bearer prefix with UnauthorizedError", () => {
        const req: any = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
        const res: any = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(UnauthorizedError);
    });

    test("Regression: Catches invalid/tampered token cleanly without unhandled async exception or crash", () => {
        const req: any = { headers: { authorization: "Bearer invalid.jwt.token" } };
        const res: any = {};
        const next = jest.fn();

        expect(() => authenticate(req, res, next)).not.toThrow();

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(InvalidTokenError);
    });

    test("Regression: Catches expired token cleanly with InvalidTokenError via next()", () => {
        const payload = { id: "user-123" };
        const expiredToken = jwt.sign(payload, process.env.AUTH_SECRET!, { expiresIn: "-1s" });

        const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
        const res: any = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(InvalidTokenError);
    });

    test("Returns 500 error if AUTH_SECRET is not configured", () => {
        delete process.env.AUTH_SECRET;
        const req: any = { headers: { authorization: "Bearer some.token.here" } };
        const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err.statusCode).toBe(500);
        expect(err.message).toBe("authentication secret not configured");
    });
});
