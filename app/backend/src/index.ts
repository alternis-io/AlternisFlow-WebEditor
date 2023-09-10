import * as express from 'express';
import { connect } from "./db";
import * as assert from "node:assert";

const app = express()

export interface RunOpts {
  port?: number;
}

export async function run(opts: RunOpts = {}) {
  const conn = await connect();

  app.get('/', (req, res) => {
    conn.get("SELECT * FROM users").then(data => {
      res.send(JSON.stringify(data));
      res.end();
    });
  })

  app.post('/', (req, res) => {
    conn.exec("INSERT INTO users VALUES ('blah')").then(() => {
      res.end();
    });
  })

  const port = opts.port ?? Number(process.env.PORT);
  assert(process.env.PORT && !Number.isNaN(port), `PORT in env '${process.env.PORT}' not a number`);
  assert(port, "No port was set")

  app.listen(port, () => {
    console.log(`Service listening on port ${port}`)
  });
}

if (module === require.main)
  void run();
