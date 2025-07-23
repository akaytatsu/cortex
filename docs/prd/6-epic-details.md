# 6. Epic Details

## Epic 1: Project Foundation & Setup

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

## Epic 2: User Authentication

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

## Epic 3: Core IDE Experience

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

## Epic 4: Claude Code CLI Integration

**Meta Expandida:** Este épico integra o Claude Code CLI - uma ferramenta de IA para desenvolvimento que roda no terminal - na IDE, permitindo que desenvolvedores aproveitem suas capacidades de análise de codebase, geração de código e automação de tarefas diretamente no ambiente web, mantendo a experiência natural de linha de comando.

- **Story 4.1: Verify Claude Code CLI Compatibility and Detection**
  - **As a** Developer, **I want** que o sistema detecte se o Claude Code CLI está disponível, **so that** I can use AI-powered coding assistance when properly configured.
  - **Acceptance Criteria:**
    1.  Sistema verifica se o comando `claude` está disponível no PATH do servidor.
    2.  Se disponível, exibe indicador visual no terminal ou interface.
    3.  Se não disponível, exibe instruções claras de instalação manual para o administrador.
    4.  Terminal inicia no diretório correto do workspace para contexto adequado.
    5.  Sistema não tenta instalar ou configurar automaticamente o Claude Code CLI.
- **Story 4.2: Create Elegant Claude Code Conversation Panel**
  - **As a** Developer, **I want** um painel elegante e conversacional no canto direito para interagir com o Claude Code CLI, **so that** I can ter uma experiência de colaboração com IA profissional e intuitiva.
  - **Acceptance Criteria:**
    1.  Um painel "Claude Code Assistant" é posicionado no canto direito da IDE (conforme layout spec).
    2.  Interface conversacional elegante com design limpo inspirado no Conductor - fundo claro, tipografia moderna, espaçamento adequado.
    3.  Mensagens são apresentadas como bubbles de conversa, não como output de terminal.
    4.  Suporte para markdown rendering nas respostas do Claude Code (código, listas, etc.).
    5.  Histórico de conversas navegável com scroll suave e indicadores visuais.
    6.  Input field moderno com placeholder contextual ("Ask Claude Code anything...").
    7.  Indicadores visuais elegantes para status (thinking, typing, error states).
- **Story 4.3: Implement Claude Code Context Awareness in Dedicated Panel**
  - **As a** Developer, **I want** que o Claude Code no painel dedicado tenha contexto completo do meu workspace, **so that** suas sugestões sejam mais precisas.
  - **Acceptance Criteria:**
    1.  Claude Code no painel dedicado é iniciado sempre no diretório raiz do workspace selecionado.
    2.  Arquivos `.claude-code/` para configurações específicas do projeto são suportados.
    3.  Claude Code pode acessar todos os arquivos do workspace para análise.
    4.  Sessões podem ser resumidas usando funcionalidade `--resume` do Claude Code.
    5.  Configurações de projeto (se existirem) são respeitadas automaticamente.
    6.  Mudanças de workspace atualizam automaticamente o contexto do Claude Code no painel.
- **Story 4.4: Implement Elegant Claude Code Panel Integration Features**
  - **As a** Developer, **I want** funcionalidades sofisticadas de integração entre o painel conversacional Claude Code e a IDE, **so that** I can collaborate seamlessly with AI.
  - **Acceptance Criteria:**
    1.  Arquivos mencionados pelo Claude Code são apresentados como links elegantes que abrem no editor principal.
    2.  Código sugerido aparece em blocos destacados com botão "Apply to File" elegante.
    3.  Copy buttons discretos mas acessíveis para comandos e snippets de código.
    4.  Integração contextual: arquivos selecionados no file browser podem ser enviados ao Claude Code com "@filename".
    5.  Loading states elegantes e progress indicators para operações longas.
    6.  Modo focus expandido com overlay elegante para conversas complexas.
    7.  Quick actions buttons para comandos comuns (Explain, Test, Fix, Refactor).

## Epic 5: Git Integration

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

## Epic 6: Productivity & Environment Management

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
