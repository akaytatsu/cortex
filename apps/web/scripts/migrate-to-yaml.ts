#!/usr/bin/env tsx

/**
 * Script de migração dos dados do Prisma/SQLite para YAML
 * 
 * Uso:
 *   npx tsx scripts/migrate-to-yaml.ts
 * 
 * Este script:
 * 1. Lê todos os usuários do banco SQLite via Prisma
 * 2. Cria backup do banco atual
 * 3. Converte os dados para formato YAML
 * 4. Salva no arquivo users.yaml
 * 5. Valida a integridade dos dados migrados
 */

import { PrismaClient } from "@prisma/client";
import { YamlFileService } from "../app/lib/yaml-file-service";
import { createUserData, type YamlUser } from "../app/lib/yaml-schema";
import fs from "fs/promises";
import path from "path";

interface MigrationOptions {
  dryRun?: boolean;
  backupPath?: string;
  outputPath?: string;
}

class DataMigrator {
  private prisma: PrismaClient;
  private yamlService: YamlFileService;
  private options: MigrationOptions;

  constructor(options: MigrationOptions = {}) {
    this.prisma = new PrismaClient();
    this.options = options;
    
    const outputPath = options.outputPath || path.join(process.cwd(), "config", "users.yaml");
    this.yamlService = new YamlFileService(outputPath);
  }

  async migrate(): Promise<void> {
    console.log("🚀 Iniciando migração dos dados do Prisma para YAML...\n");

    try {
      // 1. Verificar se há dados para migrar
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        console.log("ℹ️  Nenhum usuário encontrado no banco de dados. Migração não necessária.");
        return;
      }

      console.log(`📊 Encontrados ${userCount} usuários para migrar`);

      // 2. Criar backup do banco atual
      await this.createDatabaseBackup();

      // 3. Ler todos os usuários do Prisma
      console.log("📖 Lendo usuários do banco de dados...");
      const prismaUsers = await this.prisma.user.findMany({
        orderBy: { createdAt: "asc" }
      });

      // 4. Converter para formato YAML
      console.log("🔄 Convertendo dados para formato YAML...");
      const yamlUsers: YamlUser[] = prismaUsers.map(user => {
        // O primeiro usuário (mais antigo) vira admin
        const isFirstUser = user === prismaUsers[0];
        
        return createUserData({
          id: user.id,
          email: user.email,
          password_hash: user.password,
          role: isFirstUser ? "admin" : "user"
        });
      });

      // Atualizar as datas corretamente
      yamlUsers.forEach((yamlUser, index) => {
        const originalUser = prismaUsers[index];
        yamlUser.created_at = originalUser.createdAt.toISOString();
        yamlUser.updated_at = originalUser.updatedAt.toISOString();
      });

      // 5. Salvar dados no YAML (ou simular se dry-run)
      if (this.options.dryRun) {
        console.log("🧪 Modo dry-run: simulando escrita do arquivo YAML");
        console.log("Dados que seriam escritos:");
        console.log(JSON.stringify({ users: yamlUsers }, null, 2));
      } else {
        console.log("💾 Salvando dados no arquivo YAML...");
        await this.yamlService.writeUsers({
          users: yamlUsers,
          config: {
            salt_rounds: 12,
            password_min_length: 8,
            require_special_chars: true,
            session_timeout: 3600,
            max_login_attempts: 5,
            lockout_duration: 900
          }
        });
      }

      // 6. Validar integridade dos dados
      await this.validateMigration(prismaUsers, yamlUsers);

      console.log("✅ Migração concluída com sucesso!");
      console.log(`📁 Arquivo YAML criado em: ${this.yamlService}`);
      
      if (!this.options.dryRun) {
        console.log("\n⚠️  PRÓXIMOS PASSOS:");
        console.log("1. Teste a aplicação com os novos dados YAML");
        console.log("2. Se tudo estiver funcionando, remova as dependências do Prisma");
        console.log("3. Exclua a pasta prisma/ e arquivos relacionados");
      }

    } catch (error) {
      console.error("❌ Erro durante a migração:", error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async createDatabaseBackup(): Promise<void> {
    if (!this.options.backupPath) {
      this.options.backupPath = path.join(process.cwd(), "prisma", `dev.db.backup.${Date.now()}`);
    }

    try {
      console.log("💾 Criando backup do banco de dados...");
      
      const dbPath = path.join(process.cwd(), "prisma", "dev.db");
      
      // Verificar se o arquivo de banco existe
      try {
        await fs.access(dbPath);
      } catch {
        console.log("⚠️  Arquivo de banco não encontrado, pulando backup");
        return;
      }

      if (!this.options.dryRun) {
        await fs.copyFile(dbPath, this.options.backupPath);
        console.log(`✅ Backup criado: ${this.options.backupPath}`);
      } else {
        console.log(`🧪 Dry-run: backup seria criado em ${this.options.backupPath}`);
      }
    } catch (error) {
      console.warn("⚠️  Falha ao criar backup:", error);
      console.log("Continuando migração sem backup...");
    }
  }

  private async validateMigration(prismaUsers: any[], yamlUsers: YamlUser[]): Promise<void> {
    console.log("🔍 Validando integridade dos dados migrados...");

    // Verificar se a quantidade de usuários bate
    if (prismaUsers.length !== yamlUsers.length) {
      throw new Error(`Contagem de usuários não bate: Prisma(${prismaUsers.length}) vs YAML(${yamlUsers.length})`);
    }

    // Verificar se todos os emails foram migrados
    const prismaEmails = new Set(prismaUsers.map(u => u.email));
    const yamlEmails = new Set(yamlUsers.map(u => u.email));
    
    for (const email of prismaEmails) {
      if (!yamlEmails.has(email)) {
        throw new Error(`Email ${email} não encontrado nos dados YAML`);
      }
    }

    // Verificar se os hashes de senha foram preservados
    for (let i = 0; i < prismaUsers.length; i++) {
      const prismaUser = prismaUsers[i];
      const yamlUser = yamlUsers.find(y => y.email === prismaUser.email);
      
      if (!yamlUser) {
        throw new Error(`Usuário ${prismaUser.email} não encontrado no YAML`);
      }
      
      if (yamlUser.password_hash !== prismaUser.password) {
        throw new Error(`Hash de senha não bate para ${prismaUser.email}`);
      }
    }

    console.log("✅ Validação de integridade passou!");
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-n");
  const outputPath = args.find(arg => arg.startsWith("--output="))?.split("=")[1];
  const backupPath = args.find(arg => arg.startsWith("--backup="))?.split("=")[1];

  if (dryRun) {
    console.log("🧪 Executando em modo dry-run (nenhum arquivo será modificado)\n");
  }

  const migrator = new DataMigrator({
    dryRun,
    outputPath,
    backupPath
  });

  try {
    await migrator.migrate();
  } catch (error) {
    console.error("💥 Migração falhou:", error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente (ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DataMigrator };