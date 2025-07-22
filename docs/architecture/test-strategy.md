# Test Strategy

## Philosophy

- **MVP Focus:** A robust suite of unit and integration tests.
- **E2E (Post-MVP):** End-to-end tests will be added after the MVP is stable.
- **Coverage:** Aim for \>80% coverage on critical business logic.

## Test Types and Tools

1.  **Unit Tests (`Vitest`):** For isolated testing of services, components, and utility functions.
2.  **Integration Tests (`Vitest`):** For testing the full flow of Remix routes (`loader`/`action` -\> service -\> test database).

## Test Data Management

- A Prisma seed script will be used to populate a test database, ensuring consistent test runs.
