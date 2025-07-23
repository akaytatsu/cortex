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

## Épico 4: O Copiloto Inteligente com Agentes Dinâmicos

**Meta Expandida:** Este épico transforma a IDE em um ambiente de desenvolvimento inteligente ao integrar a CLI `claude code` de forma profunda e flexível. O foco é criar uma experiência de copiloto em tempo real, onde cada workspace pode definir seus próprios "agentes" de inicialização através de um arquivo de configuração local. Isso permite que os usuários criem atalhos para tarefas e contextos específicos do projeto, que são iniciados via WebSockets e gerenciados através de uma interface de usuário elegante e intuitiva.

- **História 4.1: Backend - Base da Comunicação com WebSocket**
  - **Como um(a)** Desenvolvedor(a), **eu quero** um servidor WebSocket robusto, **para que** o frontend e o backend possam ter um canal de comunicação persistente e em tempo real para todas as interações com o `claude code`.
  - **Critérios de Aceitação:**
    1. Um servidor WebSocket é implementado e executado junto com a aplicação web principal.
    2. O servidor gerencia múltiplas conexões de clientes concorrentes, mapeando cada conexão a um usuário autenticado.
    3. Um protocolo claro para mensagens (ex: `iniciar_sessao`, `enviar_comando`, `receber_output`, `sessao_encerrada`) é definido e documentado.

- **História 4.2: Backend - Gerenciamento do Ciclo de Vida de Processos `claude code`**
  - **Como um(a)** Desenvolvedor(a), **eu quero** que o backend possa iniciar, gerenciar e encerrar processos da CLI `claude code`, inclusive com comandos de inicialização, **para que** as sessões possam ser controladas dinamicamente.
  - **Critérios de Aceitação:**
    1. O backend pode iniciar um novo processo `claude code` no diretório de um workspace.
    2. A função de inicialização aceita um parâmetro opcional de comando (ex: para executar `claude "/meu-agente"`).
    3. O backend pode associar o `PID` do processo a um ID de sessão único e encerrar a sessão pelo seu ID.
    4. A saída (`stdout`) e erros (`stderr`) do processo são capturados para serem retransmitidos via WebSocket.

- **História 4.3: Backend - Carregador de Configuração de Agentes por Workspace**
  - **Como um(a)** Desenvolvedor(a), **eu quero** que o backend leia um arquivo de configuração `.claude-agents.yaml` na raiz de um workspace, **para que** agentes personalizados possam ser definidos dinamicamente para cada projeto.
  - **Critérios de Aceitação:**
    1. Ao receber uma solicitação, o backend procura por um arquivo `.claude-agents.yaml` no diretório do workspace especificado.
    2. O backend consegue analisar o arquivo YAML, validando sua estrutura (uma lista de agentes com `name`, `description`, e `command`).
    3. Um novo endpoint de API é criado (ex: `GET /api/workspaces/{ws_id}/agents`) que retorna a lista de agentes configurados ou uma lista vazia se o arquivo não existir.
    4. Erros de análise no YAML são tratados graciosamente (ex: retornando uma lista vazia e logando o erro).

- **História 4.4: Backend - Persistência e Recuperação de Sessões Ativas**
  - **Como um(a)** Desenvolvedor(a), **eu quero** que as sessões ativas sejam salvas em um arquivo `sessions.yaml`, **para que** o estado possa ser recuperado em caso de reinicialização do servidor.
  - **Critérios de Aceitação:**
    1. Um arquivo `sessions.yaml` global armazena as sessões ativas (ID da sessão, workspace, PID, hora de início, e o agente/comando inicial usado).
    2. O arquivo é atualizado na criação e no encerramento de cada sessão.
    3. Na inicialização, o backend lê o arquivo para tentar recuperar e re-associar processos existentes.
    4. Um mecanismo de limpeza remove sessões "órfãs" (processos que não existem mais).

