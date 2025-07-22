# Cortex Product Requirements Document (PRD)

| Date       | Version | Description                                                                         | Author    |
| :--------- | :------ | :---------------------------------------------------------------------------------- | :-------- |
| 2025-07-21 | 1.0     | Documento inicial criado a partir do Project Brief e detalhado de forma interativa. | John (PM) |

## 1. Goals and Background Context

### Goals

- Lançar um MVP focado na experiência de codificação via IA em 4 meses.
- Obter feedback qualitativo de 10-20 desenvolvedores no primeiro mês após o lançamento.
- Reduzir em 70% o tempo de codificação para os usuários, transformando o desenvolvedor em um "gestor da IA".
- Permitir que um novo usuário gere e teste código funcional em menos de 15 minutos.

### Background Context

O desenvolvimento de software moderno permanece fragmentado, forçando os desenvolvedores a gerenciar um ecossistema complexo de ferramentas e configurações que desviam o foco da criação de valor. As IDEs atuais, mesmo as baseadas na web, falham por não serem otimizadas para dispositivos móveis, o que restringe a produtividade e a flexibilidade.

O Cortex resolve esse problema ao propor uma IDE 100% web e responsiva, com a IA no centro da experiência. O objetivo é fornecer um ambiente de desenvolvimento unificado e acessível de qualquer lugar, simplificando o fluxo de trabalho e permitindo que o desenvolvimento assistido por IA seja eficaz até mesmo em um celular.

## 2. Requirements

### Functional (FR)

1.  **FR1:** O sistema deve fornecer um ambiente de desenvolvimento web completo, incluindo gerenciamento de workspaces, navegador de arquivos, editor de código e múltiplas instâncias de terminal.
2.  **FR2:** A IDE deve integrar-se com a CLI do Claude Code para assistência ao desenvolvimento.
3.  **FR3:** O sistema deve incluir funcionalidades Git essenciais (commit, push, pull), com a capacidade de gerar mensagens de commit otimizadas por IA.
4.  **FR4:** A plataforma deve permitir o cadastro e a execução de comandos complexos (Orquestração de Tarefas V1), com monitoramento do progresso em tempo real.
5.  **FR5:** Deve haver um painel de produtividade que permita aos usuários salvar e executar comandos de terminal frequentes com um clique.
6.  **FR6:** O sistema deve oferecer gerenciamento de ambiente dinâmico (V1), permitindo criar rotas de teste via Nginx/Apache.
7.  **FR7:** A plataforma deve incluir uma "Loja de Templates" com 2 a 3 templates iniciais para acelerar o início de novos projetos.
8.  **FR8:** O sistema deve ter um mecanismo de segurança e login para proteger os workspaces dos usuários.

### Non Functional (NFR)

1.  **NFR1:** A plataforma deve ser 100% baseada na web e totalmente responsiva, com uma experiência de usuário mobile-first.
2.  **NFR2:** A solução deve ser auto-hospedável (self-hostable) para garantir a portabilidade e o controle do usuário.
3.  **NFR3:** A stack de tecnologia para a versão inicial deve ser Node.js (LTS), Remix como framework full-stack e SQLite como banco de dados.
4.  **NFR4:** A arquitetura do projeto deve ser um monorepo/monolítico para facilitar o gerenciamento do ambiente integrado.
5.  **NFR5:** A experiência do novo usuário deve permitir a geração e teste de código funcional em menos de 15 minutos.
6.  **NFR6:** A interface do usuário deve ser performática em ambientes web, mesmo ao lidar com operações de terminal e edição de código.
7.  **NFR7:** A arquitetura de integração com a IA deve ser aberta, permitindo futuras substituições ou adições de outros modelos além do Claude Code.
8.  **NFR8:** A arquitetura de integração com CLIs de IA deve ser modular para permitir a adição futura de outras ferramentas.

## 3. User Interface Design Goals

