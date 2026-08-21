# Aurum — Project Status Report
_Generated: August 21, 2026_

## 1. Summary
Aurum is a Node.js/TypeScript financial payment backend featuring double-entry ledger accounting, PostgreSQL database transactions via Drizzle ORM, JWT authentication, and Swagger API documentation. Overall project completion is estimated at **78%**. While core architectural patterns (route-controller-service-repository stratification, row-level locking via `SELECT FOR UPDATE`, and global error handling) are established and 52 out of 56 tests pass, critical correctness defects—such as single-sided ledger entries for deposits/withdrawals, floating-point currency math, potential row-locking deadlocks in peer-to-peer transfers, and a data-leaking field mapping bug—prevent it from being fully production-ready. **Verdict for Interview-Readiness:** *Strong foundational portfolio project showcasing real backend concepts (row locking, ACID transactions, double-entry design), but requires 2–3 days of key correctness and idempotency fixes to withstand senior backend technical grilling.*

---

## 2. What's Done (Verified)

### User Management Domain
- **User Registration**: `POST /api/user/register` handles user creation with bcrypt password hashing (10 salt rounds) and records audit logs.
  - Evidence: [`src/modules/user/user.routes.ts:8`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.routes.ts#L8), [`src/modules/user/user.controller.ts:8-17`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.controller.ts#L8-L17), [`src/modules/user/user.repository.ts:11-49`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.repository.ts#L11-L49).
- **User Login & Token Generation**: `POST /api/user/login` verifies credentials via `bcrypt.compare` and issues a 12-hour signed JWT token.
  - Evidence: [`src/modules/user/user.routes.ts:9`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.routes.ts#L9), [`src/modules/user/user.repository.ts:52-79`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.repository.ts#L52-L79).
- **Protected User Profile Routes**: `GET /api/user/getProfile/:userId`, `PUT /api/user/update/:userId`, `DELETE /api/user/delete/:userId` protected by authentication and authorization middleware.
  - Evidence: [`src/modules/user/user.routes.ts:10-12`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.routes.ts#L10-L12), [`src/shared/middleware/Authorization.ts:12-31`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/Authorization.ts#L12-L31).

### Bank Account Management Domain
- **Account Creation & Eligibility Enforcement**: `POST /api/account/create/:userId` validates account category eligibility (Saving requires min ₹2,000, Current requires min ₹10,000, Salary requires min ₹0) and enforces one account per category per user.
  - Evidence: [`src/modules/account/account.routes.ts:8`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/account/account.routes.ts#L8), [`src/shared/utils/Account.ts:4-10`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/utils/Account.ts#L4-L10), [`src/modules/account/account.repository.ts:11-54`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/account/account.repository.ts#L11-L54).
- **Account Lookup & Ownership Security**: `GET /api/account/accountDetails/:accountId` and `GET /api/account/account/:userId` restrict access to resource owners.
  - Evidence: [`src/modules/account/account.routes.ts:9,11`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/account/account.routes.ts#L9-L11), [`src/shared/middleware/Authorization.ts:33-57`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/Authorization.ts#L33-L57).
- **Account Statements & Deletion**: `GET /api/account/:accountId/statement` (fetches last 10 transactions) and `DELETE /api/account/deleteAccount/:accountId`.
  - Evidence: [`src/modules/account/account.repository.ts:74-93,105-133`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/account/account.repository.ts#L74-L93).

### Financial Transaction & Double-Entry Ledger Domain
- **Atomic Peer-to-Peer Transfer (`SendMoney`)**: `POST /api/transaction/send/:senderAccountNo/:receiverAccountNo` executes within an ACID DB transaction (`db.transaction`). Applies row locking (`SELECT FOR UPDATE`) on both sender and receiver accounts, calculates a 3% platform fee, creates 1 Transaction row, 1 Audit Log row, and 3 LedgerSystem entries (Sender Debit, Receiver Credit, Platform Credit).
  - Evidence: [`src/modules/transaction/transaction.repository.ts:10-118`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L10-L118).
- **Deposit & Withdrawal Processing**: `POST /api/transaction/deposit` and `POST /api/transaction/withdraw/:accountNo` execute inside DB transactions with `for('update')` locking and minimum ₹500 validation.
  - Evidence: [`src/modules/transaction/transaction.repository.ts:120-245`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L120-L245).

### Architecture, Safety & Documentation
- **Authentication & Authorization**: JWT token extraction, verification, and ownership checks for accounts, users, and transactions.
  - Evidence: [`src/shared/middleware/Authentication.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/Authentication.ts), [`src/shared/middleware/Authorization.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/Authorization.ts).
- **Error Pipeline & Request Wrapping**: `asyncHandler` wrapper applied on all controller functions; custom operational error hierarchy extending `AppError`.
  - Evidence: [`src/errors/base/AppError.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/errors/base/AppError.ts), [`src/shared/handler/asyncHandler.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/handler/asyncHandler.ts), [`src/shared/middleware/globalErrorHandler.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/globalErrorHandler.ts).
- **Interactive OpenAPI 3.0 Documentation**: Complete Swagger UI setup covering all 11 endpoints.
  - Evidence: [`src/config/swagger.ts`](file:///home/ankit-kumar/Desktop/Project/aurum/src/config/swagger.ts), [`src/app.ts:13`](file:///home/ankit-kumar/Desktop/Project/aurum/src/app.ts#L13).

---

## 3. What's Partial / Broken

| Feature / Issue | Description | File Paths & Line Numbers | Severity |
| :--- | :--- | :--- | :--- |
| **Single-Sided Ledger Entries (Deposits & Withdrawals)** | Deposits only write 1 Credit ledger row; Withdrawals only write 1 Debit ledger row. Violates double-entry accounting where every transaction must balance (Debits = Credits). System cash asset / clearing account is missing. | [`src/modules/transaction/transaction.repository.ts:163-168`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L163-L168)<br>[`src/modules/transaction/transaction.repository.ts:229-234`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L229-L234) | **Blocker** |
| **IEEE 754 Floating-Point Currency Arithmetic** | Calculations like `Number(amount)`, `Math.round(numericAmount * 3) / 100`, and `Number(receiver.balance) + totalamount` use JS floating-point numbers instead of integer minor units (paise/cents) or BigInt/Decimal abstractions, leading to potential precision loss. | [`src/modules/transaction/transaction.repository.ts:47,53-54,106-107,138,200`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L47) | **Blocker** |
| **Deadlock Vulnerability in `SendMoney` Row Locking** | Accounts are locked with `.for('update')` in request parameter order (sender first, receiver second). If Account A transfers to Account B simultaneously while Account B transfers to Account A, PostgreSQL can deadlock. Locks must be acquired in deterministic order (e.g., sorted by account ID). | [`src/modules/transaction/transaction.repository.ts:24-45`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L24-L45) | **Blocker** |
| **User Profile Bug: Email returns Phone Number** | In `ProfileRepository`, the select query maps `email: User.phoneNo` instead of `email: User.email`. Fetching user profile returns phone number in place of email. | [`src/modules/user/user.repository.ts:87`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.repository.ts#L87) | **Important** |
| **Inconsistent Error Flow (Plain Objects vs AppError)** | Repositories return plain objects `{ message: "...", status: 302/403 }` for certain error cases (e.g., missing platform account, duplicate account) instead of throwing `AppError` subclasses. This bypasses `globalErrorHandler` and causes test expectation failures. | [`src/modules/user/user.repository.ts:15`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/user/user.repository.ts#L15)<br>[`src/modules/account/account.repository.ts:28,98`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/account/account.repository.ts#L28)<br>[`src/modules/transaction/transaction.repository.ts:14`](file:///home/ankit-kumar/Desktop/Project/aurum/src/modules/transaction/transaction.repository.ts#L14) | **Important** |
| **Duplicate Drizzle Connection Instance** | `Authorization.ts` instantiates its own `drizzle(process.env.DATABASE_URL!)` instead of importing `db` from `config/db.ts`, creating redundant database connection pools. | [`src/shared/middleware/Authorization.ts:10`](file:///home/ankit-kumar/Desktop/Project/aurum/src/shared/middleware/Authorization.ts#L10) | **Polish** |
| **Random Account Number Collision Risk** | `accountNo` uses `$defaultFn(() => Math.floor(Math.random() * 1000000000))`, which can generate numbers with fewer than 9 digits or collide without retry logic on insert. | [`src/db/schema.ts:27-29`](file:///home/ankit-kumar/Desktop/Project/aurum/src/db/schema.ts#L27-L29) | **Polish** |

---

## 4. What's Not Started

- **Idempotency Key Middleware & Persistence**:
  - *Why it matters*: In a financial payment system, network timeouts or client retries can result in duplicate transfers or double deductions if requests are not keyed with a unique `Idempotency-Key` (persisted in DB or Redis).
- **Ledger Balance Reconciliation Script & Endpoint**:
  - *Why it matters*: Double-entry ledgers require regular reconciliation to prove `SUM(LedgerEntries) == Account.balance` for every account. Currently, balance integrity is not verified against ledger totals automatically.
- **Pagination & Date-Range Filtering on Statements**:
  - *Why it matters*: `GetTransactionHistoryRepository` hardcodes `.limit(10)`. Real account statements require cursor/offset pagination (`page`, `limit`) and date filters (`startDate`, `endDate`).
- **Soft Delete Mechanism**:
  - *Why it matters*: Deleting users or accounts executes hard `DELETE` queries (`db.delete(User)`), which cascades or breaks foreign key relationships with historical financial ledger entries. Financial records must be immutable and soft-deleted (`deleted_at`).
- **Rate Limiting & Security Hardening**:
  - *Why it matters*: Authentication (`/login`, `/register`) and transaction endpoints lack rate-limiting middleware (`express-rate-limit`), leaving them open to brute-force attacks and denial-of-service.

---

## 5. Test Coverage Snapshot

| Module / Area | Tested Components | Missing / Untested Scenarios | Status |
| :--- | :--- | :--- | :--- |
| **Unit — Ledger Math** | Minor unit calculation, 3% fee precision, negative/zero/NaN rejection | Edge cases with extreme numbers, currency formatting utils | **PASS** (7/7 tests) |
| **Unit — Error Hierarchy** | Status codes, operational flag, `asyncHandler` error catching, global error formatting | Custom error stack trace formatting checks | **PASS** (10/10 tests) |
| **Unit — Input Validation** | Zod schema validation for user/account/transaction, controller NaN withdrawal checks | Complex payload sanitization, SQL injection boundary strings | **PASS** (9/9 tests) |
| **Unit — Auth JWT** | Token verification, missing/malformed auth header, expired token handling | Refresh tokens, token revoking / blacklist | **PASS** (7/7 tests) |
| **Unit — Services** | Category balance criteria, minimum deposit/withdrawal (₹500) checks | Mocked repository exception handling | **PASS** (7/7 tests) |
| **Integration — App & Routes** | Swagger UI load, 404 route handling | CORS headers, rate limit headers | **PASS** (2/2 tests) |
| **Integration — Auth Middleware** | Route protection, invalid/expired JWT HTTP response formats | Multi-role authorization checks | **PASS** (4/4 tests) |
| **Integration — Account & User** | User registration, login happy path, duplicate phone/email constraint, account creation eligibility, 403 ownership protection | Account deletion cascade side-effects | **PASS** (4/4 tests) |
| **Integration — SendMoney & Concurrency** | Atomic SendMoney transfer, row locking under concurrency, transaction rollback | **FAIL** (3 tests failed due to cloud DB timeout in `beforeEach` and repository returning 403 object instead of throwing error) | **FAIL** (0/3 tests passing, 1 skipped) |

**Overall Jest Test Run Results**: 10 test suites (9 passed, 1 failed), 56 total tests (52 passed, 3 failed, 1 skipped).

---

## 6. Priority Fix List

1. **[Correctness] Fix Single-Sided Ledger Entries for Deposit & Withdrawal**
   - Introduce a system cash/clearing account UUID in `LedgerSystem` so Deposits insert a Debit to Cash + Credit to Account, and Withdrawals insert a Credit to Cash + Debit to Account.
   - *Estimated Effort*: 2 hours.

2. **[Security/Correctness] Implement Minor-Unit Integer Math for Currency**
   - Replace floating-point operations with integer paise/cents (e.g. store/calculate in minor units or use `BigInt`) to prevent float rounding bugs.
   - *Estimated Effort*: 3 hours.

3. **[Concurrency] Implement Deterministic Lock Ordering in `SendMoney`**
   - Sort `senderAccountNo` and `receiverAccountNo` (or their IDs) before acquiring `.for('update')` row locks to eliminate deadlock risks during bi-directional concurrent transfers.
   - *Estimated Effort*: 2 hours.

4. **[Bug Fix] Fix Email Field Mapping in `user.repository.ts`**
   - Change line 87 from `email: User.phoneNo` to `email: User.email`.
   - *Estimated Effort*: 0.5 hours.

5. **[Architecture/Error Handling] Refactor Repositories to Throw `AppError` Subclasses**
   - Replace returning `{ message: "...", status: 403/302 }` with `throw new ForbiddenError()` or `throw new ValidationError()` to ensure uniform JSON responses via `globalErrorHandler`.
   - *Estimated Effort*: 2 hours.

6. **[Feature] Add Idempotency Key Middleware for Money Transfers**
   - Implement an express middleware checking `Idempotency-Key` header against a database table or Redis cache to prevent duplicate financial execution.
   - *Estimated Effort*: 4 hours.

7. **[Polish] Clean up Connection Pooling & Package Engine Script**
   - Remove redundant `drizzle(...)` call in `Authorization.ts` (use shared `db`). Update `package.json` package manager engine configuration.
   - *Estimated Effort*: 1 hour.

---

## 7. If I Only Had 3 Days

If preparing this repository as a showcase portfolio project for backend engineering interviews, focus on these 3 days:

### **Day 1: Financial Correctness & Ledger Integrity**
- Fix single-sided ledger entries in `DepositMoneyRepository` and `CreditMoneyRepository` by introducing an external clearing cash account.
- Fix floating-point currency math in `transaction.repository.ts` by performing calculations in integer minor units (paise).
- Fix the line 87 bug in `user.repository.ts` (`email: User.phoneNo`).
- Standardize error handling: eliminate return objects with status codes in repositories and throw `AppError` subclasses consistently.

### **Day 2: Concurrency & Test Suite Stabilization**
- Sort account IDs before acquiring `.for('update')` in `SendMoneyRespository` to guarantee deadlock-free row locking.
- Adjust Jest integration test timeouts and mock DB setup so `tests/integration/send-money.integration.test.ts` passes 100% reliably.
- Add an automated ledger reconciliation script (`src/db/reconcile.ts`) that runs SQL query `SELECT account_id, SUM(CASE WHEN type = 'Credit' THEN amount ELSE -amount END) FROM ledger_system GROUP BY account_id` and compares against `account.balance`.

### **Day 3: Senior-Level Portfolio Polish**
- Implement `Idempotency-Key` middleware for `/api/transaction/send` with DB persistence.
- Add pagination (`page`, `limit`) and date filters (`startDate`, `endDate`) to `GET /api/account/:accountId/statement`.
- Add rate limiting (`express-rate-limit`) to `/api/user/login` and `/api/transaction/*`.
