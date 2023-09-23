// FIXME: use bun for better promise support
import * as express from 'express';
import * as cors from 'cors';
import * as assert from "node:assert";
import * as path from "node:path";
import { apiV1 } from './apiV1';

// 401
class AuthorizationError extends Error {}
// 400
class ApiMisuseError extends Error {}

const app = express()
  // FIXME: resolve resource url better, maybe an env var?
  .use("/", express.static(path.join(__dirname, "../../../site/public")))
  .use("/app", express.static(path.join(__dirname, "../../../app/frontend/dist")))
  .use(express.json())
  .use(cors({
    origin: "http://localhost:3001",
  }))
  .use("/api/v1", apiV1);

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

if (module === require.main)
  void run();
