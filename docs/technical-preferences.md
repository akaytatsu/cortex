# Cortex UI/UX Specification

| Date       | Version | Description                               | Author     |
| :--------- | :------ | :---------------------------------------- | :--------- |
| 2025-07-21 | 1.0     | Documento inicial criado a partir do PRD. | Sally (UX) |

## 1. Introduction

Este documento define as metas da experiência do usuário, a arquitetura da informação, os fluxos de usuário e as especificações de design visual para a interface do Cortex. Ele servirá como a fundação para o design visual e o desenvolvimento frontend, garantindo uma experiência coesa e centrada no usuário.

### Overall UX Goals & Principles

- **Target User Personas:**
  - **Desenvolvedor Moderno (Primário):** Profissional individual ou em equipe que busca acelerar drasticamente a codificação, atuando como um "gestor da IA". Valora eficiência, um fluxo de trabalho simplificado e a capacidade de trabalhar em qualquer dispositivo, incluindo o celular.
  - **Administrador (Secundário):** O usuário que faz o deploy inicial da aplicação auto-hospedada. Valora um processo de setup simples e seguro.
- **Usability Goals:**
  - **Facilidade de Aprendizagem:** Um novo usuário deve conseguir gerar e testar código funcional em menos de 15 minutos.
  - **Eficiência de Uso:** Reduzir o tempo de codificação em 70% através de automações de IA e comandos de um clique.
  - **Memorabilidade:** A interface deve seguir padrões familiares de IDEs para que usuários ocasionais possam retornar sem precisar reaprender o básico.
  - **Prevenção de Erros:** A interface deve guiar o usuário e exigir confirmação para ações destrutivas (ex: apagar um workspace).
- **Design Principles:**
  1.  **Clareza acima de tudo:** A interface deve ser limpa e direta, sem ambiguidades.
  2.  **Mobile-first, Desktop-class:** A experiência no celular deve ser excelente, não apenas "possível". A versão desktop deve ser poderosa e completa.
  3.  **Divulgação Progressiva:** Mostrar apenas o que é necessário para a tarefa atual, evitando sobrecarga de informação, especialmente no mobile.
  4.  **Consistência é a Chave:** Usar padrões de UI e interação consistentes em toda a aplicação.
  5.  **Assistido por IA, Controlado pelo Usuário:** A IA é uma parceira poderosa, mas o usuário final está sempre no controle.

## 2. Information Architecture (IA)

### Site Map / Screen Inventory

```mermaid
graph TD
    subgraph "Área Pública"
        A[/] --> B{Existe usuário?};
        B -->|Não| C[/setup];
        B -->|Sim| D[/login];
    end

    subgraph "Área Autenticada"
        D --> E[/workspaces - Dashboard];
        E --> F{Criar Workspace};
        F --> G[Com Template];
        F --> H[Com Path Existente];
        E --> I["/workspaces/{id} - IDE View"];
        I --> J[Painel: Navegador de Arquivos];
        I --> K[Painel: Editor de Código];
        I --> L[Painel: Terminal];
        I --> M[Painel: Assistente de IA];
        I --> N[Painel: Ferramentas (Git, Orquestração, etc.)];
    end

    style C fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#ccf,stroke:#333,stroke-width:2px
    style I fill:#bbf,stroke:#333,stroke-width:2px
```

### Navigation Structure

- **Navegação Primária (Dentro da IDE):** A navegação principal dentro de um workspace será uma barra de ferramentas inferior (no mobile) ou uma barra de ícones lateral (no desktop) para alternar entre as visualizações de foco principal: `Arquivos`, `Editor`, `Terminal`, `Assistente IA` e `Ferramentas`.
- **Navegação Secundária:** Dentro da área de "Ferramentas", o usuário encontrará acesso a funcionalidades mais específicas como `Git`, `Orquestração de Tarefas` e `Produtividade`.
- **Estratégia de Breadcrumbs:** Os breadcrumbs serão essenciais dentro do "Navegador de Arquivos" para mostrar a localização atual do usuário dentro da estrutura de pastas do seu workspace (ex: `meu-projeto > src > components > Button.tsx`).

## 3\. User Flows

