# Source Tree

```plaintext
cortex/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── components/ # Componentes React
│       │   ├── lib/        # Utilitários, cliente Prisma
│       │   ├── routes/     # Rotas, Loaders, Actions
│       │   ├── services/   # Lógica de negócio do Backend
│       │   └── styles/     # CSS Global, Tailwind
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
