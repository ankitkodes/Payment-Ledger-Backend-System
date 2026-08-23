import "dotenv/config";
import { sql } from "drizzle-orm";
import { User, Account, Transaction, LedgerSystem, Audit_log } from "./schema.js";
import { db } from "../config/db.js";

const PLATFORM_ACCOUNT_ID = process.env.PLATFORM_ACCOUNTNO!.trim();

if (!PLATFORM_ACCOUNT_ID) {
    console.error("❌ PLATFORM_ACCOUNTNO not set in .env");
    process.exit(1);
}

// ─── Realistic Indian Data ───

const FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
    "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Ananya", "Diya", "Myra", "Sara", "Aanya",
    "Aadhya", "Isha", "Kiara", "Riya", "Priya"
];

const LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Gupta", "Singh",
    "Kumar", "Reddy", "Iyer", "Nair", "Joshi",
    "Chopra", "Malhotra", "Bhat", "Desai", "Mehta",
    "Rao", "Pillai", "Agarwal", "Mishra", "Chauhan"
];

const CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
    "Chandigarh", "Kochi", "Indore", "Bhopal", "Nagpur",
    "Coimbatore", "Vadodara", "Surat", "Visakhapatnam", "Thiruvananthapuram"
];

const AREAS = [
    "MG Road", "Gandhi Nagar", "Nehru Colony", "Rajaji Street", "Subhash Marg",
    "Civil Lines", "Defence Colony", "Ashok Vihar", "Laxmi Nagar", "Sadar Bazaar",
    "Model Town", "Vasant Kunj", "Koramangala", "Banjara Hills", "Anna Nagar",
    "Salt Lake", "Deccan Gymkhana", "Navrangpura", "C-Scheme", "Hazratganj"
];

const DOMAINS = ["gmail.com", "yahoo.co.in", "outlook.com", "hotmail.com", "rediffmail.com"];

const ACCOUNT_TYPES: ("Saving" | "Current" | "Salary")[] = ["Saving", "Current", "Salary"];

// ─── Utility Functions ───

function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function generateAccountNumber(): number {
    // Same logic as schema.ts: Math.floor(Math.random() * 1000000000)
    // Stays within PostgreSQL integer range (max 2,147,483,647)
    return Math.floor(Math.random() * 1000000000);
}

function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Generate Seed Data ───

