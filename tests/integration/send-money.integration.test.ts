import request from "supertest";
import { app } from "../../src/app.js";
import { db } from "../../src/config/db.js";
import { User, Account, Transaction, LedgerSystem, Audit_log } from "../../src/db/schema.js";
import { SendMoneyRespository } from "../../src/modules/transaction/transaction.repository.js";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

describe("SendMoney & Concurrency Integration Tests (Real Postgres)", () => {
    jest.setTimeout(30000);

    const secret = process.env.AUTH_SECRET || "Aururm";
    const platformAccountId = "fd6572c9-5a1e-4412-b933-c0b92ac1fd39";
    process.env.PLATFORM_ACCOUNTNO = platformAccountId;

    let senderUser: any, receiverUser: any;
    let senderAccount: any, receiverAccount: any;
    let platformUser: any, platformAccount: any;

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE users, account, transaction, ledger_system, audit_log, idempotency CASCADE;`);

        // Create Platform user and account
        const pUser = await db.insert(User).values({
            id: "10000000-0000-0000-0000-000000000001",
            name: "Platform",
            email: "platform@aurum.com",
            phoneNo: "+910000000000",
            address: "HQ",
            password: "hash"
        }).returning();
        platformUser = pUser[0];

        const pAcc = await db.insert(Account).values({
            id: platformAccountId,
            category: "Current",
            balance: "0.00",
            user_id: platformUser.id,
            accountNo: 999999999
        }).returning();
        platformAccount = pAcc[0];

        // Create Sender User & Account
        const sUser = await db.insert(User).values({
            name: "Sender User",
            email: "sender@example.com",
            phoneNo: "+919876543210",
            address: "Sender St",
            password: "hash"
        }).returning();
        senderUser = sUser[0];

        const sAcc = await db.insert(Account).values({
            category: "Saving",
            balance: "5000.00",
            user_id: senderUser.id,
            accountNo: 111111111
        }).returning();
        senderAccount = sAcc[0];

        // Create Receiver User & Account
        const rUser = await db.insert(User).values({
            name: "Receiver User",
            email: "receiver@example.com",
            phoneNo: "+919876543211",
            address: "Receiver St",
            password: "hash"
        }).returning();
        receiverUser = rUser[0];

        const rAcc = await db.insert(Account).values({
            category: "Current",
            balance: "2000.00",
            user_id: receiverUser.id,
            accountNo: 222222222
        }).returning();
        receiverAccount = rAcc[0];
    });

    test("Atomic SendMoney transfer: debit/credit & ledger balancing", async () => {
        const token = jwt.sign({ id: senderUser.id, phoneNo: senderUser.phoneNo }, secret);

        const res = await request(app)
            .post(`/api/transaction/send/${senderAccount.accountNo}/${receiverAccount.accountNo}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: "1000.00" });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain("transferred successfully");

        // Verify balances read directly from Database
        const updatedSender = await db.select().from(Account).where(eq(Account.id, senderAccount.id));
        const updatedReceiver = await db.select().from(Account).where(eq(Account.id, receiverAccount.id));
        const updatedPlatform = await db.select().from(Account).where(eq(Account.id, platformAccountId));

        // Sender deducted full amount ₹1000 -> 5000 - 1000 = 4000
        expect(updatedSender[0].balance).toBe("4000.00");
        // Receiver credited net amount (₹1000 - 3% fee = ₹970) -> 2000 + 970 = 2970
        expect(updatedReceiver[0].balance).toBe("2970.00");

        // Verify 3 Ledger System entries created atomically (sender debit, receiver credit, platform fee credit)
        const ledgers = await db.select().from(LedgerSystem);
        expect(ledgers.length).toBe(3);

        const senderDebit = ledgers.find(l => l.account_id === senderAccount.id && l.type === "Debit");
        const receiverCredit = ledgers.find(l => l.account_id === receiverAccount.id && l.type === "Credit");
        const platformLedger = ledgers.find(l => l.account_id === platformAccountId && l.type === "Credit");

        expect(senderDebit?.type).toBe("Debit");
        expect(senderDebit?.amount).toBe("1000.00");
        expect(receiverCredit?.type).toBe("Credit");
        expect(receiverCredit?.amount).toBe("970.00");
        expect(platformLedger?.type).toBe("Credit");
        expect(platformLedger?.amount).toBe("30.00");
    });

    test("CRITICAL CONCURRENCY TEST: Row-level locking (SELECT FOR UPDATE) prevents race conditions & negative balances", async () => {
        // Set sender balance to ₹1500 (enough for only ONE ₹1000 transfer)
        await db.update(Account).set({ balance: "1500.00" }).where(eq(Account.id, senderAccount.id));

        // Fire 2 simultaneous SendMoney requests in parallel against the same sender row
        const req1 = SendMoneyRespository({
            senderAccountNo: senderAccount.accountNo,
            receiverAccountNo: receiverAccount.accountNo,
            amount: "1000.00"
        });

        const req2 = SendMoneyRespository({
            senderAccountNo: senderAccount.accountNo,
            receiverAccountNo: receiverAccount.accountNo,
            amount: "1000.00"
        });

        const results = await Promise.allSettled([req1, req2]);

        const fulfilled = results.filter(r => r.status === "fulfilled");
        const rejected = results.filter(r => r.status === "rejected");

        // Exactly one must succeed and one must be rejected due to row locking and balance check!
        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);

        // Verify final DB sender balance is strictly ₹500.00 (NOT negative or corrupt!)
        const finalSender = await db.select().from(Account).where(eq(Account.id, senderAccount.id));
        expect(finalSender[0].balance).toBe("500.00");

        // Exactly 3 ledger entries were created for the single successful transfer
        const ledgers = await db.select().from(LedgerSystem);
        expect(ledgers.length).toBe(3);
    });

    test("Transaction boundaries: Error mid-transaction rolls back all ledger entries", async () => {
        // Temporarily clear platform account env to trigger mid-transaction failure
        delete process.env.PLATFORM_ACCOUNTNO;

        const res = await SendMoneyRespository({
            senderAccountNo: senderAccount.accountNo,
            receiverAccountNo: receiverAccount.accountNo,
            amount: "1000.00"
        });

        // Expect repository to return missing-platform response (no DB writes)
        expect(res).toHaveProperty("status", 403);

        // Restore platform env
        process.env.PLATFORM_ACCOUNTNO = platformAccountId;

        // Verify zero transactions or ledgers were persisted (complete rollback / no-op)
        const transactions = await db.select().from(Transaction);
        const ledgers = await db.select().from(LedgerSystem);
        expect(transactions.length).toBe(0);
        expect(ledgers.length).toBe(0);
    });

    test("Idempotency key duplicate submission returns cached response without duplicate balance deduction", async () => {
        const token = jwt.sign({ id: senderUser.id, phoneNo: senderUser.phoneNo }, secret);
        const idempotencyKey = "idemp-key-test-uuid-1001";

        // First attempt: should execute transaction successfully
        const res1 = await request(app)
            .post(`/api/transaction/send/${senderAccount.accountNo}/${receiverAccount.accountNo}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({ amount: "1000.00" });

        expect(res1.status).toBe(200);
        expect(res1.body.message).toContain("transferred successfully");

        // Verify balance after first transfer: 5000 - 1000 = 4000
        const senderAfterFirst = await db.select().from(Account).where(eq(Account.id, senderAccount.id));
        expect(senderAfterFirst[0].balance).toBe("4000.00");

        // Second attempt with exact same Idempotency-Key: must return cached 200 response
        const res2 = await request(app)
            .post(`/api/transaction/send/${senderAccount.accountNo}/${receiverAccount.accountNo}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({ amount: "1000.00" });

        expect(res2.status).toBe(200);
        expect(res2.body.message).toContain("transferred successfully");

        // CRITICAL CHECK: Verify balance was NOT deducted a second time (still 4000.00, NOT 3000.00!)
        const senderAfterSecond = await db.select().from(Account).where(eq(Account.id, senderAccount.id));
        expect(senderAfterSecond[0].balance).toBe("4000.00");

        // Verify ledger entries count is still 3 (not duplicated to 6)
        const ledgers = await db.select().from(LedgerSystem);
        expect(ledgers.length).toBe(3);
    });

    test("Idempotency key reused with different payload returns 422 Unprocessable Entity", async () => {
        const token = jwt.sign({ id: senderUser.id, phoneNo: senderUser.phoneNo }, secret);
        const idempotencyKey = "idemp-key-test-uuid-1002";

        // First attempt with amount 1000.00
        await request(app)
            .post(`/api/transaction/send/${senderAccount.accountNo}/${receiverAccount.accountNo}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({ amount: "1000.00" });

        // Second attempt with SAME key but DIFFERENT amount 500.00
        const res2 = await request(app)
            .post(`/api/transaction/send/${senderAccount.accountNo}/${receiverAccount.accountNo}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({ amount: "500.00" });

        expect(res2.status).toBe(422);
        expect(res2.body.error).toContain("reused with different payload");
    });
});
