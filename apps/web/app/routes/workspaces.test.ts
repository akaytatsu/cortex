import { describe, it, expect } from "vitest";
import { loader } from "./workspaces";
import { prisma } from "../lib/prisma";
import { SessionService } from "../services/session.service";

describe("Workspaces Route", () => {
  describe("loader", () => {
    it("should redirect to /login when not authenticated", async () => {
      const request = new Request("http://localhost:3000/workspaces");

      await expect(loader({ request, params: {}, context: {} })).rejects.toBeInstanceOf(Response);
      
      try {
        await loader({ request, params: {}, context: {} });
      } catch (response) {
        expect((response as Response).status).toBe(302);
        expect((response as Response).headers.get("location")).toBe("/login");
      }
    });

    it("should return user data when authenticated", async () => {
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

      const request = new Request("http://localhost:3000/workspaces", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      const data = await (response as Response).json();
      expect(data.user.id).toBe(user.id);
      expect(data.user.email).toBe(user.email);
      expect(data.user.password).toBeUndefined(); // Password should not be returned
    });

    it("should throw error when user not found", async () => {
      // Create session with non-existent user ID
      const sessionResponse = await SessionService.createUserSession(
        "non-existent-id",
        "/test"
      );
      const sessionCookie = sessionResponse.headers.get("Set-Cookie")!;

      const request = new Request("http://localhost:3000/workspaces", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      await expect(loader({ request, params: {}, context: {} })).rejects.toThrow("User not found");
    });
  });
});