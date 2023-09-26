import type express from "express";
import * as jose from "jose";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert";
import createHttpError from "http-errors";

// FIXME: use some kind of config dir
const tokenSecretPath = path.join(__dirname, "secret.token");
let tokenSecret = Buffer.allocUnsafe(64);

// WARNING premature optimization
try {
  const tokenFd = fs.openSync(tokenSecretPath, 'r');
  fs.readSync(tokenFd, tokenSecret, 0, 64, null);
} catch (err: any) {
  if (err.code !== "ENOENT")
    throw err;
  tokenSecret = crypto.randomBytes(64);
  fs.writeFileSync(tokenSecretPath, tokenSecret);
}

export interface AuthUserInfo {
  id: number;
  email: string;
}

export async function generateAccessToken(userInfo: AuthUserInfo) {
  return await new jose.SignJWT({ user: userInfo })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('alternis.io')
    .setAudience(userInfo.email)
    .setExpirationTime('2h')
    .sign(tokenSecret);
}

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUserInfo;
      token?: string;
    }
  }
}

// FIXME: add typing
export async function requireAuthToken<
  P = any, // express.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any, // express.Query,
  ReqLocals extends Record<string, any> = Record<string, any>,
  ResLocals extends Record<string, any> = Record<string, any>,
>(
  req: express.Request<P, ResBody, ReqBody, ReqQuery, ReqLocals>,
  res: express.Response<ResBody, ResLocals>,
  next: express.NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return next(createHttpError(401));

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token)
    return next(createHttpError(400, "Invalid authorization format"));

  try {
    const verifyResult = await jose.jwtVerify(token, tokenSecret, {
      issuer: 'alternis.io',
    });
    assert(validPayload(verifyResult.payload), "no audience in token");
    req.user = verifyResult.payload.user;
    req.token = token;
    next();
  } catch (err: any) {
    res.sendStatus(403);
    next(createHttpError(403));
  }
}

const validPayload = (u: any): u is { user: AuthUserInfo } =>
  u !== null
  && typeof u === "object"
  && u.user !== null
  && typeof u.user === "object"
  && typeof u.user.id === "number"
  && typeof u.user.email === "string";
