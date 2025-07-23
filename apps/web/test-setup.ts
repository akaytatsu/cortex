import { beforeEach, afterEach } from "vitest";
import { YamlFileService } from "./app/lib/yaml-file-service";
import path from "path";

const testUsersFile = path.join(process.cwd(), "config", "users-test.yaml");

const defaultConfig = {
  salt_rounds: 12,
  password_min_length: 8,
  require_special_chars: true,
  session_timeout: 3600,
  max_login_attempts: 5,
  lockout_duration: 900,
};

beforeEach(async () => {
  // Ensure clean state before each test - clear test users file
  const yamlService = new YamlFileService(testUsersFile);
  await yamlService.writeUsers({ users: [], config: defaultConfig });
});

afterEach(async () => {
  // Ensure clean state after each test
  const yamlService = new YamlFileService(testUsersFile);
  await yamlService.writeUsers({ users: [], config: defaultConfig });
});
