# Cortex Web Application

Uma aplicação web full-stack construída com Remix, agora com sistema de autenticação baseado em YAML.

## 🚀 Características

- **Autenticação YAML**: Sistema de usuários baseado em arquivos YAML (sem banco de dados)
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Validação de Senhas**: Regras configuráveis para força de senhas
- **File Watching**: Recarregamento automático de configurações de usuário
- **Backup Automático**: Backup automático antes de modificações no arquivo de usuários

## ⚙️ Configuração

### Primeiro Setup

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar ambiente:**
   ```bash
   cp .env.example .env
   # Sistema usa autenticação YAML por padrão
   ```

3. **Executar aplicação:**
   ```bash
   npm run dev
   ```

4. **Acessar setup inicial:**
   - Acesse `http://localhost:3000/setup`
   - Crie o primeiro usuário administrativo

### Estrutura de Arquivos

```
config/
├── users.yaml          # Arquivo principal de usuários (criado automaticamente)
├── users.yaml.example  # Exemplo da estrutura
└── workspaces.yaml     # Configuração de workspaces
```

## 👥 Gerenciamento de Usuários

### Arquivo de Usuários (config/users.yaml)

```yaml
users:
  - id: "user_01ABCDEF123456789"
    email: "admin@domain.com"
    password_hash: "$2b$12$..."
    role: "admin"
    created_at: "2025-01-15T10:30:00Z"
    updated_at: "2025-01-15T10:30:00Z"
    last_login: "2025-01-20T14:22:00Z"
    active: true

config:
  salt_rounds: 12
  password_min_length: 8
  require_special_chars: true
  session_timeout: 3600
  max_login_attempts: 5
  lockout_duration: 900
```

### Segurança

- **Permissões de Arquivo**: O arquivo `users.yaml` deve ter permissões 600 (rw-------)
- **Criptografia**: Senhas são criptografadas com bcrypt (12 salt rounds por padrão)
- **Backup**: Backups automáticos são criados antes de cada modificação
- **Validação**: Schema Zod valida a estrutura do arquivo YAML

## 🛠️ Development

### Scripts Disponíveis

```bash
npm run dev        # Executar em modo desenvolvimento
npm run build      # Build para produção
npm run start      # Executar build de produção
npm run test       # Executar testes
npm run typecheck  # Verificação de tipos TypeScript
npm run lint       # Linting com ESLint
```

### Testes

O sistema de testes foi adaptado para funcionar com o backend YAML:

```bash
npm run test       # Executar todos os testes
npm run test:watch # Executar testes em modo watch
```

Os testes utilizam um arquivo `config/users-test.yaml` separado para isolamento.

## 🔧 Configuração de Produção

### Variáveis de Ambiente

```env
NODE_ENV=production
YAML_USERS_FILE=config/users.yaml
SESSION_SECRET=your-session-secret
```

### Deploy

1. **Build da aplicação:**
   ```bash
   npm run build
   ```

2. **Configurar permissões:**
   ```bash
   chmod 600 config/users.yaml
   ```

3. **Executar:**
   ```bash
   npm start
   ```

## 📋 Migração do Prisma

A aplicação foi migrada do Prisma/SQLite para o sistema YAML. O script de migração não está mais disponível pois a migração foi concluída.

### Vantagens do Sistema YAML

- ✅ **Simplicidade**: Sem dependências de banco de dados
- ✅ **Portabilidade**: Fácil backup e migração entre ambientes
- ✅ **Transparência**: Arquivo legível e editável (com cuidado)
- ✅ **Performance**: Cache em memória com file watching
- ✅ **Segurança**: Validation, backup automático e file locking

## 🔍 Troubleshooting

### Problemas Comuns

**Erro de permissões no arquivo users.yaml:**
```bash
chmod 600 config/users.yaml
chown $USER:$USER config/users.yaml
```

**Arquivo corrompido:**
- Os backups ficam em `config/users.yaml.backup.*`
- Restaure o backup mais recente válido

**Usuário bloqueado:**
- Edite `config/users.yaml` e remova/ajuste `last_login_attempt`
- Ou aguarde o `lockout_duration` configurado

## 📚 Documentação Adicional

- [Remix Documentation](https://remix.run/docs)
- [Estrutura do Projeto](./docs/architecture.md)
- [API Reference](./docs/api.md)