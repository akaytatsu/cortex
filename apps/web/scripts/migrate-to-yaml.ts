#!/usr/bin/env tsx

/**
 * Script de migração dos dados do Prisma/SQLite para YAML
 *
 * NOTA: Este script foi desabilitado após a remoção completa do Prisma.
 * A migração já foi concluída e o sistema agora opera exclusivamente com YAML.
 *
 * Para referência histórica, este script anteriormente:
 * 1. Lia todos os usuários do banco SQLite via Prisma
 * 2. Criava backup do banco atual
 * 3. Convertia os dados para formato YAML
 * 4. Salvava no arquivo users.yaml
 * 5. Validava a integridade dos dados migrados
 */

console.log("⚠️  Este script foi desabilitado após a remoção do Prisma");
console.log("✅ A migração para YAML foi concluída com sucesso");
console.log("📁 O sistema agora opera exclusivamente com arquivos YAML");
console.log("");
console.log("Para gerenciar usuários, use:");
console.log("- Interface web em /setup para primeiro usuário");
console.log("- YamlUserService para operações programáticas");
console.log("- Edição manual do arquivo config/users.yaml (com cuidado)");

process.exit(0);
