Claro, aqui está o conteúdo completo do "Project Brief: Cortex" em formato markdown, pronto para ser copiado e salvo em um arquivo.

---

# Project Brief: Cortex

### Resumo Executivo

O projeto consiste em uma plataforma de desenvolvimento (IDE) web e responsiva, profundamente integrada com Inteligência Artificial. A solução utilizará inicialmente o modelo Claude Code, mas será projetada com uma arquitetura aberta para futuras integrações com outras IAs, buscando resolver a fragmentação de ferramentas e a complexidade do desenvolvimento atual. O ambiente será robusto, unificado e acessível de qualquer lugar, inclusive em dispositivos móveis. O público-alvo inicial são desenvolvedores solo e em equipes, com a visão de futuramente capacitar também usuários não-técnicos a criar soluções de forma fácil e intuitiva.

### Declaração do Problema

- **Estado Atual e Pontos de Dor:** O desenvolvimento de software moderno, mesmo com os avanços da IA, permanece um processo fragmentado. Desenvolvedores precisam gerenciar um ecossistema complexo de ferramentas, comandos e configurações, o que desvia o foco da criação de valor.
- **Por que as Soluções Atuais Falham:** As IDEs existentes, mesmo as baseadas na web, continuam presas ao paradigma do desktop. Suas interfaces não são otimizadas para telas menores, resultando em uma UX inadequada em dispositivos móveis. Falta uma plataforma que ofereça um desenvolvimento assistido por IA de forma robusta e com uma UX verdadeiramente utilizável no navegador, especialmente em um celular.
- **Impacto do Problema:** Essa limitação restringe a produtividade e a flexibilidade, forçando os desenvolvedores a estarem em frente a um computador para trabalhar de forma eficaz, impactando diretamente a agilidade.

### Solução Proposta

- **Conceito e Abordagem:** A solução é uma IDE unificada, 100% web e responsiva, com a IA no centro da experiência. O foco não é replicar 100% de uma IDE nativa, mas sim um conjunto essencial de funcionalidades que tornam o desenvolvimento com IA rápido e acessível, incluindo uma "Loja de Templates" para acelerar o início dos projetos.
- **Funcionalidades Essenciais:**
  - **Ambiente de Desenvolvimento Web:** Gerenciamento de workspaces, navegador de arquivos, editor de código e múltiplas instâncias de terminal.
  - **Integração Git com IA:** Operações Git essenciais com geração de mensagens de commit otimizadas por IA.
  - **Orquestração de Tarefas com IA (V1):** Cadastro e execução de comandos complexos pela IA, com monitoramento em tempo real do progresso.
  - **Automações de Produtividade:** Painel para salvar e executar comandos de terminal frequentes com um clique.
  - **Gerenciamento de Ambiente Dinâmico (V1):** Capacidade de gerenciar Nginx/Apache para criar rotas de teste dinamicamente.
- **Diferenciais Chave:** Uma UX superior e mobile-first, e um fluxo de trabalho simplificado pela orquestração de IA e gerenciamento de ambiente.
- **Visão de Longo Prazo:** Tornar-se a ferramenta de escolha para desenvolvedores e, futuramente, capacitar usuários não-técnicos.

### Público-Alvo

- **Segmento Primário: O Desenvolvedor Moderno (Individual ou em Equipe):** Focam na fase de implementação e buscam acelerar drasticamente a codificação, atuando mais como "gestores da IA". Suas dores são a escrita de código manual repetitivo, a complexidade de configuração e a falta de uma boa ferramenta mobile.

### Metas e Métricas de Sucesso

- **Objetivos de Negócio:**
  - Lançar um MVP focado na experiência de codificação via IA em **4 meses**.
  - Obter feedback qualitativo de 10-20 desenvolvedores no primeiro mês.
- **Métricas de Sucesso do Usuário:**
  - **Redução de 70% no Tempo de Codificação:** Principal indicador de sucesso, transformando o desenvolvedor em um "gestor da IA".
  - **Tempo para "Código Funcional":** Novo usuário deve gerar e testar código funcional em menos de 15 minutos.
- **KPIs:** Tempo médio de conclusão de tarefa, comandos de IA por sessão, taxa de adoção e retenção.

### Escopo do MVP (Lançamento em 4 Meses)

- **DENTRO DO ESCOPO:** Ambiente de Dev Web Completo, Fluxo Git com IA, Orquestração de Tarefas com IA (V1), Automações de Produtividade, Gerenciamento de Ambiente (V1), e 2-3 Templates Iniciais.
- **FORA DO ESCOPO:** Interface para Não-Programadores (Fase 2), Loja de Templates Completa, Funcionalidades Avançadas de Colaboração.
- **Critérios de Sucesso do MVP:** Validar a redução do tempo de codificação, receber feedback positivo sobre a usabilidade (especialmente mobile) e construir uma base inicial de usuários.

### Visão Pós-MVP

- **Fase 2:** Capacitação de Não-Programadores, expansão da Loja de Templates e recursos de colaboração em equipe.
- **Visão de Longo Prazo:** Tornar-se a ferramenta padrão para desenvolvimento assistido por IA e a ponte entre "pro-code" e "no-code".
- **Oportunidades:** Versão Enterprise, plataforma educacional, marketplace de workflows de IA.

### Considerações Técnicas

- **Requisitos de Plataforma:** Web Responsiva, com segurança e login como requisitos fundamentais.
- **Preferências de Tecnologia:** Node.js (LTS mais recente), framework full-stack Remix, e banco de dados SQLite para a versão inicial open-source.
- **Considerações de Arquitetura:** Projeto único e integrado (monolítico/monorepo) para permitir o auto-gerenciamento do ambiente, com foco em portabilidade.

### Restrições e Premissas

- **Restrições:** Prazo de 4 meses para o MVP, recursos de um desenvolvedor solo, orçamento limitado, e requisito de ser auto-hospedável.
- **Premissas Chave:** Existe demanda por uma UX mobile superior, o valor da redução do tempo de codificação impulsionará a adoção, a IA tem capacidade técnica para a tarefa, e a stack tecnológica escolhida é viável.

### Riscos e Questões em Aberto

- **Riscos Principais:** Risco de performance no ambiente web, dependência da qualidade da API da IA, desafio de criar uma UX excelente para desktop e mobile, e escopo ambicioso para 4 meses.
- **Questões em Aberto:** Estratégia de monetização pós-MVP, plano para coleta de feedback, limitações e custos da API do Claude Code.

### Apêndices

- **Referências Iniciais:**
  - [https://conductor.build/](https://conductor.build/)
  - [https://github.com/sugyan/claude-code-webui](https://github.com/sugyan/claude-code-webui)
  - [https://github.com/siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)

### Próximos Passos

- **Ações Imediatas:**
  1.  Revisar o Project Brief completo para garantir consistência.
  2.  Iniciar a próxima fase do planejamento: a criação do PRD (Product Requirements Document).
- **Handoff para o PM:**
  - Este Project Brief fornece o contexto completo para o projeto Cortex. O próximo passo é engajar o Product Manager para iniciar a "Geração do PRD", usando este brief como base para detalhar todos os requisitos, épicos e estórias de usuário.
