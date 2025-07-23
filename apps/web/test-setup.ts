import { beforeEach, afterEach } from "vitest";
import { YamlFileService } from "./app/lib/yaml-file-service";
import path from "path";

const testUsersFile = path.join(process.cwd(), "config", "users-test.yaml");

beforeEach(async () => {
  // Ensure clean state before each test - clear test users file
  const yamlService = new YamlFileService(testUsersFile);
  await yamlService.write({ users: [] });
});

afterEach(async () => {
  // Ensure clean state after each test
  const yamlService = new YamlFileService(testUsersFile);
  await yamlService.write({ users: [] });
});
