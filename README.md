<div align="center">

<br/>

# Aurum

**A modern payment ledger backend with double-entry bookkeeping**

<br/>

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Drizzle](https://img.shields.io/badge/drizzle--orm-0.45-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)

<br/>

[Overview](#overview) · [Quick Start](#quick-start) · [Project Structure](#project-structure) · [API](#api-endpoints) · [Database](#database-design)

<br/>

</div>

---

## Overview

Aurum is a production-focused backend system that models the core operations of a digital payments platform. It handles user identity, multi-account banking, peer-to-peer money transfers with platform fee deduction, and maintains a double-entry ledger that records both sides of every financial movement.

**What it does:**

- Registers users with hashed credentials and issues stateless JWT sessions
- Manages multiple bank accounts per user (Saving, Current, Salary) with enforced minimum balance rules
- Processes three transaction types: P2P transfers, deposits, and withdrawals
- Records every transaction as balanced debit/credit entries in a dedicated ledger table
- Deducts a 3% platform fee on peer-to-peer transfers and routes it to a platform account
- Tracks entity-level mutations through a structured audit log
- Serves interactive API documentation via Swagger UI at `/api-docs`

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 11.2 (enforced via `devEngines` in `package.json`)
- **PostgreSQL** — a running instance, or a free [Neon](https://neon.tech/) serverless database

### 1 — Clone and install

```bash
git clone https://github.com/ankitkodes/aurum.git
cd aurum
pnpm install
```

### 2 — Configure environment

Create a `.env` file in the project root with the following variables:

```env
# PostgreSQL connection string (Neon, Supabase, local, etc.)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Secret used to sign and verify JWT tokens
AUTH_SECRET=your-jwt-secret-here

# UUID of the platform's own account (receives the 3% transfer fee)
PLATFORM_ACCOUNTNO=

# Server port (defaults to 4000 if omitted)
PORT=4000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string with SSL mode |
| `AUTH_SECRET` | Yes | HMAC secret for `jsonwebtoken` — used to sign JWTs with a 12-hour expiry |
| `PLATFORM_ACCOUNTNO` | Yes | The account UUID that collects platform fees on P2P transfers |
| `PORT` | No | HTTP port for Express (defaults to `4000`) |

### 3 — Set up the database

Aurum uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for schema management. The schema source of truth is `src/db/schema.ts`.

```bash
# Push the current schema directly to the database (development)
pnpm drizzle-kit push

# Or generate a migration file first, then apply
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

To completely reset the database (drops all tables, enums, and sequences):

```bash
pnpm tsx src/db/reset.ts
```

### 4 — Start the server

```bash
pnpm dev
```

This runs `tsc-watch`, which compiles TypeScript on every file change and automatically restarts the server. Output is compiled to `dist/`.

```
running port on 4000
```

Open **http://localhost:4000/api-docs** — the full Swagger UI is available with every endpoint documented, including request/response schemas and a working "Authorize" button for JWT.

---

## Project Structure

```
aurum/
├── src/
│   ├── index.ts                          # App entry — Express bootstrap, middleware, route mounting
│   │
│   ├── config/
│   │   └── swagger.ts                    # OpenAPI 3.0 spec definition + Swagger UI router
│   │
│   ├── db/
│   │   ├── schema.ts                     # Drizzle ORM table & enum definitions, Zod insert schemas
│   │   └── reset.ts                      # Utility script to drop all tables/enums/sequences
│   │
│   ├── modules/
│   │   ├── user/
│   │   │   ├── user.routes.ts            # Route definitions: register, login, profile CRUD
│   │   │   ├── user.controller.ts        # Request parsing, Zod validation, response formatting
│   │   │   ├── user.service.ts           # Business logic delegation
│   │   │   ├── user.repository.ts        # DB queries — bcrypt hashing, JWT signing, Drizzle selects/inserts
│   │   │   └── user.types.ts             # Zod schemas & TypeScript types (UserLogin, UserRegistration)
│   │   │
│   │   ├── account/
│   │   │   ├── account.routes.ts         # Route definitions: create, get details, list, delete
│   │   │   ├── account.controller.ts     # Request parsing, response formatting
│   │   │   ├── account.service.ts        # Eligibility checks before account creation
│   │   │   ├── account.repository.ts     # DB queries — account CRUD via Drizzle
│   │   │   └── account.types.ts          # Zod schemas & TypeScript types (AccountRegister)
│   │   │
│   │   └── transaction/
│   │       ├── transaction.routes.ts     # Route definitions: send, deposit, credit (withdraw)
│   │       ├── transaction.controller.ts # Request parsing, response formatting
│   │       ├── transaction.service.ts    # Min-amount validation (₹500 for deposit/withdrawal)
│   │       ├── transaction.repository.ts # DB transactions — balance updates, ledger entries, fee splits
│   │       └── transaction.types.ts      # Zod schemas & TypeScript types (SendMoney, Deposit, Credit)
│   │
│   └── shared/
│       ├── middleware/
│       │   ├── Authentication.ts         # JWT verification middleware (Bearer token extraction)
│       │   └── Authorization.ts          # Role-based access control (placeholder)
│       ├── utils/
│       │   └── Account.ts               # Account eligibility rules (min balance per category)
│       └── validator/                    # Shared validation utilities (extensible)
│
├── drizzle/                              # Generated migration files (output of drizzle-kit generate)
├── dist/                                 # Compiled JavaScript output (generated by tsc)
│
├── .env                                  # Environment variables (not committed)
├── .gitignore                            # Ignores node_modules, .env, dist, generated files
├── drizzle.config.ts                     # Drizzle Kit config — schema path, output dir, DB credentials
├── tsconfig.json                         # TypeScript config — ES2016 target, NodeNext modules, strict mode
├── package.json                          # Project metadata, scripts, dependencies
└── pnpm-workspace.yaml                   # pnpm workspace configuration
```

### File-by-file breakdown

#### Entry Point

| File | Purpose |
|------|---------|
| `src/index.ts` | Creates the Express app, applies `express.json()` middleware, mounts the Swagger UI at `/api-docs`, and registers the three API routers (`/api/user`, `/api/account`, `/api/transaction`). Starts listening on the configured port. |

#### Config

| File | Purpose |
|------|---------|
| `src/config/swagger.ts` | Defines the complete OpenAPI 3.0 specification inline as a TypeScript object — all paths, schemas, security schemes, and tag descriptions. Exports a `swaggerRouter` that serves Swagger UI with persistent authorization enabled. |

#### Database Layer

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Single source of truth for the database schema. Defines 5 tables (`users`, `account`, `transaction`, `ledger_system`, `audit_log`) and 4 enums using Drizzle ORM's `pgTable` and `pgEnum` builders. Also exports Zod insert schemas via `drizzle-zod` for runtime validation. |
| `src/db/reset.ts` | Standalone script that connects directly via `pg` client and drops all tables, custom enum types, and sequences in the `public` schema. Used during development to fully reset the database state. |
| `drizzle.config.ts` | Drizzle Kit configuration — points to the schema file, sets the output directory for migrations (`./drizzle`), and reads `DATABASE_URL` from the environment. |

#### Modules

Each module follows a consistent 5-file pattern:

| Layer | File | Responsibility |
|-------|------|----------------|
| **Routes** | `*.routes.ts` | Maps HTTP methods and paths to controller functions. Applies authentication middleware where required. |
| **Controller** | `*.controller.ts` | Extracts and validates request data (params, body) using Zod schemas. Calls the service layer and formats the HTTP response. |
| **Service** | `*.service.ts` | Contains business rules — eligibility checks, minimum amount enforcement, orchestration logic. Delegates to the repository. |
| **Repository** | `*.repository.ts` | Executes database operations using Drizzle ORM. Handles DB transactions (atomic multi-table writes), password hashing (bcrypt), and token generation (JWT). |
| **Types** | `*.types.ts` | Defines Zod validation schemas (picked from the Drizzle insert schemas) and TypeScript types derived via `z.infer`. |

#### Shared

| File | Purpose |
|------|---------|
| `shared/middleware/Authentication.ts` | Extracts the `Bearer` token from the `Authorization` header, verifies it against `AUTH_SECRET` using `jsonwebtoken`, and attaches the decoded user payload to `req.user`. Returns `401` on missing or invalid tokens. |
| `shared/middleware/Authorization.ts` | Placeholder for role-based access control logic. |
| `shared/utils/Account.ts` | Exports `CheckElegiblityCriteria()` — enforces minimum opening balance rules: ₹2,000 for Saving accounts, ₹10,000 for Current accounts, no minimum for Salary accounts. |

#### Root Config Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler options — targets ES2016, uses `NodeNext` module resolution, outputs to `./dist`, enables strict mode and ES module interop. |
| `package.json` | Declares `"type": "module"` for native ESM. Dev script uses `tsc-watch` for hot-reload. Enforces pnpm ≥ 11.2 via `devEngines`. |
| `.gitignore` | Excludes `node_modules`, `.env`, and generated Prisma files from version control. |

---

## API Endpoints

> **Base path:** `/api`  
> **Docs:** `http://localhost:4000/api-docs` (Swagger UI with try-it-out support)

All endpoints except Register and Login require a JWT Bearer token in the `Authorization` header.

### User — `/api/user`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/register` | — | Create a new user (hashes password with bcrypt) |
| `POST` | `/login` | — | Authenticate with phone + password, receive a JWT (12h expiry) |
| `GET` | `/getProfile/:userId` | ✓ | Retrieve user profile by UUID |
| `PUT` | `/update/:userId` | ✓ | Update profile fields |
| `DELETE` | `/delete/:userId` | ✓ | Permanently delete user |

### Account — `/api/account`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/create/:userId` | ✓ | Open a new bank account (Saving / Current / Salary) |
| `GET` | `/accountDetails/:accountId` | ✓ | Get single account details |
| `GET` | `/:accountId/statement` | ✓ | Retrieve transaction history for an account |
| `GET` | `/account/:userId` | ✓ | List all accounts for a user |
| `DELETE` | `/deleteAccount/:accountId` | ✓ | Close an account |

**Minimum balance rules:**

| Account Type | Minimum Opening Deposit |
|:-------------|:-----------------------|
| Saving | ₹ 2,000 |
| Current | ₹ 10,000 |
| Salary | None |

### Transaction — `/api/transaction`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/send/:senderAccountNo/:receiverAccountNo` | ✓ | P2P transfer between accounts with a 3% platform fee deducted |
| `POST` | `/deposit` | ✓ | Deposit money into an account (minimum ₹500) |
| `POST` | `/withdraw/:accountNo` | ✓ | Withdraw money from an account (minimum ₹500) |

**P2P transfer flow:**
1. Validate both sender and receiver accounts exist.
2. Check sender has sufficient balance.
3. Within a single DB transaction:
   - Create a `Transaction` record
   - Insert `Debit` ledger entry for the sender
   - Insert `Credit` ledger entry for the receiver (amount minus 3% fee)
   - Insert `Credit` ledger entry for the platform account (3% fee)
   - Update both account balances

---

## Database Design

Five tables with referential integrity enforced via foreign keys:

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │   audit_log      │
├──────────────────┤       ├──────────────────┤
│ id          (PK) │◄──────│ user_id     (FK) │
│ name             │       │ entity_id        │
│ address          │       │ action           │
│ phoneNo     (UK) │       │ entity_type      │
│ email       (UK) │       │ metadata   (JSON)│
│ password         │       │ created_at       │
│ created_at       │       └──────────────────┘
│ updated_at       │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│     account      │
├──────────────────┤
│ id          (PK) │◄──────────────────────────────────┐
│ category   (enum)│  Saving │ Current │ Salary        │
│ accountNo   (UK) │                                   │
│ balance (15,2)   │       ┌──────────────────┐        │
│ user_id     (FK) │       │   transaction    │        │
│ created_at       │       ├──────────────────┤        │
│ updated_at       │       │ id          (PK) │◄───┐   │
└──────────────────┘       │ amount     (15,2)│    │   │
         ▲                 │ sender_id   (FK) │────┘   │
         │                 │ receiver_id (FK) │────────┘
         │                 │ type       (enum)│  Credit │ Debit
         │                 │ status     (enum)│  Pending │ Success │ Failure
         │                 │ account_id  (FK) │────┐
         │                 │ created_at       │    │
         │                 └────────┬─────────┘    │
         │                          │              │
         │                          │ 1:N          │
         │                          ▼              │
         │                 ┌──────────────────┐    │
         │                 │  ledger_system   │    │
         │                 ├──────────────────┤    │
         └─────────────────│ account_id  (FK) │    │
                           │ transaction_id(FK)│◄──┘
                           │ type       (enum)│  Credit │ Debit
                           │ amount     (15,2)│
                           │ timestamp        │
                           └──────────────────┘
```

**Enums:** `account_type` (Saving, Current, Salary) · `transaction_type_enums` (Credit, Debit) · `status` (Pending, Success, Failure) · `entity_type` (User, Account, Transaction)

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Runtime | Node.js + TypeScript 6 | Type-safe server-side JavaScript |
| Framework | Express 5 | HTTP routing and middleware |
| ORM | Drizzle ORM | Type-safe SQL queries and schema definition |
| Database | PostgreSQL (Neon) | Serverless relational database |
| Validation | Zod + drizzle-zod | Runtime request validation derived from DB schema |
| Auth | jsonwebtoken + bcryptjs | JWT session tokens + password hashing |
| Docs | swagger-ui-express | Interactive API documentation (OpenAPI 3.0) |
| Dev | tsc-watch + tsx + drizzle-kit | Hot-reload, script runner, schema management |
| Package Manager | pnpm | Fast, disk-efficient dependency management |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Compile and run with hot-reload (`tsc-watch`) |
| `pnpm drizzle-kit push` | Push schema changes directly to the database |
| `pnpm drizzle-kit generate` | Generate SQL migration files from schema diff |
| `pnpm drizzle-kit migrate` | Apply pending migrations |
| `pnpm drizzle-kit studio` | Open Drizzle Studio (visual database browser) |
| `pnpm tsx src/db/reset.ts` | Drop all tables, enums, and sequences (full DB reset) |

---

## License

ISC

---

<div align="center">
<sub>Built by <a href="https://github.com/ankitkodes">Ankit Kumar</a></sub>
</div>