- **História 4.5: Backend - Timeout Automático de Sessões Inativas**
  - **Como um(a)** Desenvolvedor(a), **eu quero** que sessões inativas por mais de 12 horas sejam encerradas, **para que** os recursos do sistema sejam preservados.
  - **Critérios de Aceitação:**
    1. Uma tarefa agendada verifica periodicamente o `sessions.yaml`.
    2. Sessões com mais de 12 horas de duração são identificadas.
    3. O processo `claude code` correspondente é encerrado, e a entrada é removida do `sessions.yaml`.

- **História 4.6: Frontend - Painel do Copiloto e Exibição em Tempo Real**
  - **Como um(a)** Usuário(a), **eu quero** um painel de copiloto elegante que exiba a saída da minha sessão `claude code` em tempo real, **para que** a interação seja fluida e conversacional.
  - **Critérios de Aceitação:**
    1. Um painel dedicado ao copiloto existe no layout da IDE, com design inspirado no Conductor.
    2. Ao selecionar uma sessão ativa, o painel estabelece uma conexão WebSocket.
    3. Mensagens recebidas via WebSocket são renderizadas de forma formatada (suportando markdown) na área de saída.
    4. Um indicador visual de "processando" é exibido enquanto o backend executa um comando.

- **História 4.7: Frontend - Hub de Controle do Copiloto (Gerenciamento de Sessões e Agentes)**
  - **Como um(a)** Usuário(a), **eu quero** um hub central para gerenciar minhas sessões e iniciar novas com agentes específicos do workspace, **para que** eu tenha controle total sobre o copiloto.
  - **Critérios de Aceitação:**
    1. A UI do copiloto exibe uma lista das minhas sessões ativas, permitindo alternar entre elas ou fechá-las.
    2. Um botão "Nova Sessão" está presente.
    3. Clicar em "Nova Sessão" chama a API do backend para buscar os agentes do `.claude-agents.yaml` do workspace atual.
    4. Uma janela modal exibe os agentes disponíveis (nome e descrição) para seleção. Se nenhum agente for encontrado, oferece uma "Sessão Padrão".
    5. Selecionar um agente e confirmar envia o `command` correspondente ao backend para iniciar a nova sessão.

- **História 4.8: Frontend - Interação de Comando (Input e Histórico)**
  - **Como um(a)** Usuário(a), **eu quero** uma área de input para enviar comandos para a sessão ativa e um histórico de comandos, **para que** eu possa interagir eficientemente com o `claude code`.
  - **Critérios de Aceitação:**
    1. Uma caixa de input no painel do copiloto permite digitar e enviar comandos via WebSocket.
    2. Os comandos enviados pelo usuário são visíveis no histórico da conversa.
    3. A caixa de input permite navegar pelo histórico de comandos com as setas (cima/baixo).

- **História 4.9: Frontend - Notificações de Eventos de Sessão**
  - **Como um(a)** Usuário(a), **eu quero** ser notificado sobre eventos importantes da sessão, **para que** eu esteja ciente do que está acontecendo em segundo plano.
  - **Critérios de Aceitação:**
    1. Uma notificação (toast) sutil aparece quando uma sessão é encerrada automaticamente por timeout.
    2. A UI indica claramente quando uma conexão WebSocket é perdida e tenta reconectar.
    3. A lista de sessões ativas é atualizada em tempo real se uma sessão for encerrada por outro meio.

- **História 4.10: Documentação - Guia de Uso dos Agentes Dinâmicos**
  - **Como um(a)** Usuário(a), **eu quero** uma documentação clara sobre como configurar e usar os agentes dinâmicos, **para que** eu possa customizar meus workspaces.
  - **Critérios de Aceitação:**
    1. Uma seção na documentação do projeto (`docs/claude-code.md`) é criada.
    2. A documentação explica a responsabilidade do usuário de instalar o `claude code` CLI.
    3. Inclui um guia detalhado sobre como criar o arquivo `.claude-agents.yaml`, com exemplos da sua estrutura.
    4. Mostra, com screenshots, como iniciar uma nova sessão usando um agente personalizado através da UI.


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
