import type express from "express";
import jwt from "jsonwebtoken";
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
  email: string;
}

export function generateAccessToken(userInfo: AuthUserInfo) {
  return jwt.sign(userInfo, tokenSecret, { expiresIn: '1800s' });
}

declare global {
  namespace Express {
    export interface Request {
      locals: {
        user?: AuthUserInfo;
        token?: string;
      }
    }
  }
}

// FIXME: add typing
export function requireAuthToken<
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

  jwt.verify(token, tokenSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.locals!.user = user as AuthUserInfo;
    req.locals!.token = token;
    next();
  });
}
