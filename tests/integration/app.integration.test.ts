import request from "supertest";
import { app } from "../../src/app.js";

describe("Application Basic Integration Tests", () => {
    test("GET /unknown-route returns 404 Not Found", async () => {
        const res = await request(app).get("/api/unknown-route");
        expect(res.status).toBe(404);
    });
});
