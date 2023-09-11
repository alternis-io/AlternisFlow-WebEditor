// FIXME: rename file to api.ts

import * as express from 'express';
import { connect } from "./db";
import * as assert from "node:assert";

const app = express()
  .use(express.json())

export interface RunOpts {
  port?: number;
}

export async function run(opts: RunOpts = {}) {
  const conn = await connect();

  app.get('/', (req, res) => {
    conn.get("SELECT * FROM users").then(data => {
      res.json(data);
      res.end();
    });
  })

  app.post('/', (req, res) => {
    conn.exec("INSERT INTO users VALUES ('blah')").then(() => {
      res.end();
    });
  })

  app.post('/documents', async (req, res) => {
    assert(req.body.name, "must have a name");
    const result = await conn.run("INSERT INTO documents(name, json_contents) VALUES (?, ?);", [req.body.name, req.body.contents ?? "{}"]);
    res.json({ id: result.lastID });
    res.end();
  });

  app.get<{ docId: string }>('/documents/:docId', async (req, res) => {
    const result = await conn.get("SELECT * FROM documents WHERE id = ? LIMIT 1", [req.params.docId]);
    // FIXME: handle/(test!) undefined
    res.json(result);
    res.end();
  });


  assert(!process.env.PORT || !Number.isNaN(process.env.PORT), `PORT in env '${process.env.PORT}' not a number`);
  const port = opts.port ?? Number(process.env.PORT);
  assert(port, "No port was set, either set PORT in the environment or pass one explicitly through the API");

  await new Promise<void>((resolve) => app.listen(port, resolve));

  console.log(`Service listening on port ${port}`);
}

if (module === require.main)
  void run();