### 1\. Onboarding do Primeiro Usuário e Criação do Primeiro Workspace

- **User Goal:** Permitir que o administrador que instalou a aplicação crie sua conta e adicione seu primeiro projeto de forma segura e intuitiva.
- **Entry Points:** Acessar a URL raiz da aplicação em uma instalação nova.
- **Success Criteria:** O usuário administrador é criado, logado, seu primeiro workspace é adicionado, e ele é direcionado para a tela da IDE.

<!-- end list -->

```mermaid
graph TD
    A[Início: Usuário acessa a URL] --> B{Verificar se existem usuários no DB};
    B -->|Não existem| C[Redireciona para /setup];
    B -->|Sim, existem| D[Redireciona para /login<br/>(Outro fluxo)];
    C --> E[Usuário preenche formulário de setup<br/>(email, senha)];
    E --> F{Dados são válidos?};
    F -->|Não| G[Mostra erros de validação no formulário];
    F -->|Sim| H[Cria usuário no DB e inicia sessão];
    H --> I[Redireciona para /workspaces];
    I --> J[Usuário vê dashboard vazio e o prompt<br/>"Adicionar Workspace"];
    J --> K[Usuário adiciona o primeiro workspace<br/>(informa nome e caminho)];
    K --> L{Caminho é válido?};
    L -->|Não| M[Mostra erro];
    L -->|Sim| N[Adiciona workspace à configuração];
    N --> O[Redireciona para a IDE<br/>/workspaces/{nome-do-workspace}];
    O --> P[Fim do Fluxo];
    G --> E;
    M --> K;
```

- **Edge Cases & Error Handling:**
  - Acesso direto a `/setup` com usuário já existente redireciona para `/login`.
  - Erros de servidor durante a criação devem ser comunicados.
  - Caminho de workspace inválido deve apresentar erro claro.

### 2\. Login de Usuário Recorrente e Navegação de Workspace

- **User Goal:** Permitir que o usuário já existente acesse sua conta e navegue entre seus workspaces.
- **Entry Points:** Acessar a URL da aplicação sem uma sessão ativa.
- **Success Criteria:** O usuário faz login, visualiza seu dashboard e entra na IDE do projeto escolhido.

<!-- end list -->

```mermaid
graph TD
    A[Início: Usuário acessa a URL] --> B{Verificar se já está logado};
    B -->|Sim, sessão ativa| F[Redireciona para /workspaces];
    B -->|Não| C[Redireciona para /login];
    C --> D[Usuário preenche formulário de login];
    D --> E{Credenciais são válidas?};
    E -->|Não| G[Mostra erro de login no formulário];
    E -->|Sim| F;
    F --> H[Usuário visualiza o Dashboard com a lista de workspaces];
    H --> I[Usuário clica em "Entrar" em um workspace];
    I --> J{Workspace é válido/acessível?};
    J -->|Não| K[Mostra erro no Dashboard];
    J -->|Sim| L[Redireciona para a IDE<br/>/workspaces/{nome-do-workspace}];
    L --> M[Fim do Fluxo];
    G --> D;
    K --> H;
```

- **Edge Cases & Error Handling:**
  - Usuário já logado que acessa `/login` é redirecionado para `/workspaces`.
  - Workspace com caminho inválido no servidor deve exibir um erro no dashboard.

### 3\. Loop Principal de Codificação e Execução

- **User Goal:** Permitir que o desenvolvedor navegue, edite, salve e execute comandos de forma fluida.
- **Entry Points:** Estar dentro da visualização da IDE.
- **Success Criteria:** O usuário consegue completar um ciclo de desenvolvimento (modificar código e verificar o resultado).

```mermaid
graph TD
    A[Início: Usuário na IDE] --> B[Navega na árvore de arquivos];
    B --> C[Seleciona um arquivo para editar];
    C --> D[Arquivo abre no Editor];
    D --> E[Usuário edita o código];
    E --> F[Salva o arquivo (Ctrl+S)];
    F --> G[Alterações são enviadas ao servidor];
    G --> H[Usuário alterna para o Terminal];
    H --> I[Executa um comando<br/>(ex: npm run test)];
    I --> J[Observa a saída do comando];
    J --> D;

    subgraph "Ações Paralelas"
        E --> K[Usa o Assistente de IA<br/>para tirar dúvidas];
        F --> L[Usa a UI do Git<br/>para cometer alterações];
        K --> E;
        L --> A;
    end
```

