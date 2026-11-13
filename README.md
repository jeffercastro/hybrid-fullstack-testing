# Hybrid Full-Stack Testing Framework

![Hybrid Tests](https://github.com/jeffercastro/hybrid-fullstack-testing/actions/workflows/hybrid-tests.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

An advanced **SDET hybrid test automation framework** demonstrating the shift-left pattern: fast state preparation via **API data seeding**, UI mutation and assertion via **Playwright**, direct database state verification using raw **SQL queries (PostgreSQL)**, **database transaction rollbacks**, and **network chaos mocking** (`page.route()`), backed by containerized database services in **GitHub Actions CI/CD**.

---

## The Hybrid Pattern (Why this Architecture?)

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                              SDET Test Runner                               │
 └──────┬───────────────────────┬───────────────────────┬──────────────────────┤
        │ 1. Seed (~30ms)       │ 2. Mutate & Assert    │ 3. Direct SQL Verify │ 4. Atomic Rollback
        ▼                       ▼                       ▼                      ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐      ┌───────────────┐
 │   REST API    │       │ Browser UI    │       │  PostgreSQL   │      │ SQL Engine    │
 │   Endpoints   │       │ Dashboard     │       │   Database    │      │ ROLLBACK;     │
 └───────────────┘       └───────────────┘       └───────────────┘      └───────────────┘
```

Traditional UI automation suffers from slow execution and test flakiness because tests create complex prerequisite states through slow UI forms. 

This framework solves that problem:
1. **API Data Seeding:** Bypasses UI forms to initialize records and entities directly via HTTP endpoints in milliseconds.
2. **Targeted UI Action:** The browser navigates directly to the target entity page and performs only the specific action under test.
3. **Direct SQL Database Assertion:** Instead of relying solely on UI text, tests query the PostgreSQL database directly to confirm database-level persistence on disk.
4. **Database Transactions & Rollback:** Uses active SQL transactions (`BEGIN` -> `ROLLBACK;`) to instantly revert all test mutations at the database engine level, eliminating database pollution.
5. **Network Chaos & Error Mocking (`page.route()`):** Simulates backend `500 Internal Server Errors`, network disconnections, and artificial latency to verify UI resilience and graceful error handling.

---

## Project Structure

```text
hybrid-fullstack-testing/
├── .github/
│   └── workflows/
│       └── hybrid-tests.yml          # CI/CD with containerized PostgreSQL service
├── app/
│   └── server.ts                     # Application backend (REST API + UI Dashboard)
├── src/
│   ├── db/
│   │   ├── db.client.ts              # SQL query client with BEGIN/ROLLBACK support
│   │   └── migrations/
│   │       └── init.sql              # SQL schema definitions
│   ├── api/
│   │   └── seeder.client.ts          # Fast API client for state seeding & teardown
│   ├── pages/
│   │   └── dashboard.page.ts         # Page Object Model covering UI & error banners
│   └── data/
│       └── user-factory.ts           # Dynamic test entity factory
├── tests/
│   ├── hybrid-flow.spec.ts           # Full-stack hybrid test specs (API + UI + SQL DB)
│   ├── transaction-rollback.spec.ts  # Database transaction & atomic rollback tests
│   └── network-mocking.spec.ts       # Chaos testing with page.route() (500s, drops, latency)
├── docker-compose.yml                # Local PostgreSQL container service
├── playwright.config.ts              # Playwright config with auto webServer startup
├── package.json
└── tsconfig.json
```

---

## Test Suites Overview

### 1. Hybrid E2E Flow (`tests/hybrid-flow.spec.ts`)
* **State Seeding:** Seeds an account with balance via `POST /api/accounts` in ~30ms.
* **UI Action:** Navigates directly to entity dashboard and toggles status or deposits funds.
* **SQL Verification:** Runs direct `SELECT balance, status FROM accounts WHERE id = $1` queries.
* **Teardown Verification:** Confirms record eradication from disk after teardown.

### 2. Transaction Rollback Pattern (`tests/transaction-rollback.spec.ts`)
* Wraps the test inside `beginTransaction()`.
* Creates records and performs mutations.
* Executes `rollback()`.
* Proves that the database automatically reverted 100% of state changes without needing manual `DELETE` statements.

### 3. Network Chaos & Mocking (`tests/network-mocking.spec.ts`)
* **500 Server Error:** Intercepts API calls with `route.fulfill({ status: 500 })` to ensure the UI catches errors and displays user-friendly error banners.
* **Network Drop:** Uses `route.abort('failed')` to simulate an offline user or dropped connection.
* **Latency Simulation:** Injects 800ms delay to verify loading spinner states.

---

## Quickstart

### Prerequisites
- Node.js v18+
- Docker & Docker Compose (optional for local PostgreSQL; in-memory fallback works automatically)

### Installation
```bash
git clone https://github.com/jeffercastro/hybrid-fullstack-testing.git
cd hybrid-fullstack-testing
npm install
```

### Run Tests Locally
```bash
# Runs the full test suite (server boots automatically!)
npm test

# Run with interactive visual Playwright UI
npm run test:ui

# View HTML execution report
npm run test:report
```

---

## CI/CD Pipeline

The GitHub Actions workflow spins up an isolated **PostgreSQL 16 Docker container service** on Ubuntu runners for every push and PR:
- Runs database health checks (`pg_isready`).
- Executes the hybrid test suite against the live container.
- Uploads Playwright HTML reports as downloadable artifacts (retained 14 days).

---

## Author

- **Jeffer Castro** — [GitHub](https://github.com/jeffercastro)
