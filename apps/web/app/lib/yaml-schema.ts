import { z } from "zod";

// Schema para um usuário individual
export const UserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email format"),
  password_hash: z.string().min(1, "Password hash is required"),
  role: z.enum(["admin", "user"]).default("user"),
  created_at: z.string().datetime("Invalid datetime format"),
  updated_at: z.string().datetime("Invalid datetime format"),
  last_login: z
    .string()
    .datetime("Invalid datetime format")
    .nullable()
    .optional(),
  active: z.boolean().default(true),
});

// Schema para configurações de autenticação
export const AuthConfigSchema = z.object({
  salt_rounds: z.number().min(10).max(20).default(12),
  password_min_length: z.number().min(6).default(8),
  require_special_chars: z.boolean().default(true),
  session_timeout: z.number().min(300).default(3600), // min 5 minutes
  max_login_attempts: z.number().min(3).default(5),
  lockout_duration: z.number().min(300).default(900), // min 5 minutes
});

// Schema principal do arquivo YAML
export const UsersYamlSchema = z.object({
  users: z.array(UserSchema).default([]),
  config: AuthConfigSchema.optional().default({
    salt_rounds: 12,
    password_min_length: 8,
    require_special_chars: true,
    session_timeout: 3600,
    max_login_attempts: 5,
    lockout_duration: 900,
  }),
});

// Tipos TypeScript derivados dos schemas
export type YamlUser = z.infer<typeof UserSchema>;
export type YamlAuthConfig = z.infer<typeof AuthConfigSchema>;
export type UsersYamlData = z.infer<typeof UsersYamlSchema>;

// Função para validar e parsear dados YAML
export function validateUsersYaml(data: unknown): UsersYamlData {
  return UsersYamlSchema.parse(data);
}

// Função para validar um usuário individual
export function validateUser(data: unknown): YamlUser {
  return UserSchema.parse(data);
}

// Função para validar configurações de auth
export function validateAuthConfig(data: unknown): YamlAuthConfig {
  return AuthConfigSchema.parse(data);
}

// Helper para criar um novo usuário com valores padrão
export function createUserData(input: {
  id: string;
  email: string;
  password_hash: string;
  role?: "admin" | "user";
}): YamlUser {
  const now = new Date().toISOString();
  return UserSchema.parse({
    ...input,
    created_at: now,
    updated_at: now,
    active: true,
  });
}

// Schema para sessão persistida
export const PersistedSessionSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
  workspacePath: z.string().min(1, "Workspace path is required"),
  pid: z.number().int().positive("PID must be a positive integer"),
  startedAt: z.string().datetime("Invalid datetime format"),
  agentName: z.string().optional(),
  command: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
  recovered: z.boolean().optional(),
});

// Schema para o arquivo de sessões YAML
export const SessionsYamlSchema = z.object({
  sessions: z.array(PersistedSessionSchema).default([]),
});

// Tipos TypeScript derivados dos schemas de sessão
export type PersistedSessionData = z.infer<typeof PersistedSessionSchema>;
export type SessionsYamlData = z.infer<typeof SessionsYamlSchema>;

// Função para validar e parsear dados de sessões YAML
export function validateSessionsYaml(data: unknown): SessionsYamlData {
  return SessionsYamlSchema.parse(data);
}

// Função para validar uma sessão individual
export function validatePersistedSession(data: unknown): PersistedSessionData {
  return PersistedSessionSchema.parse(data);
}
