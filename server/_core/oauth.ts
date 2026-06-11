import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ─── Manus OAuth Callback ─────────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── LINE OAuth Callback ──────────────────────────────────────────────────
  app.get("/api/auth/line/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      res.redirect("/?error=line_auth_failed");
      return;
    }

    const clientId = process.env.LINE_CLIENT_ID;
    const clientSecret = process.env.LINE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[LINE OAuth] LINE_CLIENT_ID or LINE_CLIENT_SECRET not set");
      res.redirect("/?error=line_not_configured");
      return;
    }

    try {
      // 1. Exchange code for access token
      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const redirectUri = `${origin}/api/auth/line/callback`;

      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[LINE OAuth] Token exchange failed:", err);
        res.redirect("/?error=line_token_failed");
        return;
      }

      const tokenData = await tokenRes.json() as { access_token: string; id_token?: string };

      // 2. Get user profile
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        res.redirect("/?error=line_profile_failed");
        return;
      }

      const profile = await profileRes.json() as { userId: string; displayName: string; pictureUrl?: string };

      const openId = `line_${profile.userId}`;

      // 3. Upsert user
      await db.upsertUser({
        openId,
        name: profile.displayName,
        email: null,
        loginMethod: "line",
        lastSignedIn: new Date(),
      });

      // 4. Create session
      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 5. Redirect to return path or home
      const returnPath = state ? decodeURIComponent(state) : "/";
      res.redirect(302, returnPath.startsWith("/") ? returnPath : "/");
    } catch (error) {
      console.error("[LINE OAuth] Callback error:", error);
      res.redirect("/?error=line_auth_error");
    }
  });
}
