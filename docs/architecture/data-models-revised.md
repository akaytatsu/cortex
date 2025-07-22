# Data Models (Revised)

A persistência de dados será dividida: o banco de dados para autenticação e arquivos de configuração YAML para as definições de ambiente.

## 1\. In the Database (Managed by Prisma)

**User**
Este será o **único** modelo no nosso banco de dados SQLite.

- **Purpose:** Manage accounts and access credentials for the Cortex platform.
- **TypeScript Interface:**
  ```typescript
  export interface User {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

## 2\. In Configuration Files (Managed by File Services)

**a) `workspaces.yaml` (Global Configuration File)**

- **Purpose:** List all workspaces (projects) that have been added to the IDE.
- **Location:** `/<cortex_root>/config/workspaces.yaml`.
- **File Structure:**
  ```yaml
  workspaces:
    - name: "API de Pagamentos"
      path: "/home/user/dev/payment-api"
    - name: "Website Institucional"
      path: "/home/user/dev/corp-website"
  ```
- **Corresponding TypeScript Interface:**
  ```typescript
  export interface Workspace {
    name: string;
    path: string;
  }
  ```

**b) `cortex.yaml` (Per-Workspace Configuration File)**

- **Purpose:** Store `SavedCommands` and `Workflows` specific to that project.
- **Location:** `/<workspace_path>/cortex.yaml`.
- **File Structure:**

  ```yaml
  savedCommands:
    - name: "Rodar testes de unidade"
      command: "npm run test:unit"

  workflows:
    - name: "Analisar e Refatorar Componente"
      steps:
        - name: "Explicar o código"
          command: "claude-code --explain ./src/components/Button.tsx"
  ```

- **Corresponding TypeScript Interfaces:**

  ```typescript
  export interface SavedCommand {
    name: string;
    command: string;
  }

  export interface WorkflowStep {
    name: string;
    command: string;
  }

  export interface Workflow {
    name: string;
    steps: WorkflowStep[];
  }
  ```

## 3\. In-Memory Models (Runtime State Management) **[IMPLEMENTADO]**

**Terminal Session Models**
Essas interfaces gerenciam o estado das sessões de terminal em tempo de execução.

```typescript
// Terminal Session Management - [IMPLEMENTADO]
export interface TerminalSession {
  id: string;
  workspaceName: string;
  workspacePath: string;
  userId: string;
  pid?: number;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: Date;
}

// WebSocket Message Protocol - [IMPLEMENTADO]
export interface TerminalMessage {
  type: 'input' | 'output' | 'error' | 'exit';
  data: string;
  sessionId: string;
}
```

---
