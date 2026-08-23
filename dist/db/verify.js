var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../config/db.js";
function verify() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("=== TABLE COUNTS ===");
        const u = yield db.execute(sql `SELECT COUNT(*)::int as cnt FROM users`);
        console.log("users:", u.rows[0].cnt);
        const a = yield db.execute(sql `SELECT COUNT(*)::int as cnt FROM account`);
        console.log("accounts:", a.rows[0].cnt);
        const t = yield db.execute(sql `SELECT COUNT(*)::int as cnt FROM transaction`);
        console.log("transactions:", t.rows[0].cnt);
        const l = yield db.execute(sql `SELECT COUNT(*)::int as cnt FROM ledger_system`);
        console.log("ledger_system:", l.rows[0].cnt);
        const al = yield db.execute(sql `SELECT COUNT(*)::int as cnt FROM audit_log`);
        console.log("audit_log:", al.rows[0].cnt);
        console.log("\n=== BALANCE SANITY CHECK (first 10 accounts) ===");
        const accounts = yield db.execute(sql `
        SELECT 
            a.id,
            a."accountNumber",
            a.balance as stored_balance
        FROM account a
        LIMIT 10
    `);
        console.table(accounts.rows);
        process.exit(0);
    });
}
verify();
