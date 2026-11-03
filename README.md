# AgriTrack

AgriTrack is a DBMS Level 3 mini-project for agricultural farm operations and produce distribution. It combines a MySQL relational database for users, farms, crops, harvests, inventory and orders with MongoDB activity logs whose inspection metadata can vary by event.

## Project scope

The prototype supports role-based sign-in, farm and crop records, harvest records, inventory visibility, distributor orders, delivery records, and flexible activity logs. Supplier data is included as a relational master table. The prototype does not implement supplier procurement, payment processing, GPS tracking, or a vector search feature.

## Technology choices

- **Next.js 14 and React 18** provide the web interface and server-side API routes in one application.
- **MySQL 8.0.16 or later** stores structured records and applies foreign keys, checks, unique constraints, a view, transactions, a stored procedure, a function, and triggers.
- **MongoDB** stores activity and inspection documents with flexible metadata. It is used for document CRUD; the project does not claim a vector database implementation.
- **mysql2** and the **MongoDB Node.js driver** connect the API and demonstration scripts to the databases.
- **bcryptjs**, signed JSON Web Tokens, and HTTP-only cookies protect demo credentials and sessions.

## Requirements

- Node.js 20 LTS or later and npm
- MySQL 8.0.16 or later
- A MongoDB Atlas URI or a local MongoDB server
- Git

## Setup

1. Create a fresh MySQL database by running `database/schema.sql` in MySQL Workbench or the MySQL command-line client.
2. Run `database/advanced.sql` to create the triggers, `sp_create_order`, and `fn_farm_harvest_total`.
3. Copy `.env.example` to `.env.local` and enter local database credentials, a MongoDB URI, and a random `JWT_SECRET` with at least 32 characters. Do not commit `.env.local`.
4. From this directory, install packages and seed the demo data:

   ```powershell
   npm install
   npm run db:seed
   npm run mongo:setup
   ```

5. Start the app:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`.

The schema script uses `CREATE TABLE IF NOT EXISTS` and will not erase existing tables. For a new setup, use a fresh database so the schema matches the project files. The seed script creates demo records and resets the sample inventory quantities to their demo values when rerun.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@agritrack.local` | `Admin@123` |
| Farmer | `farmer@agritrack.local` | `Farmer@123` |
| Distributor | `buyer@agritrack.local` | `Buyer@123` |

These accounts and passwords are for a local academic demonstration. Change or remove them before any deployment reachable by other users.

## MongoDB setup and RUD demo

`npm run mongo:setup` creates the `agritrack_nosql.farm_activity_logs` collection, applies a JSON Schema validator, and creates indexes for actor history and event type. The database is created by MongoDB when the collection is created.

`npm run mongo:demo` inserts one inspection record, reads it, updates its description and metadata, deletes it, and reads again to show it is gone. The application Activity Logs view reads activity records; signed-in users can add a log, and admins can edit or delete logs.

## SQL demonstrations

Run `database/queries.sql` after schema creation, advanced SQL, and seeding. It includes INSERT, UPDATE, DELETE, joins, a nested query, a correlated query, a recursive CTE, an aggregate CTE, a function call, a view query, and a transaction example. The order procedure locks the chosen inventory row, validates stock, creates an order and delivery, and reduces stock through a trigger in the same transaction.

`database/rbac.sql` is an optional example of separate MySQL accounts with narrower grants. Replace its example passwords before use. The running application enforces role and farmer-ownership checks in its API; MySQL triggers additionally restrict farm owners and order buyers by role.

## Project map

```text
agritrack/
├── app/                 Next.js interface and API routes
│   └── api/             Authentication, farms, crops, harvests, stock, orders, logs
├── database/            MySQL schema, advanced SQL, query and access-control examples
├── docs/                Report, synopsis, ER model, and relational schema diagrams
├── lib/                 Database connections, sessions, and API error helpers
├── mongodb/             MongoDB collection setup and CRUD demonstration
├── scripts/             MySQL sample-data seeder
└── tests/               Manual test checklist
```

## Project report

The completed DBMS report, including the ER model, relational schema, SQL and MongoDB appendices, and rubric status, is available at [`docs/AgriTrack_Project_Report.pdf`](docs/AgriTrack_Project_Report.pdf).

## Validation before submission

The source package includes a manual test checklist in `tests/manual_test_cases.md`. Run it after configuring MySQL and MongoDB, and capture genuine screenshots from the local application for the Results section of the report. Database services and credentials are machine-specific; this package does not include `.env.local` or claim a live integration run.

## GitHub

This project is published at [AgriTrack on GitHub](https://github.com/narayan1345/AgriTrack-Agricultural-Supply-Chain-and-Farm-Management-System). Keep `.env.local`, database passwords, tokens, and any live credentials out of the repository.
