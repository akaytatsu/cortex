import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Linting Configuration", () => {
  const rootDir = path.resolve(__dirname, "../../");

  it("should have valid ESLint configuration", () => {
    const eslintConfigPath = path.join(rootDir, ".eslintrc.json");
    expect(fs.existsSync(eslintConfigPath)).toBe(true);

    const configContent = fs.readFileSync(eslintConfigPath, "utf-8");
    const config = JSON.parse(configContent);

    expect(config.extends).toContain("eslint:recommended");
    expect(config.extends).toContain("plugin:@typescript-eslint/recommended");
    expect(config.extends).toContain("prettier");
    expect(config.parser).toBe("@typescript-eslint/parser");
  });

  it("should have valid Prettier configuration", () => {
    const prettierConfigPath = path.join(rootDir, ".prettierrc");
    expect(fs.existsSync(prettierConfigPath)).toBe(true);

    const configContent = fs.readFileSync(prettierConfigPath, "utf-8");
    const config = JSON.parse(configContent);

    expect(config.semi).toBe(true);
    expect(config.singleQuote).toBe(false);
    expect(config.printWidth).toBe(80);
    expect(config.tabWidth).toBe(2);
    expect(config.bracketSameLine).toBe(false);
    expect(config.quoteProps).toBe("as-needed");
  });

  it("should have ignore files", () => {
    const eslintIgnorePath = path.join(rootDir, ".eslintignore");
    const prettierIgnorePath = path.join(rootDir, ".prettierignore");

    expect(fs.existsSync(eslintIgnorePath)).toBe(true);
    expect(fs.existsSync(prettierIgnorePath)).toBe(true);
  });

  it("should have required npm scripts", () => {
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageContent);

    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts["lint:fix"]).toBeDefined();
    expect(packageJson.scripts.format).toBeDefined();
    expect(packageJson.scripts["format:check"]).toBeDefined();
  });

  it("should have required dev dependencies", () => {
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageContent);

    expect(packageJson.devDependencies.eslint).toMatch(/^~8\./);
    expect(packageJson.devDependencies.prettier).toMatch(/^~3\./);
    expect(
      packageJson.devDependencies["@typescript-eslint/parser"]
    ).toBeDefined();
    expect(
      packageJson.devDependencies["@typescript-eslint/eslint-plugin"]
    ).toBeDefined();
  });
});
