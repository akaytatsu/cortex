# Coding Standards

These are mandatory rules for AI agent implementation.

## Core Standards

- **Language/Runtime:** TypeScript `5.8`, Node.js `22.x`.
- **Style/Linting:** ESLint and Prettier configured at the monorepo root.
- **Test Files:** Use the `*.test.tsx` or `*.test.ts` naming convention.

## Critical Rules

1.  **Shared Types:** All shared types must be defined in and imported from `packages/shared-types`.
2.  **Service Layer:** All backend business logic must be in the `apps/web/app/services/` directory. `loaders` and `actions` should only call these services.
3.  **Environment Variables:** Access environment variables only through a central, typed config module.
4.  **File System:** All file system interactions must go through the `FileSystemService`.
5.  **Error Handling:** Use custom error classes when throwing exceptions in services.
6.  **Remix Fetcher:** NEVER add `fetcher` or `fetcher.load` to useEffect dependencies. The Remix fetcher object is stable and including it causes infinite re-render loops.

## Naming Conventions

| Element          | Convention               | Example           |
| :--------------- | :----------------------- | :---------------- |
| React Components | `PascalCase`             | `FileBrowser.tsx` |
| React Hooks      | `camelCase` (use prefix) | `useWorkspace.ts` |
| Backend Services | `camelCase`              | `authService.ts`  |

---