- **Overall UX Vision:** A experiência será fluida, intuitiva e poderosa em desktops e dispositivos móveis, com foco em velocidade, clareza e uma estética limpa (tema escuro padrão) para permitir que os desenvolvedores gerenciem a IA com eficiência.
- **Key Interaction Paradigms:**
  - **Desktop:** Um layout multi-painel flexível e familiar (Arquivos/Ferramentas à esquerda, Editor no centro, Terminal na parte inferior). O painel direito (Assistente de IA) será configurável, podendo ser minimizado ou movido como uma aba no painel inferior para maximizar o espaço para o código.
  - **Mobile:** Uma abordagem "Focus View" de painel único, com uma barra de navegação inferior para alternar rapidamente entre os contextos principais: **Editor, Arquivos, Assistente de IA, Terminal e Ferramentas** (agrupando Git, Orquestração, etc.).
- **Accessibility:** O MVP terá como meta o padrão **WCAG 2.1 Nível AA**.
- **Target Device and Platforms:** Web Responsivo, com abordagem "mobile-first".

## 4. Technical Assumptions

### Repository Structure: Monorepo

- Para um projeto "único e integrado" como o Cortex, um monorepo é a abordagem mais moderna e eficiente. Ele manterá todo o código (frontend, backend, scripts compartilhados) em um único repositório, facilitando a gestão de dependências e a consistência do código.

### Service Architecture

- **Arquitetura Monolítica:** Conforme o brief, a aplicação será um "projeto único e integrado". Um monolítico coeso, construído com Remix, é a implementação direta dessa visão, simplificando o desenvolvimento e o deploy para o MVP.

### Testing Requirements

- **Testes de Unidade + Integração:** A recomendação para o MVP é focar em testes de unidade para a lógica de negócio isolada e testes de integração para as partes críticas que interagem entre si.

### Additional Technical Assumptions and Requests

- **Linguagem/Runtime:** Node.js (versão LTS mais recente).
- **Framework Full-stack:** Remix.
- **Banco de Dados:** SQLite (para a versão inicial open-source, garantindo portabilidade).
- **Portabilidade:** A arquitetura deve priorizar a portabilidade para facilitar a auto-hospedagem.

## 5. Epic List

1.  **Epic 1: Project Foundation & Setup**
    - **Meta:** Estabelecer a estrutura completa do monorepo e todas as configurações necessárias para garantir uma base de desenvolvimento estável.
2.  **Epic 2: User Authentication**
    - **Meta:** Implementar um sistema de autenticação de usuário seguro e completo, controlando o acesso à plataforma.
3.  **Epic 3: Core IDE Experience**
    - **Meta:** Entregar a interface principal e funcional da IDE, incluindo o navegador de arquivos, o editor de código e o terminal.
4.  **Epic 4: AI Integration**
    - **Meta:** Integrar a CLI do Claude Code diretamente no workspace do usuário, transformando a IDE em uma interface gráfica inteligente para esta poderosa ferramenta.
5.  **Epic 5: Git Integration**
    - **Meta:** Implementar um fluxo de trabalho de versionamento Git completo e assistido por IA dentro da IDE.
6.  **Epic 6: Productivity & Environment Management**
    - **Meta:** Entregar aprimoramentos avançados de fluxo de trabalho para completar o conjunto de funcionalidades do MVP.

## 6. Epic Details

### Epic 1: Project Foundation & Setup

**Meta Expandida:** O objetivo deste épico é construir a espinha dorsal técnica do projeto. Ao final deste épico, teremos um ambiente de desenvolvimento local totalmente configurado e pronto para que a construção de funcionalidades possa começar.

- **Story 1.1: Initialize Monorepo and Remix App**
  - **As a** Developer, **I want** to initialize a monorepo containing a new Remix application, **so that** I have the basic project structure in place to start development.
  - **Acceptance Criteria:**
    1.  Um novo repositório Git é inicializado.
    2.  A estrutura de um monorepo (ex: com npm workspaces) é criada na raiz.
    3.  Uma nova aplicação Remix é criada dentro do diretório `apps/web` do monorepo.
    4.  O projeto pode ser instalado (`npm install`) a partir da raiz.
    5.  A aplicação Remix pode ser iniciada em modo de desenvolvimento (`npm run dev`) sem erros.
- **Story 1.2: Configure Linting and Code Formatting**
  - **As a** Developer, **I want** to add ESLint and Prettier to the monorepo, **so that** all code automatically adheres to a consistent style and quality standard.
  - **Acceptance Criteria:**
    1.  ESLint e Prettier são adicionados como dependências de desenvolvimento.
    2.  Arquivos de configuração (`.eslintrc`, `.prettierrc`) são criados.
    3.  Scripts `lint` e `format` estão disponíveis no `package.json`.
    4.  Executar o script `format` corrige a formatação.
    5.  Executar o script `lint` reporta problemas de qualidade.