- **Edge Cases & Error Handling:**
  - Erros ao salvar o arquivo devem ser notificados.
  - Perda de conexão deve ser gerenciada de forma elegante.

## 4\. Wireframes & Mockups

- **Design Tool:** A ser definido. Recomendação: Prototipagem com IA (v0) ou Design Manual (Figma).

### Layout da Tela: Dashboard de Workspaces (`/workspaces`)

**Cenário Vazio:** Foco total na ação "Adicionar Primeiro Workspace".
**Cenário Populado:** Lista de "cards" de workspace, cada um com nome, caminho e botões "Entrar" e "Remover".

### Layout da Tela: Visualização Principal da IDE (`/workspaces/{nome}`)

**Visão Desktop:** Layout de múltiplos painéis com `[❮ Workspaces]` no cabeçalho para retorno.
**Visão Mobile:** "Focus View" de painel único com `[❮]` no cabeçalho e uma barra de navegação inferior `[📂 Arquivos] [🤖 IA] [>_ Terminal] [🌿 Git]`.

## 5\. Component Library / Design System

- **Design System Approach:** Adotar **shadcn/ui** com **Tailwind CSS** para acelerar o desenvolvimento, mantendo controle total sobre o código e estilo dos componentes.
- **Core Components:** Button, Input, Card, Resizable Panel, Icon Button, Menu, Tabs, Toast/Notification.

## 6\. Branding & Style Guide

- **Visual Identity:** Moderno, limpo, profissional e focado no desenvolvedor.
- **Color Palette (Dark Theme First):**
  - Primary: `#5E81AC` (Azul suave)
  - Accent: `#88C0D0` (Ciano)
  - Neutral (fundo): `#2E3440` (Cinza escuro)
- **Typography:**
  - UI: `Inter` (ou sans-serif do sistema)
  - Code: `Fira Code` (ou `JetBrains Mono`)
- **Iconography:** `Lucide Icons`.
- **Spacing Scale:** Baseada em múltiplos de `4px`.

## 7\. Accessibility Requirements

- **Standard:** WCAG 2.1 Nível AA.
- **Key Requirements:** Contraste de cores adequado (4.5:1), navegação completa por teclado com indicador de foco visível, suporte a leitores de tela e alvos de toque com tamanho mínimo de 44x44px em dispositivos móveis.
- **Testing Strategy:** Combinação de testes automatizados (Axe, Lighthouse) e manuais (navegação por teclado, leitores de tela).

## 8\. Responsiveness Strategy

- **Breakpoints:**
  - Mobile (`< 768px`)
  - Tablet (`768px - 1023px`)
  - Desktop (`>= 1024px`)
- **Adaptation Patterns:** A transição ocorrerá da "Focus View" (Mobile) para o layout de múltiplos painéis (Desktop), com a navegação principal mudando da barra inferior para a barra lateral.

## 9\. Animation & Micro-interactions

- **Motion Principles:** As animações serão funcionais, rápidas (\< 300ms), consistentes e acessíveis (respeitando `prefers-reduced-motion`).
- **Key Animations:** Deslizamento suave para abertura/fechamento de painéis, feedback sutil em botões, e transições suaves para notificações e abas.

## 10\. Performance Considerations

- **Performance Goals:** LCP \< 2.5s, FID \< 100ms, 60 FPS para animações.
- **Design Strategies:** Carregamento prioritário de conteúdo essencial, virtualização de listas longas, lazy loading de componentes e uso de skeletons de carregamento.

## 11\. Next Steps

### Immediate Actions

1.  Revisar este documento completo.
2.  Obter a aprovação final.
3.  Preparar o handoff para o Arquiteto (Winston).

### Design Handoff Checklist

- [x] All user flows documented
- [x] Component inventory complete
- [x] Accessibility requirements defined
- [x] Responsive strategy clear
- [x] Brand guidelines incorporated
- [x] Performance goals established

<!-- end list -->
