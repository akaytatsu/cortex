# 2. Requirements

## Functional (FR)

1.  **FR1:** O sistema deve fornecer um ambiente de desenvolvimento web completo, incluindo gerenciamento de workspaces, navegador de arquivos, editor de código e múltiplas instâncias de terminal.
2.  **FR2:** A IDE deve integrar-se com a CLI do Claude Code para assistência ao desenvolvimento.
3.  **FR3:** O sistema deve incluir funcionalidades Git essenciais (commit, push, pull), com a capacidade de gerar mensagens de commit otimizadas por IA.
4.  **FR4:** A plataforma deve permitir o cadastro e a execução de comandos complexos (Orquestração de Tarefas V1), com monitoramento do progresso em tempo real.
5.  **FR5:** Deve haver um painel de produtividade que permita aos usuários salvar e executar comandos de terminal frequentes com um clique.
6.  **FR6:** O sistema deve oferecer gerenciamento de ambiente dinâmico (V1), permitindo criar rotas de teste via Nginx/Apache.
7.  **FR7:** A plataforma deve incluir uma "Loja de Templates" com 2 a 3 templates iniciais para acelerar o início de novos projetos.
8.  **FR8:** O sistema deve ter um mecanismo de segurança e login para proteger os workspaces dos usuários.

## Non Functional (NFR)

1.  **NFR1:** A plataforma deve ser 100% baseada na web e totalmente responsiva, com uma experiência de usuário mobile-first.
2.  **NFR2:** A solução deve ser auto-hospedável (self-hostable) para garantir a portabilidade e o controle do usuário.
3.  **NFR3:** A stack de tecnologia para a versão inicial deve ser Node.js (LTS), Remix como framework full-stack e SQLite como banco de dados.
4.  **NFR4:** A arquitetura do projeto deve ser um monorepo/monolítico para facilitar o gerenciamento do ambiente integrado.
5.  **NFR5:** A experiência do novo usuário deve permitir a geração e teste de código funcional em menos de 15 minutos.
6.  **NFR6:** A interface do usuário deve ser performática em ambientes web, mesmo ao lidar com operações de terminal e edição de código.
7.  **NFR7:** A arquitetura de integração com a IA deve ser aberta, permitindo futuras substituições ou adições de outros modelos além do Claude Code.
8.  **NFR8:** A arquitetura de integração com CLIs de IA deve ser modular para permitir a adição futura de outras ferramentas.