- **Story 1.3: Integrate and Configure SQLite with Prisma**
  - **As a** Developer, **I want** to integrate SQLite into the Remix application using Prisma, **so that** the application has a configured database layer to persist data.
  - **Acceptance Criteria:**
    1.  SQLite e Prisma são adicionados como dependências.
    2.  Prisma é inicializado e configurado para usar o provider SQLite.
    3.  Um schema Prisma inicial é criado.
    4.  O comando `prisma migrate dev` executa com sucesso.
    5.  O Prisma Client pode ser utilizado na aplicação Remix.
- **Story 1.4: Establish Development Environment Configuration**
  - **As a** Developer, **I want** a standardized way to manage environment variables, **so that** the local development setup is simple, secure, and well-documented.
  - **Acceptance Criteria:**
    1.  Um arquivo `.env.example` é criado.
    2.  O arquivo de exemplo contém as variáveis necessárias (ex: `DATABASE_URL`).
    3.  A aplicação carrega as variáveis de um arquivo `.env`.
    4.  O arquivo `.env` está no `.gitignore`.
    5.  O `README.md` é atualizado com instruções de setup.

### Epic 2: User Authentication

**Meta Expandida:** O objetivo deste épico é implementar o portal de entrada para o Cortex. Criaremos um fluxo de configuração para o primeiro usuário (o administrador) e um sistema de login seguro para acessos subsequentes.

- **Story 2.1: Implement First-Time User Setup Flow**
  - **As a** new administrator, **I want** to be prompted to create the first user account when I access a fresh installation, **so that** I can secure the application.
  - **Acceptance Criteria:**
    1.  Ao acessar a aplicação, o sistema verifica se há usuários no banco.
    2.  Se não houver, redireciona para uma página `/setup`.
    3.  A página `/setup` contém um formulário para criar o primeiro usuário.
    4.  Submeter o formulário cria o usuário, faz o hash da senha e cria uma sessão.
    5.  O usuário é redirecionado para a IDE.
    6.  Tentar acessar `/setup` quando já existe um usuário redireciona para `/login`.
- **Story 2.2: Implement Standard User Login**
  - **As the** registered user, **I want** to log in to the platform, **so that** I can access my workspace.
  - **Acceptance Criteria:**
    1.  Uma página de login (`/login`) existe.
    2.  Visitantes são redirecionados para `/login` se um usuário já existir.
    3.  O formulário valida as credenciais.
    4.  Login bem-sucedido cria uma sessão e redireciona para a IDE.
    5.  Login falho exibe uma mensagem de erro.
- **Story 2.3: Implement Logout and Protected Routes**
  - **As the** logged-in user, **I want** to log out and have my workspace protected, **so that** my account remains secure.
  - **Acceptance Criteria:**
    1.  Uma funcionalidade de "Logout" destrói a sessão e redireciona para `/login`.
    2.  Todas as rotas (exceto `/login`, `/setup`) são protegidas.
    3.  Acesso não autenticado a rotas protegidas redireciona para `/login`.

### Epic 3: Core IDE Experience

**Meta Expandida:** Com a autenticação pronta, este épico foca em criar a experiência de gerenciamento de projetos e o ambiente de edição. Ao final, o usuário poderá fazer login, adicionar caminhos para seus projetos e entrar em um desses workspaces para visualizar e editar código.

- **Story 3.1: Create Workspace Management Dashboard**
  - **As a** logged-in user, **I want** a dashboard to manage my workspaces, **so that** I can organize my projects.
  - **Acceptance Criteria:**
    1.  Após o login, o usuário é redirecionado para `/workspaces`.
    2.  A página lista os workspaces adicionados.
    3.  Se a lista estiver vazia, instrui o usuário a criar um.
    4.  Há um botão para "Adicionar Workspace".
    5.  Cada workspace tem um botão para "Entrar".
