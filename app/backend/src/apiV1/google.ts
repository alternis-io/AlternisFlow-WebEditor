import express from 'express';
import { expressFixAsyncify } from "../util";
import { PrismaClient } from '../prisma';
import createHttpError from 'http-errors';
import assert from "node:assert";
import { verifyGoogleJwt } from '../auth/google/auth';

const prisma = new PrismaClient();

export const apiV1Google: express.Router = express.Router();

async function verifyAndUpsertGoogleJwt(token: string) {
  const verifyResult = await verifyGoogleJwt(token);

  const email = verifyResult.payload.email;
  assert(typeof email === "string", "invalid email in jwt payload");

  await prisma.user.upsert({
    where: { email },
    update: {
      // FIXME: don't store this
      // token,
    },
    create: {
      email,
      // token,
    },
  });

  return verifyResult;
}

apiV1Google.post<
  undefined,
  undefined,
  /**
   * SEE: https://developers.google.com/identity/gsi/web/reference/html-reference#server-side
   */
  {
    g_csrf_token: string,
    credential: string,
    select_by: string,
  }
>(
  '/users/me/login/google/callback',
  expressFixAsyncify(async function login(req, res) {
    if (!req.body.g_csrf_token) throw createHttpError(400, "params missing g_csrf_token field");
    if (!req.body.credential) throw createHttpError(400, "params missing credential field");
    if (req.cookies.g_csrf_token !== req.body.g_csrf_token)
      throw createHttpError(400, "cookies missing g_csrf_token");

    await verifyAndUpsertGoogleJwt(req.body.credential);

    const loginPathName = "/app/login"

    if (process.env.NODE_ENV === "development")
      res.redirect(`http://localhost:3001${loginPathName}`);
    else
      res.redirect(loginPathName);

    res.end();
  }),
);

// FIXME: expressFixAsyncify requires the typed overload
apiV1Google.post<any>(
  '/users/me/login/google',
  expressFixAsyncify(async function login(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      throw createHttpError(401);

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token)
      throw createHttpError(400, "Invalid authorization format");

    await verifyAndUpsertGoogleJwt(token);
    res.status(200);
    res.end();
  }),
);
