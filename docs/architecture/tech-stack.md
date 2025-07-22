# Tech Stack

Esta tabela representa as decisões tecnológicas definitivas para o projeto Cortex.

| Categoria                | Tecnologia   | Versão (Inicial)       | Propósito                                             | Racional                                                                              |
| :----------------------- | :----------- | :--------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Linguagem**            | TypeScript   | **5.8**                | Linguagem principal para todo o projeto.              | Padrão de mercado para desenvolvimento robusto com Remix; segurança de tipos.         |
| **Runtime**              | Node.js      | **22.x**               | Ambiente de execução do servidor.                     | Requisito explícito do projeto; ecossistema maduro.                                   |
| **Framework Full-stack** | Remix        | **2.16.8**             | Framework principal para UI e lógica de servidor.     | Requisito explícito para um monolito coeso e SSR. **REGRA CRÍTICA:** NUNCA adicionar `fetcher` em dependências do useEffect. |
| **Banco de Dados**       | SQLite       | `~5.x`                 | Persistência de dados (usuários, workspaces).         | Requisito explícito para portabilidade na versão inicial.                             |
| **ORM**                  | Prisma       | **6.x**                | Camada de acesso e migração do banco de dados.        | Definido na Estória 1.3; simplifica as operações de DB.                               |
| **Estilização**          | Tailwind CSS | **4.1.11**             | Framework de estilização utilitário.                  | Sua preferência; integra perfeitamente com shadcn/ui.                                 |
| **Componentes de UI**    | shadcn/ui    | `Mais recente estável` | Biblioteca de componentes acessíveis e customizáveis. | Escolha da especificação de UI/UX para agilidade.                                     |
| **Ícones**               | Lucide Icons | `Mais recente estável` | Biblioteca de ícones.                                 | Definido na especificação de UI/UX.                                                   |
| **Testes (Unit/Int)**    | Vitest       | `~1.x`                 | Framework para testes de unidade e integração.        | Moderno, rápido e com excelente integração com o ecossistema Vite (usado pelo Remix). |
| **Testes (E2E)**         | Playwright   | `~1.x`                 | Framework para testes end-to-end.                     | Robusto para testar aplicações web complexas e fluxos de usuário.                     |
| **Linting**              | ESLint       | `~8.x`                 | Análise estática de código para qualidade.            | Definido na Estória 1.2.                                                              |
| **Formatação**           | Prettier     | `~3.x`                 | Formatador de código.                                 | Definido na Estória 1.2.                                                              |
| **Containerização**      | Docker       | `Mais recente estável` | Empacotamento da aplicação para portabilidade.        | Melhor abordagem para cumprir o requisito de ser `self-hostable`.                     |

---
