# Error Handling Strategy

- **Approach:** Use custom error classes (`ValidationError`, `AuthenticationError`). Detailed server-side errors will be logged, and safe, generic error messages will be sent to the client.
- **Backend:** Logic in `actions/loaders` will be wrapped in `try...catch` blocks.
- **Frontend:** Use React Error Boundaries for rendering errors and display "toasts" for API errors.
- **Logging:** Use a structured JSON logger like `Pino` on the backend, avoiding any sensitive data.

---
