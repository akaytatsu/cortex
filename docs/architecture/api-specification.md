# API Specification

A "API" do Cortex é definida pelas funções `loaders` (leitura) e `actions` (escrita) do Remix, com o contrato garantido pelo TypeScript.

## Conceptual "Endpoints" (Loaders and Actions)

- **Authentication:** `action` for `/setup`, `/login`, `/logout`.
- **Workspaces:** `loader` to list workspaces from `workspaces.yaml`, `action` to add/remove them.
- **Workspace Files:** `loader` to read file trees and content, `action` to save file content.
- **Workspace Settings:** `loader` and `action` to read/write the `cortex.yaml` file.

## Real-time Communication (WebSockets)

Para funcionalidades interativas como o **Terminal** e o **monitoramento de Tarefas**, usaremos WebSockets para comunicação contínua entre o cliente e o servidor.

---
