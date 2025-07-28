# Design System Foundation - Cortex

Este documento descreve o sistema de design da aplicação Cortex, incluindo design tokens, componentes base e diretrizes de uso.

## Visão Geral

O design system do Cortex foi criado para garantir consistência visual e experiência do usuário em toda a aplicação. Ele é baseado em:

- **Design Tokens**: Variáveis CSS que definem valores fundamentais de design
- **Componentes Base**: Componentes React reutilizáveis construídos sobre os tokens
- **Sistema de Densidade**: Adaptação da interface para diferentes preferências do usuário
- **Tema Responsivo**: Suporte nativo para modo claro e escuro

## Design Tokens

Os design tokens estão definidos em `apps/web/app/styles/design-tokens.css` e cobrem todas as propriedades fundamentais do design.

### Paleta de Cores

#### Cores Primárias
- **Primary**: Azul principal da aplicação (50-950)
- **Secondary**: Cinza neutro para textos e elementos secundários (50-950)

#### Cores Semânticas
- **Success**: Verde para estados de sucesso (50-950)
- **Warning**: Âmbar para estados de aviso (50-950)
- **Error**: Vermelho para estados de erro (50-950)
- **Info**: Azul claro para informações (50-950)

#### Cores Contextuais
- **Background**: Cores de fundo (primary, secondary, tertiary, elevated, overlay)
- **Surface**: Cores de superfície (primary, secondary, tertiary, hover, pressed)
- **Text**: Cores de texto (primary, secondary, tertiary, disabled, inverse, link)
- **Border**: Cores de borda (primary, secondary, tertiary, focus, error, success, warning)

### Sistema Tipográfico

#### Famílias de Fonte
- **Sans**: Inter (padrão) - Interface principal
- **Mono**: Fonte monoespaçada - Código e dados técnicos
- **Serif**: Fonte serifada - Conteúdo editorial (quando necessário)

#### Escala Tipográfica
- **Display**: Large (60px), Medium (48px), Small (36px)
- **Headline**: Large (30px), Medium (24px), Small (20px)
- **Title**: Large (18px), Medium (16px), Small (14px)
- **Body**: Large (16px), Medium (14px), Small (12px)
- **Label**: Large (14px), Medium (12px), Small (11px)

#### Propriedades Tipográficas
- **Font Weights**: thin (100) → black (900)
- **Line Heights**: none (1) → loose (2)
- **Letter Spacing**: tighter (-0.05em) → widest (0.1em)

### Sistema de Espaçamento

Baseado em um grid de 8px para garantir consistência e alinhamento visual.

#### Escala de Espaçamento
- **Base**: 0.5rem (8px) - Unidade fundamental
- **Escala**: 0 → 96 (0px → 384px) seguindo múltiplos de 8px

#### Valores Semânticos
- **Component**: xs (8px) → 2xl (64px) - Espaçamento entre componentes
- **Section**: xs (32px) → xl (128px) - Espaçamento entre seções
- **Page**: xs (64px) → xl (256px) - Espaçamento de página

### Sombras e Elevações

Sistema inspirado no Material Design para criar hierarquia visual.

#### Sombras Base
- **xs → 2xl**: Progressão natural de sombras
- **inner**: Sombra interna
- **focus**: Sombra de foco para acessibilidade
- **none**: Sem sombra

#### Sombras Coloridas
- Sombras em cores primárias para elementos interativos específicos

#### Elevações Semânticas
- **surface** (0): Superfície padrão
- **card** (1): Cards e painéis
- **button** (2): Botões e chips
- **dropdown** (3): Dropdowns e menus
- **modal** (4): Modais e diálogos
- **overlay** (5): Overlays e tooltips
- **popup** (6): Popups e notificações

### Animações e Transições

#### Durações
- **instant** (0ms): Mudanças instantâneas
- **fast** (150ms): Transições rápidas
- **normal** (200ms): Transições padrão
- **moderate** (300ms): Transições moderadas
- **slow** → **slowest** (500ms → 1000ms): Transições lentas

#### Easing Functions  
- **smooth**: cubic-bezier(0.4, 0, 0.2, 1) - Padrão recomendado
- **bounce**: cubic-bezier(0.68, -0.55, 0.265, 1.55) - Efeito bounce
- **spring**: cubic-bezier(0.175, 0.885, 0.32, 1.275) - Efeito mola
- **sharp**: cubic-bezier(0.4, 0, 0.6, 1) - Transição sharp
- **emphasized**: cubic-bezier(0.05, 0.7, 0.1, 1) - Transição emphasized

#### Animações Pré-definidas
- **Fade**: fadeIn, fadeOut
- **Slide**: slideUp, slideDown, slideLeft, slideRight  
- **Scale**: scaleUp, scaleDown
- **Utility**: bounce, pulse, spin

### Sistema de Densidade

Permite adaptar a interface para diferentes preferências de densidade visual.

