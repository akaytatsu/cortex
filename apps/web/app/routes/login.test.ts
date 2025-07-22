import { describe, it, expect } from "vitest";
import { loader, action } from "./login";
import { prisma } from "../lib/prisma";
import { SessionService } from "../services/session.service";
import bcrypt from "bcryptjs";

describe("Login Route", () => {
  // Database cleanup is handled by test-setup.ts globally

  describe("loader", () => {
    it("should redirect to setup when no users exist", async () => {
      const request = new Request("http://localhost:3000/login");
      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe("/setup");
    });

    it("should redirect to workspaces when already authenticated", async () => {
      // Create a user first
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          password: "hashedpassword",
        },
      });

      // Create session
      const response = await SessionService.createUserSession(user.id, "/test");
      const sessionCookie = response.headers.get("Set-Cookie")!;

      const request = new Request("http://localhost:3000/login", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      const loaderResponse = await loader({ request, params: {}, context: {} });

      expect(loaderResponse).toBeInstanceOf(Response);
      expect((loaderResponse as Response).status).toBe(302);
      expect((loaderResponse as Response).headers.get("location")).toBe(
        "/workspaces"
      );
    });

    it("should return empty json when users exist but not authenticated", async () => {
      // Create a user
      await prisma.user.create({
        data: {
          email: "test@example.com",
          password: "hashedpassword",
        },
      });

      const request = new Request("http://localhost:3000/login");
      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      const data = await (response as Response).json();
      expect(data).toEqual({});
    });
  });

  describe("action", () => {
    it("should redirect to setup when no users exist", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe("/setup");
    });

    it("should redirect to workspaces when already authenticated", async () => {
      // Create a user first
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          password: "hashedpassword",
        },
      });

      // Create session
      const sessionResponse = await SessionService.createUserSession(
        user.id,
        "/test"
      );
      const sessionCookie = sessionResponse.headers.get("Set-Cookie")!;

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
        },
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe(
        "/workspaces"
      );
    });

    it("should return validation errors for missing email", async () => {
      // Create a user so we pass the hasUsers check
      await prisma.user.create({
        data: {
          email: "existing@example.com",
          password: "hashedpassword",
        },
      });

      const formData = new FormData();
      formData.append("password", "password123");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);

      const data = await (response as Response).json();
      expect(data.errors.email).toBe("Email is required");
    });

    it("should return validation errors for missing password", async () => {
      // Create a user so we pass the hasUsers check
      await prisma.user.create({
        data: {
          email: "existing@example.com",
          password: "hashedpassword",
        },
      });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);

      const data = await (response as Response).json();
      expect(data.errors.password).toBe("Password is required");
    });

    it("should return validation errors for invalid email format", async () => {
      // Create a user so we pass the hasUsers check
      await prisma.user.create({
        data: {
          email: "existing@example.com",
          password: "hashedpassword",
        },
      });

      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "password123");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);

      const data = await (response as Response).json();
      expect(data.errors.email).toBe("Please enter a valid email address");
    });

    it("should successfully login with valid credentials", async () => {
      // Create a user with known password
      const plainPassword = "password123";
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      await prisma.user.create({
        data: {
          email: "test@example.com",
          password: hashedPassword,
        },
      });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", plainPassword);

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe(
        "/workspaces"
      );
      expect((response as Response).headers.get("Set-Cookie")).toContain(
        "__session"
      );
    });

    it("should return error for invalid credentials", async () => {
      // Create a user with known password
      const plainPassword = "password123";
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      await prisma.user.create({
        data: {
          email: "test@example.com",
          password: hashedPassword,
        },
      });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrongpassword");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(401);

      const data = await (response as Response).json();
      expect(data.errors.general).toBe("Invalid email or password");
    });

    it("should return error for non-existent user", async () => {
      // Create a user so we pass the hasUsers check (but different email)
      await prisma.user.create({
        data: {
          email: "existing@example.com",
          password: "hashedpassword",
        },
      });

      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");
      formData.append("password", "password123");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(401);

      const data = await (response as Response).json();
      expect(data.errors.general).toBe("Invalid email or password");
    });
  });
});
