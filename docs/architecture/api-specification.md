# API Specification

A "API" do Cortex é definida pelas funções `loaders` (leitura) e `actions` (escrita) do Remix, com o contrato garantido pelo TypeScript.

## Conceptual "Endpoints" (Loaders and Actions)

- **Authentication:** `action` for `/setup`, `/login`, `/logout`.
- **Workspaces:** `loader` to list workspaces from `workspaces.yaml`, `action` to add/remove them.
- **Workspace Files:** `loader` to read file trees and content, `action` to save file content.
- **Workspace Settings:** `loader` and `action` to read/write the `cortex.yaml` file.

## Real-time Communication (WebSockets)

Para funcionalidades interativas como o **Terminal** e o **monitoramento de Tarefas**, usaremos WebSockets para comunicação contínua entre o cliente e o servidor.

### Terminal WebSocket Implementation **[IMPLEMENTADO]**
- **Endpoint:** `/ws/terminal` para comunicação real-time
- **Protocolo:** WebSocket com mensagens tipadas para input/output/error/exit
- **Servidor:** WebSocket server rodando na porta 8000 (desenvolvimento)
- **Backend:** `node-pty` para pseudoterminal adequado em ambiente Linux
- **Autenticação:** Validação de sessão via SessionService
- **Segurança:** Workspace path validation para isolamento de processos

#### Tipos de Mensagem
```typescript
interface TerminalMessage {
  type: 'input' | 'output' | 'error' | 'exit';
  data: string;
  sessionId: string;
}
```

---
