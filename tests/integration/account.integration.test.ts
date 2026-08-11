import request from "supertest";
import { app } from "../../src/app.js";
import { db } from "../../src/config/db.js";
import { User, Account, Transaction, LedgerSystem, Audit_log } from "../../src/db/schema.js";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

describe("Account & User Integration Tests (Real Postgres)", () => {
    const secret = process.env.AUTH_SECRET || "Aururm";

    beforeEach(async () => {
        // Clean database tables before each test
        await db.execute(sql`TRUNCATE users, account, transaction, ledger_system, audit_log CASCADE;`);
    });

    test("User registration & login happy path", async () => {
        const regRes = await request(app)
            .post("/api/user/register")
            .send({
                name: "Integration User",
                email: "integration@example.com",
                phoneNo: "+919999988888",
                address: "123 Test St",
                password: "Password@123"
            });
        expect(regRes.status).toBe(201);
        expect(regRes.body.message).toContain("Account created successfully");

        const loginRes = await request(app)
            .post("/api/user/login")
            .send({
                phoneNo: "+919999988888",
                password: "Password@123"
            });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.token).toBeDefined();
    });

    test("Schema constraint: Rejects duplicate phone/email at DB level", async () => {
        const userData = {
            name: "User 1",
            email: "duplicate@example.com",
            phoneNo: "+919999977777",
            address: "123 Main St",
            password: "Password@123"
        };
        await request(app).post("/api/user/register").send(userData);

        const dupRes = await request(app).post("/api/user/register").send(userData);
        expect(dupRes.status).toBe(409); // User Already Exist
    });

    test("Create Account with eligibility validation & authorization", async () => {
        // 1. Register User
        await request(app).post("/api/user/register").send({
            name: "Account Holder",
            email: "acc@example.com",
            phoneNo: "+919999966666",
            address: "456 Oak St",
            password: "Password@123"
        });

        // Fetch created user ID from DB
        const users = await db.select().from(User);
        const user = users[0];
        const token = jwt.sign({ id: user.id, phoneNo: user.phoneNo }, secret);

        // 2. Reject saving account under min balance 2000
        const invalidAcc = await request(app)
            .post(`/api/account/create/${user.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ category: "Saving", balance: "1000.00" });
        expect(invalidAcc.status).toBe(400);

        // 3. Create valid saving account (balance >= 2000)
        const validAcc = await request(app)
            .post(`/api/account/create/${user.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ category: "Saving", balance: "5000.00" });
        expect(validAcc.status).toBe(200);

        // 4. Duplicate category creation for same user rejected
        const dupAcc = await request(app)
            .post(`/api/account/create/${user.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ category: "Saving", balance: "5000.00" });
        expect(dupAcc.status).toBe(302); // Account already exists for user
    });

    test("Ownership check: User A cannot access User B's account details (403 Forbidden)", async () => {
        // Register User A
        const userARes = await db.insert(User).values({
            name: "User A",
            email: "usera@example.com",
            phoneNo: "+911111111111",
            address: "Address A",
            password: "hash"
        }).returning();
        const userA = userARes[0];

        // Register User B
        const userBRes = await db.insert(User).values({
            name: "User B",
            email: "userb@example.com",
            phoneNo: "+912222222222",
            address: "Address B",
            password: "hash"
        }).returning();
        const userB = userBRes[0];

        // User B creates an account
        const accBRes = await db.insert(Account).values({
            category: "Saving",
            balance: "10000.00",
            user_id: userB.id
        }).returning();
        const accB = accBRes[0];

        // User A attempts to access User B's account details
        const tokenA = jwt.sign({ id: userA.id, phoneNo: userA.phoneNo }, secret);
        const forbiddenRes = await request(app)
            .get(`/api/account/accountDetails/${accB.id}`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(forbiddenRes.status).toBe(403);
        expect(forbiddenRes.body.message).toContain("permission");
    });
});
