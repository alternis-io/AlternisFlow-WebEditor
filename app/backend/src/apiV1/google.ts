import express from 'express';
import { expressFixAsyncify } from "../util";
import * as jose from "jose";
import { PrismaClient, Document, User, WithId, DocumentList, WithToken } from '../prisma';
import createHttpError from 'http-errors';
import assert from "node:assert";
import { log } from "../logRequests";

const prisma = new PrismaClient();

export const apiV1Google: express.Router = express.Router();

const logAndThrowOnRespErr = (msg: string, respBody: any) => {
  const timestamp = new Date().toISOString();
  log.error({
    level: "error",
    message: msg,
    body: respBody,
    time: timestamp,
  });
  throw createHttpError(500, msg);
}

const googleJwksCertUrl = new URL("https://www.googleapis.com/oauth2/v3/certs");
const getGoogleJwks = jose.createRemoteJWKSet(googleJwksCertUrl);

async function verifyGoogleJwt(jwt: string) {
  const verifyResult = await jose.jwtVerify(jwt, getGoogleJwks, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
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

    const verifyResult = await verifyGoogleJwt(req.body.credential);

    const email = verifyResult.payload.email;
    assert(typeof email === "string", "invalid email in jwt payload");

    const token = `$google-jwt-v1$${req.body.credential}`;

    await prisma.user.upsert({
      where: { email },
      update: {
        // FIXME: rename passwordHash
        passwordHash: token,
      },
      create: {
        email,
        passwordHash: token,
      },
    });

    const loginPathName = "/app/login"

    if (process.env.NODE_ENV === "development")
      res.redirect(`http://localhost:3001${loginPathName}`);
    else
      res.redirect(loginPathName);

    res.end();
  }),
);