#### Níveis de Densidade
- **Compact**: Interface mais densa, ideal para usuários avançados
- **Comfortable**: Densidade padrão, balanceada para a maioria dos usuários
- **Spacious**: Interface mais espaçosa, ideal para acessibilidade

#### Propriedades Afetadas
- **Alturas**: Botões, inputs, items de lista, linhas de tabela
- **Padding**: Cards, formulários, seções
- **Gaps**: Espaçamento entre componentes
- **Tamanhos**: Ícones e elementos visuais

## Tema Claro/Escuro

O sistema suporta nativamente modo claro e escuro através de:

### Implementação
- **Attribute-based**: `[data-theme="dark"]` para controle explícito
- **Class-based**: `.dark` para compatibilidade com frameworks
- **System preference**: `@media (prefers-color-scheme: dark)` como fallback

### Uso Programático
```typescript
import { useTheme } from '~/hooks/useTheme';

function MyComponent() {
  const { theme, effectiveTheme, toggleTheme, setTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Tema atual: {effectiveTheme}
    </button>
  );
}
```

## Componentes Base

### Button

Componente de botão com suporte completo ao design system.

#### Variantes
- **primary**: Ação principal (padrão)
- **secondary**: Ação secundária
- **outline**: Botão com borda
- **ghost**: Botão sem fundo
- **destructive**: Ações destrutivas
- **success**: Ações de sucesso
- **warning**: Ações de aviso

#### Tamanhos
- **sm**: Pequeno (altura 32px em comfortable)
- **md**: Médio (altura 40px em comfortable) - padrão
- **lg**: Grande (altura 48px em comfortable)

#### Props Principais
```typescript
interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "comfortable" | "spacious";
  loading?: boolean;
  disabled?: boolean;
}
```

#### Exemplo de Uso
```tsx
<Button variant="primary" size="md" loading={isSubmitting}>
  Salvar Alterações
</Button>
```

### Input

Componente de input com estados visuais e validação.

#### Variantes
- **default**: Input padrão com borda
- **filled**: Input com fundo preenchido
- **ghost**: Input transparente

#### Estados
- **default**: Estado padrão
- **error**: Estado de erro com feedback visual
- **success**: Estado de sucesso
- **warning**: Estado de aviso

#### Props Principais
```typescript
interface InputProps {
  variant?: "default" | "filled" | "ghost";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "comfortable" | "spacious";
  state?: "default" | "error" | "success" | "warning";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  label?: string;
}
```

#### Exemplo de Uso
```tsx
<Input
  label="Nome do workspace"
  placeholder="Digite o nome..."
  state={hasError ? "error" : "default"}
  helperText={hasError ? "Nome é obrigatório" : ""}
  leftIcon={<FolderIcon />}
/>
```

### Card

Componente de card com elevações e densidade adaptável.

#### Variantes
- **default**: Card padrão com elevação sutil
- **elevated**: Card com elevação maior
- **outlined**: Card com borda sem sombra
- **ghost**: Card transparente

#### Props Principais
```typescript
interface CardProps {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  density?: "compact" | "comfortable" | "spacious";
  interactive?: boolean; // Adiciona hover effects
}
```

#### Subcomponentes
- **CardHeader**: Cabeçalho do card
- **CardTitle**: Título com controle tipográfico
- **CardDescription**: Descrição com texto secundário
- **CardContent**: Conteúdo principal
- **CardFooter**: Rodapé com ações

#### Exemplo de Uso
```tsx
<Card variant="default" density="comfortable" interactive>
  <CardHeader>
    <CardTitle size="lg">Nome do Projeto</CardTitle>
    <CardDescription>Descrição detalhada do projeto</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo do card */}
  </CardContent>
  <CardFooter justify="end">
    <Button variant="outline" size="sm">Cancelar</Button>
    <Button variant="primary" size="sm">Confirmar</Button>
  </CardFooter>
</Card>
```

### Modal

Componente de modal com gerenciamento de foco e acessibilidade.

#### Funcionalidades
- **Gerenciamento de foco**: Trava o foco dentro do modal
- **Scroll lock**: Previne scroll do body quando aberto
- **Keyboard navigation**: Suporte para ESC e tab navigation
- **Backdrop click**: Fecha ao clicar fora (configurável)

#### Tamanhos
- **sm**: 448px (max-width)
- **md**: 512px - padrão
- **lg**: 672px
- **xl**: 896px
- **full**: Largura total com margem

#### Props Principais
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  placement?: "center" | "top" | "bottom";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}
```

#### Subcomponentes
- **ModalHeader**: Cabeçalho com título
- **ModalTitle**: Título semântico
- **ModalDescription**: Descrição do modal
- **ModalContent**: Conteúdo principal scrollável
- **ModalFooter**: Rodapé com ações

#### Exemplo de Uso
```tsx
<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  size="md"
  placement="center"
