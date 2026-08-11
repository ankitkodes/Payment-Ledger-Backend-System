import request from "supertest";
import { app } from "../../src/app.js";
import jwt from "jsonwebtoken";

describe("Auth Middleware Integration Tests", () => {
    test("Rejects request with missing Authorization header (401 Unauthorized)", async () => {
        const res = await request(app).get("/api/account/accountDetails/123456");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Authentication required");
        expect(res.body.stack).toBeUndefined(); // no leaked stack trace
    });

    test("Rejects request with malformed Authorization header (401 Unauthorized)", async () => {
        const res = await request(app)
            .get("/api/account/accountDetails/123456")
            .set("Authorization", "InvalidHeaderFormat 12345");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("Rejects request with tampered JWT signature (401 Invalid Token)", async () => {
        const token = jwt.sign({ id: "user-1" }, "wrong-secret-key");
        const res = await request(app)
            .get("/api/account/accountDetails/123456")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("invalid token");
    });

    test("Rejects request with expired JWT token (401 Invalid Token)", async () => {
        const secret = process.env.AUTH_SECRET || "Aururm";
        const expiredToken = jwt.sign({ id: "user-1" }, secret, { expiresIn: "-1s" });
        const res = await request(app)
            .get("/api/account/accountDetails/123456")
            .set("Authorization", `Bearer ${expiredToken}`);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("invalid token");
    });
});
