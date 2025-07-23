import { describe, it, expect } from "vitest";
import { action, loader } from "./logout";
import { YamlUserService } from "../services/user.service.yaml";
import { SessionService } from "../services/session.service";

describe("Logout Route", () => {
  describe("action", () => {
    it("should destroy session and redirect to /login", async () => {
      // Create a user first
      const yamlUserService = new YamlUserService();
      const user = await yamlUserService.createUser({
        email: "test@example.com",
        password: "hashedpassword",
      });

      // Create session
      const sessionResponse = await SessionService.createUserSession(
        user.id,
        "/test"
      );
      const sessionCookie = sessionResponse.headers.get("Set-Cookie")!;

      const request = new Request("http://localhost:3000/logout", {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
        },
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe("/login");

      // Should have Set-Cookie header to destroy the session
      const setCookieHeader = (response as Response).headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("__session=");
      expect(setCookieHeader).toContain(
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
    });

    it("should redirect to /login even without existing session", async () => {
      const request = new Request("http://localhost:3000/logout", {
        method: "POST",
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe("/login");
    });
  });

  describe("loader", () => {
    it("should return 404 for GET requests", async () => {
      const response = await loader();

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(404);
    });
  });
});
