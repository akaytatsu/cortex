import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { config } from "../lib/config";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [config.sessionSecret],
    secure: config.env === "production",
  },
});

export class SessionService {
  static async getSession(request: Request) {
    const cookie = request.headers.get("Cookie");
    return sessionStorage.getSession(cookie);
  }

  static async createUserSession(
    userId: string,
    redirectTo: string = "/workspaces"
  ) {
    const session = await sessionStorage.getSession();
    session.set("userId", userId);

    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  static async requireUserId(request: Request): Promise<string> {
    const session = await this.getSession(request);
    const userId = session.get("userId");

    if (!userId || typeof userId !== "string") {
      throw redirect("/login");
    }

    return userId;
  }

  static async getUserId(request: Request): Promise<string | undefined> {
    const session = await this.getSession(request);
    const userId = session.get("userId");

    if (!userId || typeof userId !== "string") {
      return undefined;
    }

    return userId;
  }

  static async logout(request: Request) {
    const session = await this.getSession(request);

    return redirect("/login", {
      headers: {
        "Set-Cookie": await sessionStorage.destroySession(session),
      },
    });
  }
}
