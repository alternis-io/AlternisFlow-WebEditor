import type express from "express";
import * as jose from "jose";
import assert from "node:assert";
import createHttpError from "http-errors";
import type { AuthUserInfo } from "..";

const googleJwksCertUrl = new URL("https://www.googleapis.com/oauth2/v3/certs");
const getGoogleJwks = jose.createRemoteJWKSet(googleJwksCertUrl);

async function verifyGoogleJwt(jwt: string) {
  const verifyResult = await jose.jwtVerify(jwt, getGoogleJwks, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return verifyResult;
}

// FIXME: add typing
export async function requireGoogleAuthToken<
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
    const verifyResult = await verifyGoogleJwt(token);
    assert(validPayload(verifyResult.payload), "no audience in token");
    req.user = { email: verifyResult.payload.email };
    req.token = token;
    next();
  } catch (err: any) {
    res.locals.log.error({
      message: "error validating google auth",
      err,
    });
    // FIXME: do I need to send this status?
    res.sendStatus(403);
    next(err);
  }
}

const validPayload = (u: any): u is AuthUserInfo =>
  u !== null
  && typeof u === "object"
  && typeof u.email === "string";
