// FIXME: rename file to api.ts

import * as express from 'express';
import * as cors from 'cors';
import { connect } from "./db";
import * as assert from "node:assert";
import { Authed, Document, DocumentList, DocumentPost, IdRequest, User } from "../../common/api/types" ;

const app = express()
  .use(express.json())
  .use(cors({
    origin: "http://localhost:3001",
  }));

export interface RunOpts {
  port?: number;
}

export async function run(opts: RunOpts = {}) {
  const conn = await connect();

  app.get<{}, User, Authed>(
    '/users/me',
    function getMyUser(req, res) {
      assert(req.body.loginCredential);
      conn.get(`
        SELECT *
        FROM users
        WHERE login_credential=?
        LIMIT 1
      `, [
        req.body.loginCredential,
      ]).then(data => {
        res.json(data);
        res.end();
      });
    }
  );

  app.post<{}, IdRequest, User>(
    '/users/me',
    function register(_req, res) {
      conn.exec(`
        INSERT INTO users
        VALUES('blah')
      `).then(() => {
        res.end();
      });
    }
  );

  app.post<{}, IdRequest, DocumentPost>(
    '/users/me/documents',
    async function createDocument(req, res) {
      assert(req.body.name, "must have a name");
      const result = await conn.run(
        `
        INSERT INTO documents(name, json_contents)
        VALUES (?, ?)
        `,
        [
          req.body.name,
          req.body.jsonContents ?? "{}",
        ]
      );
      assert(result.lastID);
      res.json({ id: result.lastID });
      res.end();
    }
  );

  app.get<IdRequest, DocumentList>(
    '/users/me/documents',
    async function getMyDocumentList(req, res) {
      const result = await conn.all(`
        SELECT id, name
        FROM documents
      `, [req.params.id]);
      // FIXME: handle/(test!) undefined
      res.json(result);
      res.end();
    }
  );

  app.get<IdRequest, Document>(
    '/users/me/documents/:id',
    async function getMyDocument(req, res){
      const result = await conn.get(`
        SELECT *
        FROM documents
        WHERE id = ?
        LIMIT 1
      `, [req.params.id]);
      // FIXME: handle/(test!) undefined
      res.json({
        id: result.id,
        name: result.name,
        jsonContents: result.json_contents,
      });
      res.end();
    }
  );

  assert(!process.env.PORT || !Number.isNaN(process.env.PORT), `PORT in env '${process.env.PORT}' not a number`);
  const port = opts.port ?? Number(process.env.PORT);
  assert(port, "No port was set, either set PORT in the environment or pass one explicitly through the API");

  await new Promise<void>((resolve) => app.listen(port, resolve));

  console.log(`Service listening on port ${port}`);
}

if (module === require.main)
  void run();
