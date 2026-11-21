# Demonstration checklist

## Before the demo

1. Confirm Node.js 24.x and PostgreSQL 18.x.
2. Confirm the API uses the root `.env` and points at a dedicated demo database.
3. Confirm schema and seed data are present: 3 categories and 12 tasks.
4. Start the API and React application from `practice-08` in separate terminals.
5. Open DevTools Network and keep the console visible.

## Variant 8

The selected query filters tasks by all three conditions:

```text
completed=false
priority=high
categoryId=2
```

Initial task IDs should be 4 and 34.

1. Create `Подготовить техническое руководство` with priority high and category Project (2).
2. Show the POST request, 201 response, Location header and server-assigned ID.
3. Show the follow-up GET request and the new task in the list.
4. Mark that task completed.
5. Show the PATCH request and follow-up GET; the task disappears from the active-only filtered list.
6. Open the task by its ID to show that it still exists and completed is true.
7. Delete it and show the 204 response and subsequent 404.

Record the actual generated ID from the API response; it may be higher than 35 if the sequence has already advanced.

## Error handling

- Submit a task with an invalid category directly to the API and show a validation error.
- Set `JSON_BODY_LIMIT_BYTES=1024`, restart the API, and submit a request body larger than 1024 bytes. Show HTTP 413 / PAYLOAD_TOO_LARGE.
- Stop PostgreSQL while the API is running, then show readiness becoming 503. Do not expose the DATABASE_URL in the recording.

## Release endpoints

- `GET /health/live` returns 200 even while the database is unavailable.
- `GET /health/ready` returns 200 when PostgreSQL is available and 503 when it is not.
- Show the request ID header and a single structured JSON request log line.

## Evidence to capture

1. Variant 8 filter and visible task list.
2. Browser Network entries for POST, PATCH, DELETE and follow-up GET.
3. Direct 413 response for a request over the configured body limit.
4. Liveness and readiness responses.
5. `npm run quality` successful terminal output.
6. `npm run test:db` successful terminal output.
7. Docker Compose API and database healthy.
8. Release version and Git tag after the release gate passes.

Do not label expected values as actual results before performing the demo.
