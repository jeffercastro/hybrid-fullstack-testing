# Hybrid Full-Stack Testing Framework

![Hybrid Tests](https://github.com/jeffercastro/hybrid-fullstack-testing/actions/workflows/hybrid-tests.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

An advanced **SDET hybrid test automation framework** demonstrating the shift-left pattern: fast state preparation via **API data seeding**, UI mutation and assertion via **Playwright**, and direct database state verification using raw **SQL queries (PostgreSQL)**, running with containerized database services in **GitHub Actions CI/CD**.

---

## The Hybrid Pattern (Why this Architecture?)

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                       SDET Test Runner                      │
 └──────┬───────────────────────┬───────────────────────┬──────┘
        │ 1. Seed (~30ms)       │ 2. Mutate & Assert    │ 3. Direct SQL Verify
        ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │   REST API    │       │ Browser UI    │       │  PostgreSQL   │
 │   Endpoints   │       │ Dashboard     │       │   Database    │
 └───────────────┘       └───────────────┘       └───────────────┘
```

Traditional UI automation suffers from slow execution and test flakiness because tests create complex prerequisite states through slow UI forms. 

This framework solves that problem:
1. **API Data Seeding:** Bypasses UI forms to initialize records and entities directly via HTTP endpoints in milliseconds.
2. **Targeted UI Action:** The browser navigates directly to the target entity page and performs only the specific action under test.
3. **Direct SQL Database Assertion:** Instead of relying solely on the UI displaying text, tests query the PostgreSQL database directly to confirm database-level persistence.
4. **Guaranteed Teardown:** Every test cleans up its own database state after execution, achieving 100% test isolation.

---

## Project Structure

```text
hybrid-fullstack-testing/
├── .github/
│   └── workflows/
│       └── hybrid-tests.yml     # CI/CD with containerized PostgreSQL service
├── app/
│   └── server.ts                # Application backend (REST API + Web Dashboard)
├── src/
│   ├── db/
│   │   ├── db.client.ts         # Direct SQL query client (PostgreSQL / Node)
│   │   └── migrations/
│   │       └── init.sql         # SQL schema definitions
│   ├── api/
│   │   └── seeder.client.ts     # Fast API client for state seeding & teardown
│   ├── pages/
│   │   └── dashboard.page.ts    # Page Object Model for the web dashboard
│   └── data/
│       └── user-factory.ts      # Dynamic test entity factory
├── tests/
│   └── hybrid-flow.spec.ts      # Full-stack hybrid test specs
├── docker-compose.yml           # Local PostgreSQL container service
├── playwright.config.ts         # Playwright config with auto webServer startup
├── package.json
└── tsconfig.json
```

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
# Runs the full hybrid test suite (server boots automatically!)
npm test

# Run with interactive visual Playwright UI
npm run test:ui

# View HTML execution report
npm run test:report
```

### Optional: Run against local PostgreSQL container
```bash
# Start PostgreSQL container
docker compose up -d

# Run tests with real Postgres connection
DATABASE_URL=postgresql://sdet_user:sdet_password@localhost:5432/sdet_test_db npm test
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
