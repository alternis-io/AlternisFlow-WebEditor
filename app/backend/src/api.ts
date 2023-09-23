import * as express from 'express';
import * as cors from 'cors';
import * as assert from "node:assert";
import { apiV1 } from './apiV1';

// 401
class AuthorizationError extends Error {}
// 400
class ApiMisuseError extends Error {}

const app = express()
  // FIXME: the api should all be under the api route...
  // FIXME: use bun?
  .use("/", express.static("../../../site/public"))
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
