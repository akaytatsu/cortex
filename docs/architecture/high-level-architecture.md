# High Level Architecture

## Technical Summary

A arquitetura do Cortex será um **monolito full-stack coeso**, contido em um **monorepo** para simplificar o desenvolvimento e o deploy. Utilizaremos o **Remix** para gerenciar tanto o frontend quanto o backend em uma única aplicação Node.js. O backend terá acesso direto ao sistema de arquivos do servidor para executar as operações de workspace, terminal e a integração com CLIs externas (como Claude Code e Git). A interface do usuário (UI) será renderizada no servidor (SSR) para máxima performance, seguindo uma abordagem **mobile-first** com Tailwind CSS e shadcn/ui. Toda a solução será empacotada com **Docker** para garantir a portabilidade e o requisito de ser **auto-hospedável (self-hostable)**.

## Platform and Infrastructure

Considerando o requisito fundamental de ser auto-hospedável (`self-hostable`), a melhor abordagem é utilizar **Docker**.

- **Plataforma:** Servidor Linux com Docker.
- **Serviços Chave:**
  - **Aplicação Cortex:** Um único contêiner Docker contendo a aplicação Remix.
  - **Proxy Reverso:** Um contêiner com Nginx ou Caddy para gerenciar o tráfego de entrada e certificados SSL.
- **Hospedagem de Deploy:** Qualquer provedor de VPS (ex: DigitalOcean, Vultr, AWS EC2) ou servidor on-premise.

## Repository Structure

Conforme definido no PRD, utilizaremos um **Monorepo**.

- **Estrutura:** Monorepo.
- **Gerenciamento:** `npm workspaces`.
- **Organização dos Pacotes:**
  - `apps/cortex-web`: A aplicação principal do Remix.
  - `packages/ui`: Componentes React compartilhados.
  - `packages/shared-types`: Interfaces TypeScript compartilhadas.

## High Level Architecture Diagram

Este diagrama ilustra a interação entre os principais componentes do sistema.

```mermaid
graph TD
    subgraph "Usuário"
        A[Developer]
    end

    subgraph "Infraestrutura do Servidor"
        C[Proxy Reverso<br/>(Nginx)]

        subgraph Cortex Docker Container
            D[Servidor Remix<br/>(Backend & Frontend Logic)]
            E[Banco de Dados<br/>(SQLite via Prisma)]
            F[Sistema de Arquivos<br/>(Workspaces do Usuário)]
            G[Processos Externos<br/>(Git, Claude Code, Terminal)]
        end
    end

    A --> B[Navegador Web];
    B --> C;
    C --> D;
    D <--> E;
    D <--> F;
    D <--> G;

```

## Architectural and Design Patterns

- **Aplicação Full-Stack Monolítica:** O frontend e o backend coexistirão na mesma base de código Remix.
- **Arquitetura Baseada em Componentes (Frontend):** A UI será construída com componentes reutilizáveis e bem definidos.
- **Camada de Serviço (Backend):** A lógica de negócio complexa será abstraída em "serviços" (módulos TypeScript).
- **Padrão de Repositório (Backend):** O acesso ao banco de dados será abstraído usando o Prisma.
- **Execução de Processos Externos (`Child Process`):** A interação com ferramentas CLI será feita através do módulo `child_process` do Node.js.

---
