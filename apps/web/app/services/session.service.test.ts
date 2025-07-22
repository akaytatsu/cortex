import { describe, it, expect } from "vitest";
import { SessionService } from "./session.service";
import { prisma } from "../lib/prisma";

describe("SessionService", () => {
  describe("logout", () => {
    it("should destroy session and redirect to /login", async () => {
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

      // Create request with session cookie
      const request = new Request("http://localhost:3000/test", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      // Verify user is authenticated before logout
      const userId = await SessionService.getUserId(request);
      expect(userId).toBe(user.id);

      // Perform logout
      const logoutResponse = await SessionService.logout(request);

      expect(logoutResponse).toBeInstanceOf(Response);
      expect(logoutResponse.status).toBe(302);
      expect(logoutResponse.headers.get("location")).toBe("/login");
      
      // Verify session is destroyed
      const setCookieHeader = logoutResponse.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("__session=");
      expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    it("should redirect to /login even without existing session", async () => {
      const request = new Request("http://localhost:3000/test");
      const logoutResponse = await SessionService.logout(request);

      expect(logoutResponse).toBeInstanceOf(Response);
      expect(logoutResponse.status).toBe(302);
      expect(logoutResponse.headers.get("location")).toBe("/login");
    });
  });

  describe("requireUserId", () => {
    it("should redirect to /login when no session exists", async () => {
      const request = new Request("http://localhost:3000/test");

      await expect(SessionService.requireUserId(request)).rejects.toBeInstanceOf(Response);
      
      try {
        await SessionService.requireUserId(request);
      } catch (response) {
        expect((response as Response).status).toBe(302);
        expect((response as Response).headers.get("location")).toBe("/login");
      }
    });

    it("should return userId when valid session exists", async () => {
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

      const request = new Request("http://localhost:3000/test", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      const userId = await SessionService.requireUserId(request);
      expect(userId).toBe(user.id);
    });
  });

  describe("getUserId", () => {
    it("should return undefined when no session exists", async () => {
      const request = new Request("http://localhost:3000/test");
      const userId = await SessionService.getUserId(request);
      expect(userId).toBeUndefined();
    });

    it("should return userId when valid session exists", async () => {
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

      const request = new Request("http://localhost:3000/test", {
        headers: {
          Cookie: sessionCookie,
        },
      });

      const userId = await SessionService.getUserId(request);
      expect(userId).toBe(user.id);
    });
  });
});