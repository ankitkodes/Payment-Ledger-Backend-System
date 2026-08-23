import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../config/db.js";

async function verify() {
    console.log("=== TABLE COUNTS ===");
    const u = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM users`);
    console.log("users:", u.rows[0].cnt);
    const a = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM account`);
    console.log("accounts:", a.rows[0].cnt);
    const t = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM transaction`);
    console.log("transactions:", t.rows[0].cnt);
    const l = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM ledger_system`);
    console.log("ledger_system:", l.rows[0].cnt);
    const al = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM audit_log`);
    console.log("audit_log:", al.rows[0].cnt);

    console.log("\n=== BALANCE SANITY CHECK (first 10 accounts) ===");
    const accounts = await db.execute(sql`
        SELECT 
            a.id,
            a."accountNumber",
            a.balance as stored_balance
        FROM account a
        LIMIT 10
    `);
    console.table(accounts.rows);

    process.exit(0);
}

verify();
