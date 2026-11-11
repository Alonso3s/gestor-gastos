import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import type { AuthResponse, LoginInput, RegisterInput } from './auth.schemas.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

function sendSession(res: Response, status: number, session: authService.Session): void {
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
    ...refreshCookieOptions,
    maxAge: authService.REFRESH_TOKEN_TTL_MS,
  });
  const body: AuthResponse = { accessToken: session.accessToken, user: session.user };
  res.status(status).json(body);
}

function readRefreshCookie(req: Request): string | undefined {
  const cookies: Record<string, string | undefined> = req.cookies;
  return cookies[REFRESH_COOKIE_NAME];
}

export async function register(req: Request, res: Response): Promise<void> {
  const session = await authService.register(req.body as RegisterInput);
  sendSession(res, 201, session);
}

export async function login(req: Request, res: Response): Promise<void> {
  const session = await authService.login(req.body as LoginInput);
  sendSession(res, 200, session);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const session = await authService.refresh(readRefreshCookie(req));
  sendSession(res, 200, session);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json(await authService.getCurrentUser(req.userId));
}
