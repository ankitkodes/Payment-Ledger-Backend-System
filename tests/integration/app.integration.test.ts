import request from "supertest";
import { app } from "../../src/app.js";

describe("Application Integration & Route Resolution Tests", () => {
    test("GET /api-docs returns 200 or 301 for Swagger UI", async () => {
        const res = await request(app).get("/api-docs/");
        expect([200, 301, 302]).toContain(res.status);
    });

    test("Non-existent API route triggers 404 AppError JSON response", async () => {
        const res = await request(app).get("/api/non-existent-route");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain("Route /api/non-existent-route not found");
    });
});
