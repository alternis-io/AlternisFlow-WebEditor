import express from 'express';
import { expressFixAsyncify } from "../util";
import { PrismaClient, Document, User, WithId, DocumentList, WithToken } from '../prisma';
import createHttpError from 'http-errors';
import assert from 'assert';
import { log } from "../logRequests";

const prisma = new PrismaClient();

export const apiV1Github: express.Router = express.Router();

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

interface GithubTokenResp {
  access_token: string;
}

const isGithubTokenResp = (x: any): x is GithubTokenResp =>
  typeof x === "object" && x !== null && typeof x.access_token === "string";

apiV1Github.get<{}, {}, {}, { code: string }>(
  '/users/me/login/github/callback',
  expressFixAsyncify(async function login(req, res) {
    // FIXME: add type checking step
    if (!req.query.code) throw createHttpError(400, "code query param missing");

    const form = new FormData();
    form.append("client_id", process.env.GITHUB_CLIENT_ID);
    form.append("client_secret", process.env.GITHUB_CLIENT_SECRET);
    form.append("code", req.query.code);

    const accessTokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: form,
    });

    const accessTokenText = await accessTokenResp
      .text()

    const accessTokenJson = await Promise.resolve(accessTokenText)
      .then(t => JSON.parse(t))
      .catch((err) => { console.error(accessTokenText); throw err; });

    if (!accessTokenResp.ok) {
      logAndThrowOnRespErr("github not ok with code", accessTokenJson);
    }

    assert(isGithubTokenResp(accessTokenJson), "github returned access token was not a string!");

    const userDataResp = await fetch("https://api.github.com/user", {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessTokenJson.access_token}`
      },
    });

    const userDataText = await userDataResp
      .text()

    const userDataJson = await Promise.resolve(userDataText)
      .then(t => JSON.parse(t))
      .catch((err) => { console.error(userDataText); throw err; });

    if (!userDataResp.ok) {
      logAndThrowOnRespErr("failed to get user info from github", userDataJson);
    }

    // NEXT: store this auth token to the db
    //
    const loginPathName = "/app/login"

    if (process.env.NODE_ENV === "development")
      res.redirect(`http://localhost:3001${loginPathName}`);
    else 
      res.redirect(loginPathName);

    res.end();
  })
);
