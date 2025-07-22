# 4. Technical Assumptions

## Repository Structure: Monorepo

- Para um projeto "único e integrado" como o Cortex, um monorepo é a abordagem mais moderna e eficiente. Ele manterá todo o código (frontend, backend, scripts compartilhados) em um único repositório, facilitando a gestão de dependências e a consistência do código.

## Service Architecture

- **Arquitetura Monolítica:** Conforme o brief, a aplicação será um "projeto único e integrado". Um monolítico coeso, construído com Remix, é a implementação direta dessa visão, simplificando o desenvolvimento e o deploy para o MVP.

## Testing Requirements

- **Testes de Unidade + Integração:** A recomendação para o MVP é focar em testes de unidade para a lógica de negócio isolada e testes de integração para as partes críticas que interagem entre si.

## Additional Technical Assumptions and Requests

- **Linguagem/Runtime:** Node.js (versão LTS mais recente).
- **Framework Full-stack:** Remix.
- **Banco de Dados:** SQLite (para a versão inicial open-source, garantindo portabilidade).
- **Portabilidade:** A arquitetura deve priorizar a portabilidade para facilitar a auto-hospedagem.