async function seed() {
    try {
        // Check if data already exists
        const existingUsers = await db.select({ count: sql<number>`count(*)` }).from(User);
        if (Number(existingUsers[0].count) > 0) {
            console.log("✅ Database already seeded. Exiting.");
            process.exit(0);
        }

        console.log("🌱 Starting seed...\n");

        // ── 1. Generate Users ──
        console.log("Creating users...");

        const usedPhones = new Set<string>();
        const usedEmails = new Set<string>();

        interface UserRow {
            id: string;
            name: string;
            address: string;
            phoneNo: string;
            email: string;
            password: string;
        }

        const userRows: UserRow[] = [];

        for (let i = 0; i < 20; i++) {
            const firstName = FIRST_NAMES[i];
            const lastName = LAST_NAMES[i];
            const name = `${firstName} ${lastName}`;

            // Unique phone — deterministic base + index ensures uniqueness
            let phone: string;
            do {
                const base = 7000000000 + i * 48723917;
                phone = `+91${String(base).slice(0, 10)}`;
            } while (usedPhones.has(phone));
            usedPhones.add(phone);

            // Unique email
            let email: string;
            do {
                email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${DOMAINS[i % DOMAINS.length]}`;
            } while (usedEmails.has(email));
            usedEmails.add(email);

            const city = CITIES[i];
            const area = AREAS[i];
            const address = `${randomBetween(1, 500)}, ${area}, ${city}, India - ${randomBetween(100000, 999999)}`;

            // bcrypt hash of "Password@123"
            const password = "$2b$10$LZ3e4e5Q7QFn9TjKz6s5qeY8vVJ2Fw5xNcGZB7kL6Mn0hFdLxjKWm";

            userRows.push({
                id: generateUUID(),
                name,
                address,
                phoneNo: phone,
                email,
                password
            });
        }

        // ── 2. Generate Accounts ──
        console.log("Creating accounts...");

        interface AccountRow {
            id: string;
            category: "Saving" | "Current" | "Salary";
            accountNo: number;
            balance: string;
            user_id: string;
        }

        const accountRows: AccountRow[] = [];
        const usedAccountNos = new Set<number>();

        for (const user of userRows) {
            const numAccounts = randomBetween(2, 3);
            const shuffledTypes = [...ACCOUNT_TYPES].sort(() => Math.random() - 0.5);

            for (let j = 0; j < numAccounts; j++) {
                let accountNo: number;
                do {
                    accountNo = generateAccountNumber();
                } while (usedAccountNos.has(accountNo));
                usedAccountNos.add(accountNo);

                // Starting balance between ₹50,000 and ₹5,00,000
                const startingBalance = randomBetween(50000, 500000);

                accountRows.push({
                    id: generateUUID(),
                    category: shuffledTypes[j],
                    accountNo,
                    balance: startingBalance.toFixed(2),
                    user_id: user.id
                });
            }
        }

        console.log(`  Generated ${userRows.length} users, ${accountRows.length} accounts`);

        // ── 2b. Create Platform User & Account ──
        // The ledger_system.account_id FK references account.id,
        // so the platform account must exist in the account table
        console.log("Creating platform user and account...");

        const platformUserId = generateUUID();
        const platformUser: UserRow = {
            id: platformUserId,
            name: "Aurum Platform",
            address: "Aurum HQ, Connaught Place, Delhi, India - 110001",
            phoneNo: "+910000000000",
            email: "platform@aurum.in",
            password: "$2b$10$LZ3e4e5Q7QFn9TjKz6s5qeY8vVJ2Fw5xNcGZB7kL6Mn0hFdLxjKWm"
        };
        userRows.push(platformUser);

        let platformAccountNo: number;
        do {
            platformAccountNo = generateAccountNumber();
        } while (usedAccountNos.has(platformAccountNo));
        usedAccountNos.add(platformAccountNo);

        const platformAccount: AccountRow = {
            id: PLATFORM_ACCOUNT_ID, // Use the exact UUID from .env
            category: "Current" as const,
            accountNo: platformAccountNo,
            balance: "0.00", // Will accumulate platform fees
            user_id: platformUserId
        };
        accountRows.push(platformAccount);

        console.log(`  Total: ${userRows.length} users (incl. platform), ${accountRows.length} accounts (incl. platform)`);

        // ── 3. Generate Transactions & Ledger Entries ──
        console.log("Creating transactions and ledger entries... (this may take a while)");

        const TARGET_TRANSACTIONS = 50000;

        interface TransactionRow {
            id: string;
            transaction_amount: string;
            sender_account_id: string;
            receiver_account_id: string;
            transactionType: "Credit" | "Debit";
            status: "Pending" | "Success" | "Failure";
            account_id: string;
        }

        interface LedgerRow {
            id: string;
            account_id: string;
            transaction_id: string;
            type: "Credit" | "Debit";
            amount: string;
        }

        const transactionRows: TransactionRow[] = [];
        const ledgerRows: LedgerRow[] = [];

        // Track running balances
        const balanceMap = new Map<string, number>();
        for (const acc of accountRows) {
            balanceMap.set(acc.id, parseFloat(acc.balance));
        }

        let attempts = 0;
        const MAX_ATTEMPTS = 200000;
        // Exclude platform account (last in array) from random sender/receiver selection
        const userAccountCount = accountRows.length - 1;

        while (transactionRows.length < TARGET_TRANSACTIONS && attempts < MAX_ATTEMPTS) {
            attempts++;

            const senderIdx = randomBetween(0, userAccountCount - 1);
            let receiverIdx: number;
            do {
                receiverIdx = randomBetween(0, userAccountCount - 1);
            } while (receiverIdx === senderIdx);

            const sender = accountRows[senderIdx];
            const receiver = accountRows[receiverIdx];

            const senderBalance = balanceMap.get(sender.id)!;

            // Transaction amount between ₹100 and ₹50,000
            // Cap at 30% of sender balance to keep balances positive longer
            const maxAffordable = Math.floor(senderBalance * 0.3);
            if (maxAffordable < 100) continue;

            const amount = randomBetween(100, Math.min(maxAffordable, 50000));

            // 3% platform fee
            const platformFee = parseFloat((amount * 0.03).toFixed(2));
            const netAmount = parseFloat((amount - platformFee).toFixed(2));

            // Update running balances
            balanceMap.set(sender.id, parseFloat((senderBalance - amount).toFixed(2)));
            const receiverBalance = balanceMap.get(receiver.id)!;
            balanceMap.set(receiver.id, parseFloat((receiverBalance + netAmount).toFixed(2)));

            const txnId = generateUUID();

            transactionRows.push({
                id: txnId,
                transaction_amount: netAmount.toFixed(2),
                sender_account_id: sender.id,
                receiver_account_id: receiver.id,
                transactionType: "Credit",
                status: "Success",
                account_id: sender.id
            });

            // Ledger entry 1: Debit from sender (full amount)
            ledgerRows.push({
                id: generateUUID(),
                account_id: sender.id,
                transaction_id: txnId,
                type: "Debit",
                amount: amount.toFixed(2)
            });

            // Ledger entry 2: Credit to receiver (net amount after fee)
            ledgerRows.push({
                id: generateUUID(),
                account_id: receiver.id,
                transaction_id: txnId,
                type: "Credit",
                amount: netAmount.toFixed(2)
            });

            // Ledger entry 3: Credit to platform (fee)
            ledgerRows.push({
                id: generateUUID(),
                account_id: PLATFORM_ACCOUNT_ID,
                transaction_id: txnId,
                type: "Credit",
                amount: platformFee.toFixed(2)
            });

            if (transactionRows.length % 10000 === 0) {
                console.log(`  Progress: ${transactionRows.length}/${TARGET_TRANSACTIONS} transactions generated`);
            }
        }

        console.log(`  Generated ${transactionRows.length} transactions and ${ledgerRows.length} ledger entries`);

        // Update final balances in account rows
        for (const acc of accountRows) {
            const finalBalance = balanceMap.get(acc.id)!;
            acc.balance = finalBalance.toFixed(2);
        }

        // ── 4. Generate Audit Logs ──
        console.log("Creating audit logs...");

        interface AuditRow {
            id: string;
            user_id: string;
            entity_id: string;
            action: string;
            entity_type: "User" | "Account" | "Transaction";
            metadata: Record<string, unknown>;
        }

        const auditRows: AuditRow[] = [];

        for (const user of userRows) {
            auditRows.push({
                id: generateUUID(),
                user_id: user.id,
                entity_id: user.id,
                action: "User created",
                entity_type: "User",
                metadata: { name: user.name, email: user.email, phoneNo: user.phoneNo }
            });
        }

        for (const acc of accountRows) {
            auditRows.push({
                id: generateUUID(),
                user_id: acc.user_id,
                entity_id: acc.id,
                action: "Account created",
                entity_type: "Account",
                metadata: { category: acc.category, accountNo: acc.accountNo, userId: acc.user_id }
            });
        }

        // ── 5. Insert Everything in a DB Transaction ──
        console.log("\n📦 Inserting into database...");

        await db.transaction(async (tsx) => {
            // Insert users
            console.log("  Inserting users...");
            await tsx.insert(User).values(userRows);

            // Insert accounts
            console.log("  Inserting accounts...");
            await tsx.insert(Account).values(accountRows);

            // Insert transactions in batches of 1000
            console.log(`  Inserting ${transactionRows.length} transactions...`);
            for (let i = 0; i < transactionRows.length; i += 1000) {
                const batch = transactionRows.slice(i, i + 1000);
                await tsx.insert(Transaction).values(batch);
                if ((i + 1000) % 10000 === 0 || i + 1000 >= transactionRows.length) {
                    console.log(`    ${Math.min(i + 1000, transactionRows.length)}/${transactionRows.length} transactions`);
                }
            }

            // Insert ledger entries in batches of 1000
            console.log(`  Inserting ${ledgerRows.length} ledger entries...`);
            for (let i = 0; i < ledgerRows.length; i += 1000) {
                const batch = ledgerRows.slice(i, i + 1000);
                await tsx.insert(LedgerSystem).values(batch);
                if ((i + 1000) % 10000 === 0 || i + 1000 >= ledgerRows.length) {
                    console.log(`    ${Math.min(i + 1000, ledgerRows.length)}/${ledgerRows.length} ledger entries`);
                }
            }

            // Insert audit logs in batches of 1000
            console.log(`  Inserting ${auditRows.length} audit log entries...`);
            for (let i = 0; i < auditRows.length; i += 1000) {
                const batch = auditRows.slice(i, i + 1000);
                await tsx.insert(Audit_log).values(batch);
            }
        });

        console.log(`\n✅ Done! Seeded ${userRows.length} users, ${accountRows.length} accounts, ${transactionRows.length} transactions`);
        console.log(`   ${ledgerRows.length} ledger entries, ${auditRows.length} audit log entries`);
        process.exit(0);

    } catch (error: unknown) {
        console.error("\n❌ Seed failed with error:");
        if (error instanceof Error) {
            console.error("Message:", error.message);
            if ("cause" in error && error.cause) {
                console.error("Cause:", error.cause);
            }
            console.error("Stack:", error.stack);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

seed();
