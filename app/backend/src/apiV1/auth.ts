import type express from "express";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert";

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

// FIXME: add typing
export function requireAuthToken<
  P = any, // express.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any, // express.Query,
  ReqLocals extends Record<string, any> = Record<string, any>,
  ResLocals extends Record<string, any> = Record<string, any>,
  //Req extends express.Request<> & { locals?: { user?: AuthUserInfo } },
  //Res extends express.Response,
>(
  req: express.Request<P, ResBody, ReqBody, ReqQuery, ReqLocals>
    & { locals?: ReqLocals }
    & { locals?: { user?: AuthUserInfo } },
  res: express.Response<ResBody, ResLocals>,
  next: express.NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.sendStatus(401);
  const [type, token] = authHeader.split(' ');

  // FIXME: can I pass an error to next() here?
  if (type !== 'Bearer')
    return res.sendStatus(400);
  if (!token)
    return res.sendStatus(400);

  jwt.verify(token, tokenSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.locals!.user = user as AuthUserInfo;
    next();
  });
}

