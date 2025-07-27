# Cortex - Fullstack Application

Cortex é uma aplicação fullstack construída com Remix, TypeScript e sistema de armazenamento YAML.

## Estrutura do Projeto

Este é um monorepo organizado com npm workspaces:

```
cortex/
├── apps/web/          # Aplicação Remix principal
├── packages/          # Pacotes compartilhados
└── docs/             # Documentação do projeto
```

## Environment Setup

### Configuração de Variáveis de Ambiente

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Configure as variáveis no arquivo `.env`:**

   - **`NODE_ENV`**: Ambiente de execução
     - `development`: Para desenvolvimento local
     - `production`: Para produção
     - `test`: Para execução de testes

### Exemplo de configuração `.env`:

```bash
# Node.js Environment
NODE_ENV="development"
```

## Desenvolvimento

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o ambiente:**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env conforme necessário
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Constrói a aplicação para produção
- `npm run start` - Executa a aplicação em modo produção
- `npm run lint` - Executa o linter em todo o projeto
- `npm run format` - Formata o código com Prettier
- `npm run test` - Executa os testes

## Tecnologias

- **Framework**: Remix 2.16.8
- **Linguagem**: TypeScript 5.8
- **Runtime**: Node.js 22.x
- **Armazenamento**: Sistema de arquivos YAML
- **Estilização**: Tailwind CSS
- **Testes**: Vitest
- **Linting**: ESLint + Prettier

## Resiliência de Conexão

O sistema implementa um mecanismo robusto de resiliência e reconexão automática para as sessões WebSocket:

### Funcionalidades

- **Detecção Automática de Queda**: Monitora constantemente o status da conexão WebSocket
- **Reconexão Automática**: Tenta reconectar automaticamente quando detecta perda de conexão inesperada
- **Exponential Backoff**: Utiliza intervalos crescentes entre tentativas (3s, 6s, 12s, 24s, 30s)
- **Preservação de Sessão**: Mantém o ID da sessão e histórico durante reconexão
- **Feedback Visual**: Indica o status da conexão na interface (conectado, reconectando, erro)
- **Fila de Mensagens**: Enfileira mensagens durante desconexão e as envia após reconexão
- **Limite de Tentativas**: Para de tentar após 10 tentativas malsucedidas
- **Heartbeat**: Mantém a conexão ativa com mensagens periódicas a cada 15 segundos

### Comportamento

1. **Conexão Estável**: A conexão permanece ativa por pelo menos 1 minuto sem interação
2. **Múltiplas Sessões**: Cada sessão em abas diferentes reconecta independentemente
3. **Apenas Sessões Ativas**: Reconexão só ocorre se houver sessões ativas no momento da queda
4. **Status Visual**: Interface mostra claramente o estado atual da conexão

### Testes

O sistema possui cobertura completa de testes para todos os cenários de resiliência:
- Detecção de queda de conexão
- Reconexão automática
- Estratégia de exponential backoff
- Preservação de sessão
- Falha após máximo de tentativas
- Múltiplas sessões independentes
- Estabilidade de longa duração

Para executar os testes de resiliência:
```bash
npm test -- useMultipleClaudeCodeSessions.resilience.test.ts
```