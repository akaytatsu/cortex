import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

const SESSIONS_FILE_PATH = path.join(process.cwd(), 'config', 'sessions.yaml');

test.describe('Session Persistence E2E Tests', () => {
  
  test.beforeEach(async () => {
    // Limpar arquivo de sessões antes de cada teste
    try {
      await fs.unlink(SESSIONS_FILE_PATH);
    } catch (error) {
      // Arquivo pode não existir, tudo bem
    }
  });

  test.afterEach(async () => {
    // Limpar arquivo de sessões após cada teste
    try {
      await fs.unlink(SESSIONS_FILE_PATH);
    } catch (error) {
      // Arquivo pode não existir, tudo bem
    }
  });

  test.describe('Subtask 4.1: Criar sessão via painel e verificar arquivo sessions.yaml', () => {
    test('deve falhar - sessão criada via painel não persiste no arquivo (RED)', async ({ page }) => {
      // Navegar para o workspace
      await page.goto('/workspace/test-workspace');
      
      // Aguardar painel do copilot carregar
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // Clicar em "Nova Sessão"
      await page.click('[data-testid="new-session-button"]');
      
      // Aguardar modal abrir e selecionar agente
      await expect(page.locator('[data-testid="new-session-modal"]')).toBeVisible();
      await page.click('[data-testid="create-session-confirm"]');
      
      // Aguardar sessão ser criada (confirmação visual)
      await expect(page.locator('[data-testid="session-item"]')).toBeVisible();
      
      // Aguardar um pouco para persistência
      await page.waitForTimeout(1000);
      
      // DEVE FALHAR - verificar se arquivo sessions.yaml foi criado
      const fileExists = await fs.access(SESSIONS_FILE_PATH).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      if (fileExists) {
        const fileContent = await fs.readFile(SESSIONS_FILE_PATH, 'utf8');
        const sessions = YAML.parse(fileContent);
        
        // DEVE FALHAR - verificar se sessão foi persistida
        expect(sessions.sessions).toHaveLength(1);
        expect(sessions.sessions[0]).toMatchObject({
          workspaceName: 'test-workspace',
          userId: expect.any(String),
          pid: expect.any(Number),
          startedAt: expect.any(String),
        });
      }
    });
  });

  test.describe('Subtask 4.2: Recarregar página e verificar restauração visual', () => {
    test('deve falhar - sessões não são restauradas visualmente após reload (RED)', async ({ page }) => {
      // Primeiro, criar arquivo de sessões mock
      const mockSessions = {
        sessions: [
          {
            id: 'test-session-1',
            workspaceName: 'test-workspace',
            workspacePath: '/test/path',
            userId: 'test-user',
            pid: 1234,
            startedAt: new Date().toISOString(),
            agentName: 'Test Agent',
            command: 'test command',
          },
          {
            id: 'test-session-2',
            workspaceName: 'test-workspace',
            workspacePath: '/test/path',
            userId: 'test-user',
            pid: 5678,
            startedAt: new Date().toISOString(),
          }
        ]
      };

      // Garantir que o diretório existe
      await fs.mkdir(path.dirname(SESSIONS_FILE_PATH), { recursive: true });
      await fs.writeFile(SESSIONS_FILE_PATH, YAML.stringify(mockSessions), 'utf8');
      
      // Navegar para o workspace
      await page.goto('/workspace/test-workspace');
      
      // Aguardar painel carregar
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // DEVE FALHAR - verificar se sessões persistidas são exibidas
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(2);
      
      // Verificar detalhes das sessões
      const sessionItems = page.locator('[data-testid="session-item"]');
      await expect(sessionItems.first()).toContainText('Test Agent');
      await expect(sessionItems.nth(1)).toContainText('test-session-2');
      
      // Recarregar página
      await page.reload();
      
      // Aguardar painel carregar novamente
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // DEVE FALHAR - verificar se sessões ainda estão visíveis após reload
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(2);
      await expect(sessionItems.first()).toContainText('Test Agent');
    });
  });

  test.describe('Subtask 4.3: Encerrar sessão e verificar remoção do arquivo', () => {
    test('deve falhar - sessão encerrada não é removida do arquivo (RED)', async ({ page }) => {
      // Criar arquivo com múltiplas sessões
      const mockSessions = {
        sessions: [
          {
            id: 'session-to-keep',
            workspaceName: 'test-workspace',
            workspacePath: '/test/path',
            userId: 'test-user',
            pid: 1111,
            startedAt: new Date().toISOString(),
          },
          {
            id: 'session-to-remove',
            workspaceName: 'test-workspace',
            workspacePath: '/test/path',
            userId: 'test-user',
            pid: 2222,
            startedAt: new Date().toISOString(),
            agentName: 'Remove Me',
          }
        ]
      };

      await fs.mkdir(path.dirname(SESSIONS_FILE_PATH), { recursive: true });
      await fs.writeFile(SESSIONS_FILE_PATH, YAML.stringify(mockSessions), 'utf8');
      
      // Navegar para o workspace
      await page.goto('/workspace/test-workspace');
      
      // Aguardar painel carregar com sessões
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(2);
      
      // Encontrar e fechar a sessão "Remove Me"
      const sessionToRemove = page.locator('[data-testid="session-item"]').filter({ hasText: 'Remove Me' });
      await sessionToRemove.locator('[data-testid="close-session-button"]').click();
      
      // Aguardar confirmação de remoção
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(1);
      
      // Aguardar persistência
      await page.waitForTimeout(1000);
      
      // DEVE FALHAR - verificar arquivo atualizado
      const fileContent = await fs.readFile(SESSIONS_FILE_PATH, 'utf8');
      const updatedSessions = YAML.parse(fileContent);
      
      expect(updatedSessions.sessions).toHaveLength(1);
      expect(updatedSessions.sessions[0].id).toBe('session-to-keep');
      expect(updatedSessions.sessions.find((s: any) => s.id === 'session-to-remove')).toBeUndefined();
    });
  });

  test.describe('Subtask 4.4: Simular erro de persistência e verificar toast', () => {
    test('deve falhar - erro de persistência não exibe toast de erro (RED)', async ({ page }) => {
      // Simular arquivo corrompido criando arquivo inválido
      await fs.mkdir(path.dirname(SESSIONS_FILE_PATH), { recursive: true });
      await fs.writeFile(SESSIONS_FILE_PATH, 'invalid: yaml: content: [', 'utf8');
      
      // Navegar para workspace
      await page.goto('/workspace/test-workspace');
      
      // Aguardar painel carregar
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // Tentar criar nova sessão
      await page.click('[data-testid="new-session-button"]');
      await expect(page.locator('[data-testid="new-session-modal"]')).toBeVisible();
      await page.click('[data-testid="create-session-confirm"]');
      
      // DEVE FALHAR - verificar se toast de erro aparece
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('Erro ao salvar sessão');
      
      // Verificar que funcionalidade básica ainda funciona
      await expect(page.locator('[data-testid="session-item"]')).toBeVisible();
    });

    test('deve falhar - arquivo sem permissão de escrita exibe toast apropriado (RED)', async ({ page }) => {
      // Criar arquivo apenas leitura
      await fs.mkdir(path.dirname(SESSIONS_FILE_PATH), { recursive: true });
      await fs.writeFile(SESSIONS_FILE_PATH, YAML.stringify({ sessions: [] }), 'utf8');
      await fs.chmod(SESSIONS_FILE_PATH, 0o444); // apenas leitura
      
      // Navegar para workspace
      await page.goto('/workspace/test-workspace');
      
      // Aguardar painel carregar
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // Tentar criar nova sessão
      await page.click('[data-testid="new-session-button"]');
      await expect(page.locator('[data-testid="new-session-modal"]')).toBeVisible();
      await page.click('[data-testid="create-session-confirm"]');
      
      // DEVE FALHAR - verificar toast de erro de permissão
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('Erro de permissão');
      
      // Restaurar permissões para cleanup
      await fs.chmod(SESSIONS_FILE_PATH, 0o644);
    });
  });
});