- **Story 3.2: Implement Adding and Removing Workspace Paths**
  - **As a** logged-in user, **I want** to add a path to a project folder as a workspace, **so that** I can manage project access without affecting the actual files.
  - **Acceptance Criteria:**
    1.  "Adicionar Workspace" solicita um Nome de Exibição e um Caminho no servidor.
    2.  O formulário permite a) fornecer um caminho existente ou b) criar uma nova pasta.
    3.  O sistema valida o caminho.
    4.  O nome e o caminho são salvos na configuração do usuário.
    5.  Cada workspace tem um botão "Remover".
    6.  "Remover" apenas desfaz o link no dashboard, **NÃO** apaga a pasta no servidor.
- **Story 3.3: Implement Main IDE Layout on Workspace Entry**
  - **As a** logged-in user, **I want** to enter a workspace to see the main IDE layout, **so that** I can start working.
  - **Acceptance Criteria:**
    1.  Clicar em "Entrar" navega para a rota do workspace (ex: `/workspaces/{name}`).
    2.  A rota exibe a UI principal da IDE com painéis redimensionáveis.
- **Story 3.4: Implement File Browser and Read-Only Code Viewer**
  - **As a** logged-in user, **I want** to browse and view files in my workspace, **so that** I can inspect the codebase.
  - **Acceptance Criteria:**
    1.  O painel esquerdo exibe a árvore de arquivos do workspace selecionado.
    2.  Clicar em um arquivo o abre em modo read-only no editor.
    3.  O editor tem destaque de sintaxe.
- **Story 3.5: Enable Real-time Code Editing and Saving**
  - **As a** logged-in user, **I want** to edit and save files, **so that** I can modify my code.
  - **Acceptance Criteria:**
    1.  O editor permite edição.
    2.  Salvar envia o conteúdo para o backend.
    3.  O backend atualiza o arquivo correto no caminho do workspace.
- **Story 3.6: Integrate an Interactive Web Terminal**
  - **As a** logged-in user, **I want** an interactive terminal scoped to my workspace, **so that** I can run commands.
  - **Acceptance Criteria:**
    1.  O painel inferior contém um terminal web funcional.
    2.  A sessão do terminal inicia no diretório do workspace selecionado.

### Epic 4: AI Integration

**Meta Expandida:** Este épico integra a CLI do Claude Code na IDE, transformando-a em uma interface gráfica inteligente para a ferramenta, permitindo a execução de fluxos de trabalho de forma visual e a criação de automações.

- **Story 4.1: Integrate Claude Code CLI into the Web Terminal**
  - **As a** Developer, **I want** a CLI do Claude Code acessível no terminal, **so that** I can run its commands.
  - **Acceptance Criteria:**
    1.  A CLI `claude-code` está instalada no ambiente do servidor.
    2.  `claude-code --version` funciona no terminal da IDE.
    3.  A configuração das chaves de API é gerenciada por variáveis de ambiente.
- **Story 4.2: Create a UI Assistant for Common Claude Code Workflows**
  - **As a** Developer, **I want** a UI to help me use common Claude Code workflows, **so that** I don't have to type the full commands.
  - **Acceptance Criteria:**
    1.  O painel direito é um "Assistente Claude Code".
    2.  Contém UI para ações como "Gerar Testes", "Explicar Código".
    3.  As ações constroem e executam o comando CLI correspondente.
    4.  O output da CLI é exibido de forma formatada no painel.
    5.  A lógica de backend que constrói os comandos é abstraída para permitir futuros "providers" de outras CLIs.
- **Story 4.3: Re-imagine AI Task Orchestration as a Claude Code Workflow Builder**
  - **As a** Developer, **I want** to build and save custom workflows using `claude-code` commands, **so that** I can automate my processes.
  - **Acceptance Criteria:**
    1.  A UI de "Orquestração de Tarefas" é um "Construtor de Workflows".
    2.  Permite criar um workflow com múltiplos passos, cada um sendo um comando `claude-code`.
    3.  Workflows podem ser salvos.
    4.  Executar um workflow roda os comandos em sequência.
    5.  A estrutura do workflow é genérica para suportar outras CLIs no futuro.

### Epic 5: Git Integration

**Meta Expandida:** Este épico integra o Git na interface do Cortex, com uma UI para as operações mais comuns e aproveitando a IA para gerar mensagens de commit inteligentes.

- **Story 5.1: Implement Git Status and Staging UI**
  - **As a** Developer, **I want** to see and stage my changed files visually, **so that** I can prepare my commit.
  - **Acceptance Criteria:**
    1.  Uma área "Source Control" na UI lista os arquivos modificados.
    2.  O usuário pode adicionar/remover arquivos da área de "stage".
