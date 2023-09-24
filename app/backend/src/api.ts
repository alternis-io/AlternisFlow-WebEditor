import express from 'express';
import createError from 'http-errors'
import cors from 'cors';
import assert from "node:assert";
import path from "node:path";
import { apiV1 } from './apiV1';
import { logRequests, logErrors } from "./logRequests";

// 401
class AuthorizationError extends Error {}
// 400
class ApiMisuseError extends Error {}

const app = express()
  .use(logRequests)
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  // these are for development only, the real thing uses nginx aliases
  .use("/", express.static(path.join(__dirname, "../../../site/public")))
  .use("/app", express.static(path.join(__dirname, "../../../app/frontend/dist")))
  .get('/app/*', (_req, res) => {
    res.sendFile(path.join(__dirname, "../../../app/frontend/dist/index.html"));
  })
  .use("/api/v1", apiV1)
  .use((_req, _res, next) => {
    next(createError(404));
  })
  .use(logErrors)
  .use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      code: err.code,
    });
  })
;

// the app is an SPA, redirect all requests to index.html

if (process.env.NODE_ENV === "development") {
  app.use(cors({
    origin: "http://localhost:3001",
  }));
}

export interface RunOpts {
  port?: number;
}

export async function run(opts: RunOpts = {}) {
  assert(!process.env.PORT || !Number.isNaN(process.env.PORT), `PORT in env '${process.env.PORT}' not a number`);
  const port = opts.port ?? Number(process.env.PORT);
  assert(port, "No port was set, either set PORT in the environment or pass one explicitly through the API");

  await new Promise<void>((resolve) => app.listen(port, resolve));

  console.log(`Service listening on port ${port}`);
}
