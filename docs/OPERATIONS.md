# Operations runbook

## Prerequisites

- Node.js 24.x for local development.
- PostgreSQL 18.x, or Docker Engine with the Compose plugin.
- A dedicated application role and database. Do not use a personal superuser account for the application.

## Local setup

1. Create a UTF-8 database and least-privilege login role.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` locally. Never commit .env.
4. For a new empty database, run `npm run prepare:db`. This creates the schema and inserts the seed data. Do not run it over an existing populated database.
5. Run `npm ci` and `npm start`.

The service binds to `API_HOST:API_PORT`. It does not start listening until the initial database ping succeeds.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| API_HOST | 127.0.0.1 | Bind address. Use 0.0.0.0 in a container. |
| API_PORT | 5505 | HTTP port, range 1024–65535. |
| NODE_ENV | development | development, test or production. |
| LOG_LEVEL | info | debug, info, warn or error. |
| RELEASE_VERSION | 1.0.0 | Semantic version included in readiness output. |
| DATABASE_URL | required | PostgreSQL connection string. Keep secret. |
| ENABLE_DEBUG_RESET | false | Local-only seed reset; forbidden in production. |
| JSON_BODY_LIMIT_BYTES | 16384 | Maximum raw JSON request size; range 1024–1048576. |
| POSTGRES_PASSWORD | compose only | Password used by Docker Compose. |

### Variant 8: request body limit

Set `JSON_BODY_LIMIT_BYTES` to the maximum allowed JSON body size in bytes. A request over this limit receives HTTP 413 with code `PAYLOAD_TOO_LARGE`. The default is 16 KiB. The value is validated at startup and must be between 1 KiB and 1 MiB. Keep a limit appropriate to the API's task payloads; do not remove it to work around a client error.

## Health checks

- `GET /health/live` checks that the process responds. It does not query PostgreSQL.
- `GET /health/ready` executes the database ping. Returns 200 only while the DB is reachable; otherwise 503.
- `GET /api/health` preserves the application API health contract.

Configure load balancers to use readiness for traffic routing and liveness for process supervision. Readiness failures do not reveal the connection string or driver error.

## Logging

Each request gets an `X-Request-Id` and one JSON log line on response finish. The line includes timestamp, level, event, method, path, status code and duration. Query strings are omitted to avoid accidental logging of search text or secrets.

Sensitive keys such as password, authorization, cookie, token, connectionString and DATABASE_URL are redacted. Logs go to stdout/stderr so Docker and the process manager can collect them. Avoid adding request bodies or connection strings to logs.

## Shutdown

On SIGINT or SIGTERM the process stops accepting new connections, waits for the HTTP server to close, then closes the PostgreSQL pool. Shutdown is idempotent and has a configurable internal timeout. A pool connection acquired by a transaction must always be released in finally.

For local development stop with Ctrl+C. For containers use `docker compose down` and allow the container grace period to elapse.

## Docker Compose

1. Copy .env.example to .env.
2. Set a non-placeholder POSTGRES_PASSWORD.
3. Run `docker compose up --build -d`.
4. Wait until both db and api report healthy.
5. Check `curl http://127.0.0.1:5505/health/ready`.
6. View logs with `docker compose logs -f api`.
7. Stop with `docker compose down`.

Database files are stored in the named volume `postgres_data`. `docker compose down -v` deletes that volume and all database data; do not use it unless a destructive reset is explicitly intended.

## Backup and restore

Create a logical backup:

```bash
pg_dump --format=custom --no-owner --file=tip_tasks.dump "$DATABASE_URL"
```

Restore into an empty compatible database:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" tip_tasks.dump
```

PowerShell users should quote the connection URL and may use the Windows PostgreSQL bin directory for pg_dump/pg_restore. Never put a real password in shell history or screenshots.

## Database changes

SQL schema and seed scripts are in `sql/`. For a new database, apply schema then seed through `npm run prepare:db`. For an existing database, back it up first and use a forward-only migration. Do not rerun seed blindly: it uses explicit IDs and is designed for an empty database.

## Troubleshooting

| Symptom | Check |
|---|---|
| API does not start | DATABASE_URL, server reachability, credentials and PostgreSQL service. |
| Readiness is 503 | Check PostgreSQL status and API logs; do not expose connection details. |
| HTTP 413 | Check JSON_BODY_LIMIT_BYTES and request payload size. |
| HTTP 415 | Send Content-Type: application/json for POST/PATCH. |
| Port already in use | Change API_PORT and compose port mapping consistently. |
| DB test changes data | Run it only against a dedicated disposable test database. |
| Container restarts | Inspect `docker compose logs api db` and both health statuses. |
