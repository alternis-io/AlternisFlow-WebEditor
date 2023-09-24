import express from 'express';
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
  // these are for development only, the real thing uses nginx aliases
  .use("/", express.static(path.join(__dirname, "../../../site/public")))
  .use("/app", express.static(path.join(__dirname, "../../../app/frontend/dist")))
  .use(express.json())
  .use("/api/v1", apiV1)
  .use(logErrors);

app.get('/app/*', (_req, res) => {
  res.sendFile(path.join(__dirname, "../../../app/frontend/dist/index.html"))
});

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