- **Story 5.2: Implement Commit Functionality**
  - **As a** Developer, **I want** to commit my staged changes with a message, **so that** I can save my work.
  - **Acceptance Criteria:**
    1.  A UI tem uma caixa de texto para a mensagem e um botão "Commit".
    2.  "Commit" executa `git commit` com os arquivos em "stage".
    3.  A UI é atualizada após o commit.
- **Story 5.3: Generate AI-Powered Commit Messages**
  - **As a** Developer, **I want** to generate a commit message with AI, **so that** I can write better commits faster.
  - **Acceptance Criteria:**
    1.  Um botão "Gerar com IA" está disponível.
    2.  A ação envia o `diff` dos arquivos em "stage" para a IA.
    3.  A IA retorna uma sugestão de mensagem de commit.
    4.  O usuário pode editar a sugestão antes de cometer.
- **Story 5.4: Implement Push and Pull Functionality**
  - **As a** Developer, **I want** to push and pull changes, **so that** I can sync with the remote repository.
  - **Acceptance Criteria:**
    1.  Botões "Push" e "Pull" estão disponíveis.
    2.  As ações executam os comandos `git` correspondentes.
    3.  A UI exibe feedback e o status do branch.

### Epic 6: Productivity & Environment Management

**Meta Expandida:** Este épico finaliza o MVP com funcionalidades avançadas de automação e gerenciamento, como a execução de tarefas com um clique e o início de projetos a partir de templates.

- **Story 6.1: Implement the Productivity Panel UI**
  - **As a** Developer, **I want** a panel to save and manage frequently used commands, **so that** I can organize them.
  - **Acceptance Criteria:**
    1.  Uma área "Produtividade" na UI lista os comandos salvos.
    2.  A UI permite adicionar, editar e apagar comandos (nome e o comando em si).
- **Story 6.2: Execute Saved Commands in the Terminal**
  - **As a** Developer, **I want** to run a saved command with one click, **so that** I can speed up tasks.
  - **Acceptance Criteria:**
    1.  Cada comando salvo tem um botão "Executar".
    2.  A ação executa o comando no terminal do workspace ativo.
- **Story 6.3: Implement Dynamic Environment Management (V1)**
  - **As a** Developer, **I want** an interface to manage test routes, **so that** I can test web projects.
  - **Acceptance Criteria:**
    1.  Uma área "Ambiente" na UI permite mapear uma porta local para um caminho/subdomínio público.
    2.  O backend interage com um proxy (Nginx/Apache) para criar as rotas.
    3.  A UI lista as rotas ativas.
- **Story 6.4: Implement the "Template Store" (V1)**
  - **As a** Developer, **I want** to start a new workspace from a template, **so that** I can accelerate project setup.
  - **Acceptance Criteria:**
    1.  O fluxo de "Adicionar Workspace" tem a opção "Criar a partir de um template".
    2.  Uma UI exibe os 2-3 templates disponíveis.
    3.  Selecionar um template cria um novo workspace com os arquivos do template.

## 7. Checklist Results Report

- **Final Decision:** ✅ **READY FOR ARCHITECT**: O PRD e os épicos são abrangentes, bem estruturados e estão prontos para o design da arquitetura técnica.

## 8. Next Steps

### UX Expert Prompt

> **Para: Sally (UX Expert)**
>
> Com base neste PRD, sua tarefa é criar o `front-end-spec.md` (Especificação de UI/UX). Por favor, detalhe os fluxos de usuário, a arquitetura da informação e os componentes necessários, com foco especial na abordagem "mobile-first" e na usabilidade do layout de múltiplos painéis e do novo dashboard de workspaces que definimos.

### Architect Prompt

> **Para: Winston (Architect)**
>
> Usando este PRD e o futuro `front-end-spec.md` como base, sua tarefa é criar o `fullstack-architecture.md`. O design deve seguir estritamente as restrições técnicas definidas (Monorepo, Remix, Node.js, SQLite), ser otimizado para auto-hospedagem, e implementar a integração com a CLI de IA de forma extensível para futuras ferramentas. Por favor, defina também uma estratégia de backup e recuperação para o banco de dados.
