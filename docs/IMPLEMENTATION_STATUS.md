# AgriTrack implementation status

## Included in this deliverable

- Next.js interface and API routes for sign-in, farms, crops, harvests, inventory, orders, and activity logs.
- MySQL schema with 11 relations, keys, checks, generated line totals, and an available-inventory view.
- Advanced SQL for role and relationship triggers, stock-safe order creation, a farm-harvest function, and query demonstrations.
- MongoDB collection setup with schema validation and indexes, plus a Create/Read/Update/Delete demonstration.
- Repeatable MySQL sample data and demo accounts.
- ER and relational schema diagrams, a manual test checklist, README, synopsis, and completed report files.

## Environment-dependent validation

The project requires a local MySQL server, a configured MongoDB URI, and a private `.env.local` file. The manual checklist is included at `tests/manual_test_cases.md`; database and browser execution must be recorded after the project is configured in the target environment. No live database results or application screenshots are claimed by this package.

## Submission notes

- Keep `.env.local` and all database or service credentials out of version control.
- Demo passwords are intended for local academic use only.
- The report identifies the prototype scope and reports runtime validation status accurately.