>
  <ModalHeader>
    <ModalTitle>Confirmar Ação</ModalTitle>
    <ModalDescription>
      Esta ação não pode ser desfeita. Deseja continuar?
    </ModalDescription>
  </ModalHeader>
  <ModalContent>
    {/* Conteúdo adicional se necessário */}
  </ModalContent>
  <ModalFooter>
    <Button variant="outline" onClick={handleClose}>
      Cancelar
    </Button>
    <Button variant="destructive" onClick={handleConfirm}>
      Confirmar
    </Button>
  </ModalFooter>
</Modal>
```

## Utilitários Tailwind Customizados

O sistema adiciona utilitários semânticos ao Tailwind CSS:

### Classes Base
- `.btn-base`: Estilos base para botões
- `.input-base`: Estilos base para inputs  
- `.card-base`: Estilos base para cards
- `.modal-base`: Estilos base para modais

### Densidade
- `.density-compact`, `.density-comfortable`, `.density-spacious`: Aplica densidade global

### Elevação
- `.elevation-0` → `.elevation-6`: Elevações numéricas
- `.elevation-surface`, `.elevation-card`, etc.: Elevações semânticas

### Tipografia Semântica
- `.text-display-large` → `.text-label-small`: Escala tipográfica semântica

### Espaçamento Semântico
- `.gap-component-xs` → `.gap-page-xl`: Gaps semânticos para diferentes contextos

## Integração com Tailwind CSS

O design system está totalmente integrado com o Tailwind CSS através de:

### Configuração Estendida
- **Colors**: Todas as cores do design system mapeadas
- **Spacing**: Sistema de espaçamento de 8px
- **Typography**: Escalas e propriedades tipográficas
- **Shadows**: Sombras e elevações
- **Animation**: Animações e transições

### Dark Mode
```typescript
// tailwind.config.ts
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  // ...
}
```

### Uso nas Classes
```tsx
// Cores semânticas
className="bg-primary-600 text-text-inverse border-border-focus"

// Espaçamento do sistema
className="p-6 gap-component-sm"

// Elevações
className="elevation-card hover:elevation-dropdown"

// Tipografia semântica  
className="text-title-large font-semibold text-text-primary"
```

## Melhores Práticas

### 1. Sempre Use Design Tokens
```tsx
// ✅ Correto
className="bg-primary-600 text-text-inverse"

// ❌ Evite
className="bg-blue-600 text-white"
```

### 2. Prefira Componentes Base
```tsx
// ✅ Correto - usa componente do design system
<Button variant="primary" size="md">Confirmar</Button>

// ❌ Evite - botão customizado sem padrões
<button className="bg-blue-600 px-4 py-2 rounded">Confirmar</button>
```

### 3. Respeite a Densidade
```tsx
// ✅ Correto - permite configuração de densidade
<Card density={density}>
  <Button density={density}>Ação</Button>
</Card>

// ❌ Evite - densidade fixa
<div className="p-6">
  <button className="h-10">Ação</button>
</div>
```

### 4. Use Estados Semânticos
```tsx
// ✅ Correto
<Input state="error" helperText="Campo obrigatório" />

// ❌ Evite
<input className="border-red-500" />
<span className="text-red-500">Campo obrigatório</span>
```

### 5. Aproveite as Animações
```tsx
// ✅ Correto
className="transition-fast hover:elevation-dropdown"

// ❌ Evite
className="transition-all duration-300 hover:shadow-lg"
```

## Migração de Componentes Existentes

### Passo 1: Identifique Padrões
- Mapeie cores hardcoded para tokens semânticos
- Identifique tamanhos e espaçamentos para normalizar
- Verifique estados e variantes necessárias

### Passo 2: Substitua Gradualmente
- Comece com componentes mais simples (Button, Input)
- Teste cada componente individualmente
- Mantenha funcionalidade existente durante transição

### Passo 3: Aproveite Novos Recursos
- Adicione suporte à densidade onde aplicável
- Implemente estados visuais melhorados
- Utilize animações e transições padronizadas

### Exemplo de Migração

**Antes:**
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
  Salvar
</button>
```

**Depois:**
```tsx
<Button variant="primary" size="md">
  Salvar  
</Button>
```

## Extensibilidade

O design system foi projetado para ser extensível:

### Adicionando Novas Cores
1. Adicione tokens no `design-tokens.css`
2. Estenda o `tailwind.config.ts`
3. Adicione variantes nos componentes se necessário

### Criando Novos Componentes
1. Use tokens existentes como base
2. Siga padrões de densidade e estados
3. Implemente variantes consistentes com o sistema
4. Adicione documentação e exemplos

### Personalizando Temas
1. Sobrescreva tokens CSS específicos
2. Mantenha contraste e acessibilidade
3. Teste em ambos os modos (claro/escuro)

---

Este design system é um documento vivo que evolui com as necessidades da aplicação. Para sugestões, melhorias ou novos componentes, consulte a documentação de desenvolvimento ou abra uma issue no repositório.