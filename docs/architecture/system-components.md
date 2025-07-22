# System Components

## Backend Services
- **`AuthService` (Backend):** Manages user logic and interacts with Prisma.
- **`ConfigService` (Backend):** Reads and writes YAML configuration files.
- **`FileSystemService` (Backend):** Interacts with the server's file system for workspace files.
- **`CliService` (Backend):** Manages the execution of external command-line tools.
- **`TerminalService` (Backend):** **[IMPLEMENTADO]** Manages interactive terminal sessions using node-pty with workspace path validation and security boundaries.
- **`WebSocketService` (Backend):** **[IMPLEMENTADO]** Manages real-time communication for terminal I/O streaming.

## Frontend Components
- **`CortexUI` (Frontend):** The main React application rendered by Remix.
- **`Terminal` (Frontend):** **[IMPLEMENTADO]** Interactive web terminal component using @xterm/xterm with WebSocket communication for real-time command execution.

---
