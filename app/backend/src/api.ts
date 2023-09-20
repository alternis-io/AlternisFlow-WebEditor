// FIXME: rename file to api.ts

import * as express from 'express';
import * as cors from 'cors';
import * as assert from "node:assert";
import * as crypto from "node:crypto";
import { PrismaClient, Document, User, WithId, WithToken, DocumentList } from './prisma';

const prisma = new PrismaClient();

// 401
class AuthorizationError extends Error {}
// 400
class ApiMisuseError extends Error {}

const app = express()
  .use(express.json())
  .use(cors({
    origin: "http://localhost:3001",
  }));

export interface RunOpts {
  port?: number;
}

// handle promises in express@<5
function expressFixAsyncify<Req, Res>(
  cb: (
    req: Req,
    res: Res,
  ) => Promise<void>
) {
  return (
    req: Req,
    res: Res,
    next: express.NextFunction
  ) => cb(req, res).catch(next);
}

export async function run(opts: RunOpts = {}) {
  app.get<{}, User | null, WithToken>(
    '/users/me',
    expressFixAsyncify(async function getMyUser(req, res) {
      assert(req.headers.authorization, "can't create a document if not logged in");
      const me = await prisma.user.findUniqueOrThrow({
        where: {
          token: req.headers.authorization.slice("Mike ".length),
        },
      });
      res.json(me);
      res.end();
    })
  );

  app.post<{}, WithId & WithToken, User>(
    '/users/me',
    async function register(req, res) {
      // FIXME: horrible temp token gen
      // FIXME: use a blob
      const base64Token = crypto.randomBytes(32).toString("base64");
      const me = await prisma.user.create({
        data: {
          ...req.body,
          token: base64Token,
        },
      });
      assert(me.token !== null);
      res.json(me as User & WithToken);
      res.end();
    }
  );

  app.post<{}, Partial<Document>, Partial<Document> & WithToken>(
    '/users/me/documents',
    expressFixAsyncify(async function createDocument(req, res) {
      // FIXME: 400
      assert(req.body.name, "must have a name");
      // FIXME: 401
      assert(req.headers.authorization, "missing authorization");

      const doc = await prisma.document.create({
        data: {
          name: req.body.name,
          jsonContents: req.body.jsonContents ?? "{}",
          owner: {
            connect: {
              token: req.headers.authorization.slice("Mike ".length),
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      res.json(doc);
      res.end();
    })
  );

  app.get<{}, DocumentList, WithToken>(
    '/users/me/documents',
    async function getMyDocumentList(req, res) {
      // FIXME: 401
      assert(req.headers.authorization, "missing authorization");

      const docs = await prisma.document.findMany({
        select: {
          id: true,
          name: true,
          ownerId: true,
          updatedAt: true,
        },
        where: {
          owner: {
            token: req.headers.authorization.slice("Mike ".length),
          },
        },
        // FIXME: do proper paging, this is just for safety
        take: 1000,
      });

      res.json(docs);
      res.end();
    }
  );

  app.get<{}, DocumentList, WithToken>(
    '/users/me/documents/recent',
    async function getMyRecentDocumentList(req, res) {
      // FIXME: 401
      assert(req.headers.authorization, "missing authorization");

      const docs = await prisma.document.findMany({
        select: {
          id: true,
          name: true,
          ownerId: true,
          updatedAt: true,
        },
        where: {
          owner: {
            token: req.headers.authorization.slice("Mike ".length),
          },
        },
        take: 50,
        orderBy: {
          updatedAt: "desc",
        },
      });

      res.json(docs);
      res.end();
    }
  );

  app.get<WithId, Document>(
    '/users/me/documents/:id',
    async function getMyDocument(req, res){
      // FIXME: 401
      assert(req.headers.authorization, "missing authorization");

      // FIXME: bad route if failed
      const id = Number(req.params.id);

      const doc = await prisma.document.findUniqueOrThrow({
        where: {
          id,
          // FIXME: no idea if this works
          owner: {
            token: req.headers.authorization.slice("Mike ".length),
          },
        },
      });

      res.json(doc);
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
