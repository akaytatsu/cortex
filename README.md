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