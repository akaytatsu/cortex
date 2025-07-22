# Source Tree

```plaintext
cortex/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── components/    # Componentes React
│       │   │   └── Terminal.tsx # [IMPLEMENTADO] Terminal web interativo
│       │   ├── lib/           # Utilitários, cliente Prisma  
│       │   │   └── websocket-server.ts # [IMPLEMENTADO] Servidor WebSocket
│       │   ├── routes/        # Rotas, Loaders, Actions
│       │   │   └── api.terminal-port.ts # [IMPLEMENTADO] API endpoint para porta do terminal
│       │   ├── services/      # Lógica de negócio do Backend
│       │   │   └── terminal.service.ts # [IMPLEMENTADO] Gerenciamento de sessões de terminal
│       │   └── styles/        # CSS Global, Tailwind
│       ├── prisma/
│       └── ...
├── config/
│   └── workspaces.yaml
├── packages/
│   ├── shared-types/    # Interfaces TypeScript (User, Workspace, etc.)
│   └── ui/              # Componentes de UI reutilizáveis
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json         # Raiz do Monorepo com workspaces
```

---
